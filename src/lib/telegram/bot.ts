/**
 * Telegram Bot for Screenshot-to-Request Workflow
 *
 * Admin uploads a screenshot of a Facebook conversation to the admin Telegram group.
 * Bot uses Claude Vision to analyze the screenshot and extract:
 * - Customer name (Facebook profile name)
 * - Product they're requesting
 * - Size/variant
 * - Any notes
 *
 * Then matches the customer and creates a request in the CRM.
 */

import { Telegraf, Context } from 'telegraf';
import { Message, Update } from 'telegraf/types';
import Anthropic from '@anthropic-ai/sdk';
import {
  matchCustomerByFBName,
  linkCustomerToFacebook
} from '../customers/matchCustomer';
import { findMatchingRelease } from '../releases/matchRelease';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadBufferToFolder } from '@/lib/s3';
import { createLogger } from '@/lib/logger';
import { lookupProduct } from '@/lib/ai/productLookup';
import { analyzeImage, extractParkContext, type VisionAnalysisResult } from '@/lib/ai/googleVision';
import { searchGoogleLens, findDisneyMatch, extractProductName } from '@/lib/ai/googleLens';
import { analyzeScreenshot } from '@/lib/ai/detectImageType';
import { cropImageRegion } from '@/lib/images/cropImage';

const log = createLogger('TelegramBot');

// Item extracted from screenshot
interface ScreenshotItem {
  productName: string;
  size?: string;
  category?: string;
  park?: 'disney' | 'universal' | 'seaworld';
  suggestedStore?: {
    store_name: string;
    land?: string;
  };
  imageIndex?: number;
}

// Analysis result with multiple items
interface ScreenshotAnalysis {
  isValidRequest: boolean;
  customerName: string;
  items: ScreenshotItem[];
  notes?: string;
  urgency?: 'normal' | 'urgent' | 'asap';
}

// Matched release info
interface MatchedRelease {
  id: string;
  title: string;
  price_estimate: number | null;
  ai_demand_score: number | null;
  is_limited_edition: boolean;
  confidence: number;
}

// Media group buffer for collecting multiple photos
interface MediaGroupBuffer {
  photos: Array<{ fileId: string }>;
  chatId: number;
  fromId: number;
  caption?: string;
  timestamp: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

const mediaGroupBuffers = new Map<string, MediaGroupBuffer>();

// Conversation state for multi-step flows
interface ConversationState {
  step: string;
  data: {
    analysis?: ScreenshotAnalysis;
    customer?: {
      id: string;
      name: string;
      email: string | null;
      facebook_name: string | null;
    };
    images?: Array<{ base64: string }>;
    suggestions?: Array<{
      id: string;
      name: string;
      email: string | null;
      facebook_name: string | null;
      matchType: string;
    }>;
    customerName?: string;
    matchedReleases?: Map<number, MatchedRelease>;
  };
}

const conversationState = new Map<number, ConversationState>();

/**
 * Fetch store locations from database for AI context
 */
async function getStoreLocations(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('park_stores')
    .select('park, land, store_name, notes')
    .eq('is_active', true)
    .order('park')
    .order('land');

  if (!data || data.length === 0) return '';

  // Format as concise list for AI prompt
  return data.map(s =>
    `- ${s.store_name} (${s.park}${s.land ? ` - ${s.land}` : ''})${s.notes ? `: ${s.notes}` : ''}`
  ).join('\n');
}

/**
 * Analyze multiple screenshots using Claude Vision with Google Vision context
 */
async function analyzeScreenshots(
  images: Array<{ base64: string }>,
  caption?: string
): Promise<ScreenshotAnalysis> {
  const anthropic = new Anthropic();
  const storeList = await getStoreLocations();

  try {
    // Run Google Vision on first image for product identification context
    let visionContext = '';
    let visionResult: VisionAnalysisResult | null = null;

    try {
      visionResult = await analyzeImage(images[0].base64);
      const parkContext = extractParkContext(visionResult);

      if (visionResult.webEntities.length > 0 || visionResult.matchingPages.length > 0) {
        log.info('Google Vision analysis', {
          webEntities: visionResult.webEntities.slice(0, 5).map(e => e.description),
          matchingPages: visionResult.matchingPages.length,
          labels: visionResult.labels.slice(0, 5).map(l => l.description),
          detectedPark: parkContext.park,
          productType: parkContext.productType
        });

        // Build context for Claude
        const webEntitiesText = visionResult.webEntities
          .slice(0, 8)
          .map(e => e.description)
          .filter(Boolean)
          .join(', ');

        const matchingPageTitles = visionResult.matchingPages
          .slice(0, 3)
          .map(p => p.pageTitle)
          .filter(Boolean)
          .join('; ');

        visionContext = `
GOOGLE VISION PRODUCT IDENTIFICATION:
- Web entities detected: ${webEntitiesText || 'none'}
- Matching product pages: ${matchingPageTitles || 'none'}
- Product type detected: ${parkContext.productType || 'unknown'}
- Park detected: ${parkContext.park || 'unknown'}
- Characters: ${parkContext.characters.join(', ') || 'none'}

USE THIS INFORMATION to identify the correct product name.`;
      }
    } catch (visionError) {
      log.warn('Google Vision failed, continuing with Claude only', visionError);
    }

    // Build content array with all images
    const content: Array<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> = [];

    for (let i = 0; i < images.length; i++) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: images[i].base64
        }
      });
    }

    content.push({
      type: 'text',
      text: `Analyze ${images.length === 1 ? 'this image' : `these ${images.length} images`}.
${caption ? `\nCustomer message: "${caption}"` : ''}
${visionContext}

CRITICAL RULES FOR PRODUCT IDENTIFICATION:
1. A SINGLE PRODUCT = 1 ITEM, regardless of components
   - Charm bracelet with 5 charms = 1 item (the bracelet)
   - Necklace with pendant = 1 item (the necklace)
   - Spirit jersey = 1 item (not sleeves + body + collar)
   - Ears with bow = 1 item (the ears)

2. Use the COMPLETE product name from packaging, tags, or Google Vision results
   - "Disney Parks Cinderella Castle Charm Bracelet" NOT "castle charm, carriage charm, slipper charm"
   - "Mickey Mouse Loungefly Mini Backpack" NOT "backpack with ears"

3. ONLY list multiple items if customer explicitly requests separate products
   - "I want the bracelet and the matching earrings" = 2 items
   - "I want this bracelet" (shows bracelet with charms) = 1 item

First, determine: Is this a CUSTOMER CONVERSATION (Facebook message) or a PRODUCT PHOTO?

If CUSTOMER CONVERSATION:
- Extract the customer's Facebook name
- Extract what complete products they're asking for

If PRODUCT PHOTO (no customer conversation visible):
- Set isValidRequest to false (will trigger product lookup instead)

For each item:
- productName: Full product name (e.g., "Mickey Mouse Spirit Jersey" not just "spirit jersey")
- size: Size if mentioned (S, M, L, XL, etc.) or null
- category: loungefly, ears, spirit_jersey, popcorn_bucket, pins, plush, apparel, drinkware, collectible, home_decor, toys, jewelry, other
- park: disney, universal, or seaworld
- suggestedStore: Best store from list below
- imageIndex: Which image (0-based)

Available stores:
${storeList}

Return ONLY valid JSON:
{
  "isValidRequest": true,
  "customerName": "Customer's Facebook Name",
  "items": [
    {
      "productName": "Complete Product Name",
      "size": "M" or null,
      "category": "jewelry",
      "park": "disney",
      "suggestedStore": { "store_name": "Store Name", "land": "Land Name" },
      "imageIndex": 0
    }
  ],
  "notes": "Any special notes" or null,
  "urgency": "normal"
}`
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Ensure items is an array
      if (!parsed.items) {
        // Convert old format to new format
        parsed.items = [{
          productName: parsed.productName || 'Unknown Item',
          size: parsed.size,
          category: parsed.category,
          park: parsed.park,
          suggestedStore: parsed.suggestedStores?.[0],
          imageIndex: 0
        }];
      }

      return parsed as ScreenshotAnalysis;
    }

    return { isValidRequest: false, customerName: '', items: [] };
  } catch (error) {
    log.error('Error analyzing screenshots', error);
    return { isValidRequest: false, customerName: '', items: [] };
  }
}

/**
 * Create a request from the conversation state
 */
async function createRequestFromState(
  ctx: Context,
  data: ConversationState['data'] & { isNewCustomer?: boolean }
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { analysis, customer, images, matchedReleases, isNewCustomer } = data;

  if (!analysis || !customer) {
    await ctx.reply('Missing data to create request.');
    return;
  }

  try {
    // Upload all images to S3
    const imageUrls: string[] = [];
    log.info('createRequestFromState called', {
      imageCount: images?.length || 0,
      itemCount: analysis.items.length
    });

    if (images && images.length > 0) {
      for (const img of images) {
        try {
          const buffer = Buffer.from(img.base64, 'base64');
          const url = await uploadBufferToFolder(buffer, 'reference-images', 'image/jpeg');
          imageUrls.push(url);
          log.info('Image uploaded to S3', { url });
        } catch (error) {
          log.error('Failed to upload image to S3', error);
        }
      }
    }

    // Create request
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .insert({
        customer_id: customer.id,
        status: 'pending',
        source: 'telegram',
        telegram_message_id: ctx.message?.message_id?.toString() || null,
        notes: analysis.notes || null
      })
      .select('id')
      .single();

    if (requestError || !request) {
      throw new Error(`Failed to create request: ${requestError?.message}`);
    }

    // Create multiple request items
    log.info('Creating request items', {
      requestId: request.id,
      itemCount: analysis.items.length,
      imageUrls
    });

    for (let i = 0; i < analysis.items.length; i++) {
      const item = analysis.items[i];
      const imageIndex = item.imageIndex ?? i;
      const itemImageUrl = imageUrls[imageIndex] || imageUrls[0] || null;
      const matchedRelease = matchedReleases?.get(i);

      // Use matched release details if available, otherwise fall back to extracted info
      const itemName = matchedRelease?.title || item.productName;
      const extractedName = item.productName;

      // Build notes: include size and original request if name was upgraded from match
      const notesParts: string[] = [];
      if (item.size) notesParts.push(`Size: ${item.size}`);
      if (matchedRelease?.title && extractedName !== matchedRelease.title) {
        notesParts.push(`Customer asked for: ${extractedName}`);
      }
      const notes = notesParts.length > 0 ? notesParts.join(' | ') : null;

      const itemData: Record<string, unknown> = {
        request_id: request.id,
        name: itemName,  // Use matched release name if available
        category: item.category || 'other',
        park: item.park || 'disney',
        quantity: 1,
        notes,
        reference_images: itemImageUrl ? [itemImageUrl] : [],
        store_name: item.suggestedStore?.store_name || null,
        land_name: item.suggestedStore?.land || null,
        estimated_price: matchedRelease?.price_estimate || null
      };

      // Try to include matched_release_id
      if (matchedRelease?.id) {
        itemData.matched_release_id = matchedRelease.id;
        log.info('Using matched release for item', {
          extractedName,
          matchedName: matchedRelease.title,
          price: matchedRelease.price_estimate
        });
      }

      let { error: itemError } = await supabase
        .from('request_items')
        .insert(itemData);

      // Retry without matched_release_id if column doesn't exist
      if (itemError && itemError.message.includes('matched_release_id')) {
        log.warn('matched_release_id column not found, retrying without it');
        delete itemData.matched_release_id;
        const retry = await supabase.from('request_items').insert(itemData);
        itemError = retry.error;
      }

      if (itemError) {
        log.error('Failed to create request item',
          new Error(itemError.message || JSON.stringify(itemError)),
          { item: item.productName, code: itemError.code, details: itemError.details }
        );
      }
    }

    // Link customer to FB name if not already linked
    if (analysis.customerName && !customer.facebook_name) {
      await linkCustomerToFacebook(customer.id, analysis.customerName);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://enchantedparkpickups.com';

    // Build items list for display
    const itemsList = analysis.items.map((item, i) => {
      let line = `  ${i + 1}. ${item.productName}`;
      if (item.size) line += ` (${item.size})`;
      if (item.suggestedStore) line += `\n      📍 ${item.suggestedStore.store_name}`;
      const matched = matchedReleases?.get(i);
      if (matched) {
        line += `\n      🔗 ${matched.title}`;
        if (matched.price_estimate) line += ` - $${matched.price_estimate}`;
      }
      return line;
    }).join('\n');

    // Build success message
    const customerLabel = isNewCustomer
      ? `👤 Customer: ${customer.name} (new customer)`
      : `👤 Customer: ${customer.name}`;

    let successMessage = `✅ Request created with ${analysis.items.length} item(s)!\n\n` +
      `${customerLabel}\n` +
      `📦 Items:\n${itemsList}\n\n` +
      `🔗 View: ${baseUrl}/admin/requests/${request.id}`;

    if (isNewCustomer) {
      successMessage += `\n\n💡 Tip: Add email/phone in customer profile later`;
    }

    await ctx.reply(successMessage, { parse_mode: 'HTML' });

    log.info('Request created from Telegram', {
      requestId: request.id,
      customerId: customer.id,
      itemCount: analysis.items.length
    });

  } catch (error) {
    log.error('Error creating request', error);
    await ctx.reply('Failed to create request. Please try again or create manually in CRM.');
  }
}

/**
 * Create and configure the Telegram bot
 */
export function createTelegramBot(): Telegraf {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }

  const bot = new Telegraf(token);
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  // Only process messages from admin chat
  bot.use(async (ctx, next) => {
    if (adminChatId && ctx.chat?.id.toString() !== adminChatId) {
      log.warn('Message from unauthorized chat', { chatId: ctx.chat?.id });
      return;
    }
    return next();
  });

  /**
   * Process images after collection (single or media group)
   */
  async function processImages(
    ctx: Context,
    images: Array<{ base64: string }>,
    caption?: string
  ): Promise<void> {
    try {
      // Analyze all images together
      const analysis = await analyzeScreenshots(images, caption);

      if (!analysis.isValidRequest || analysis.items.length === 0) {
        // Not a FB screenshot - try product lookup instead
        await ctx.reply('Not a customer message. Running product identification...');

        try {
          // Upload image to S3 first so SerpApi can access it via public URL
          const imageBuffer = Buffer.from(images[0].base64, 'base64');
          log.info('Uploading image to S3 for product lookup...');
          const s3Url = await uploadBufferToFolder(imageBuffer, 'temp-lookup', 'image/jpeg');
          log.info('Image uploaded to S3', { s3Url });

          // Run product lookup with both base64 (for Claude) and URL (for SerpApi)
          const imageBase64 = `data:image/jpeg;base64,${images[0].base64}`;
          log.info('Starting product lookup with SerpApi...');
          const result = await lookupProduct(imageBase64, s3Url);

          log.info('Product lookup complete', {
            found: !!result.product,
            sourceType: result.product?.sourceType,
            confidence: result.confidence,
            lensMatch: result.lensMatch ? {
              title: result.lensMatch.title,
              source: result.lensMatch.source
            } : null
          });

          if (result.product) {
            const lines = [`🔍 Product Identified:`, `Name: ${result.product.name}`];
            if (result.product.price) lines.push(`Price: $${result.product.price}`);
            if (result.product.park) lines.push(`Park: ${result.product.park}`);
            if (result.product.store) lines.push(`Store: ${result.product.store}`);
            if (result.product.land) lines.push(`Land: ${result.product.land}`);
            lines.push(`Confidence: ${result.confidence}%`);
            lines.push(`Source: ${result.product.sourceType.replace(/_/g, ' ')}`);

            if (result.product.characters.length > 0) {
              lines.push(`Characters: ${result.product.characters.join(', ')}`);
            }

            // Show source URL if from Google Lens
            if (result.product.sourceType === 'google_lens' && result.product.sourceUrl) {
              lines.push(`\nFound on: ${result.product.sourceUrl}`);
            }

            await ctx.reply(lines.join('\n'));
          } else {
            await ctx.reply(
              'Could not identify this product.\n' +
              'Try uploading a clearer photo or a customer screenshot.'
            );
          }
        } catch (lookupError) {
          log.error('Product lookup failed', lookupError);
          await ctx.reply(
            'Could not identify a product request in this image.\n' +
            'Please upload a screenshot of a customer requesting an item.'
          );
        }
        return;
      }

      log.info('Analysis complete', {
        customerName: analysis.customerName,
        itemCount: analysis.items.length,
        imageCount: images.length
      });

      // Detect product regions in the screenshot and run Google Lens on each
      const matchedReleases = new Map<number, MatchedRelease>();

      // Step 1: Analyze the screenshot to find embedded product images
      log.info('Detecting product regions in screenshot...');
      const imageAnalysis = await analyzeScreenshot(images[0].base64);
      log.info('Screenshot analysis', {
        type: imageAnalysis.type,
        hasEmbeddedImages: imageAnalysis.hasEmbeddedImages,
        productRegions: imageAnalysis.productRegions.length
      });

      // Map to store Lens results for each item by matching to regions
      const lensResultsByItem = new Map<number, { name: string; price: number | null; source: string }>();

      // Step 2: If we found product regions, crop and search each one
      if (imageAnalysis.productRegions.length > 0) {
        const imageBuffer = Buffer.from(images[0].base64, 'base64');

        for (let regionIdx = 0; regionIdx < imageAnalysis.productRegions.length; regionIdx++) {
          const region = imageAnalysis.productRegions[regionIdx];

          if (!region.isProduct) continue;

          log.info('Processing product region', {
            regionIndex: regionIdx,
            description: region.description,
            boundingBox: region.boundingBox
          });

          try {
            // Crop the product image from the screenshot
            const croppedBuffer = await cropImageRegion(imageBuffer, region.boundingBox);

            // Upload cropped image to S3 for Google Lens
            const croppedS3Url = await uploadBufferToFolder(croppedBuffer, 'temp-lookup', 'image/jpeg');
            log.info('Uploaded cropped product image', { regionIndex: regionIdx, url: croppedS3Url });

            // Run Google Lens on the cropped product image
            const lensResult = await searchGoogleLens(croppedS3Url);

            if (lensResult.success && lensResult.visualMatches.length > 0) {
              const match = findDisneyMatch(lensResult.visualMatches);
              if (match) {
                const lensName = extractProductName(match);
                log.info('Google Lens found product from cropped region', {
                  regionIndex: regionIdx,
                  regionDescription: region.description,
                  lensName,
                  source: match.source,
                  price: match.price?.value
                });

                // Store result - will match to item by index or description
                lensResultsByItem.set(regionIdx, {
                  name: lensName,
                  price: match.price?.extracted_value || null,
                  source: match.source
                });
              }
            } else {
              log.info('No Lens matches for cropped region', {
                regionIndex: regionIdx,
                error: lensResult.error
              });
            }
          } catch (error) {
            log.error('Error processing product region', { regionIndex: regionIdx, error });
          }
        }
      } else {
        // No regions detected - fall back to uploading whole image (less accurate)
        log.info('No product regions detected, skipping Lens (would search whole screenshot)');
      }

      // Step 3: Match items to Lens results and local database
      for (let i = 0; i < analysis.items.length; i++) {
        const item = analysis.items[i];
        let productName = item.productName; // Start with Claude's extraction
        let lensPrice: number | null = null;
        let lensSource: string | null = null;

        // Try to get Lens result for this item
        // Match by index (assuming items and regions are in same order)
        const lensResult = lensResultsByItem.get(i);
        if (lensResult) {
          log.info('Using Lens result for item', {
            itemIndex: i,
            claudeName: item.productName,
            lensName: lensResult.name
          });
          productName = lensResult.name;
          lensPrice = lensResult.price;
          lensSource = lensResult.source;
        }

        // Now try to match against local database with the (potentially corrected) name
        try {
          const releaseMatch = await findMatchingRelease(productName, item.category);
          if (releaseMatch.found && releaseMatch.release) {
            matchedReleases.set(i, {
              id: releaseMatch.release.id,
              title: releaseMatch.release.title,
              price_estimate: lensPrice || releaseMatch.release.price_estimate,
              ai_demand_score: releaseMatch.release.ai_demand_score,
              is_limited_edition: releaseMatch.release.is_limited_edition,
              confidence: releaseMatch.confidence
            });
          } else if (lensSource) {
            // No local match but Lens found it - create a pseudo-match
            matchedReleases.set(i, {
              id: '',
              title: productName,  // Use Lens name
              price_estimate: lensPrice,
              ai_demand_score: null,
              is_limited_edition: false,
              confidence: 90  // High confidence from Lens
            });
            log.info('Using Google Lens result (no local match)', { productName, lensPrice });
          }
        } catch (error) {
          log.error('Error matching release', { item: productName, error });
        }

        // Update the item name with the Lens-corrected name for display
        if (productName !== item.productName) {
          item.productName = productName;
        }
      }

      // Try to match customer
      const match = await matchCustomerByFBName(analysis.customerName);

      // Build items list for preview
      const itemsList = analysis.items.map((item, i) => {
        let line = `${i + 1}. ${item.productName}`;
        if (item.size) line += ` (${item.size})`;
        if (item.suggestedStore) line += `\n   📍 ${item.suggestedStore.store_name}`;
        const matched = matchedReleases.get(i);
        if (matched) {
          line += `\n   🔗 ${matched.title}`;
          if (matched.price_estimate) line += ` ($${matched.price_estimate})`;
        }
        return line;
      }).join('\n');

      if (match.found && match.customer) {
        // Customer found - confirm and create request
        conversationState.set(ctx.from!.id, {
          step: 'confirm_request',
          data: {
            analysis,
            customer: match.customer,
            images,
            matchedReleases
          }
        });

        await ctx.reply(
          `Found customer: ${match.customer.name}\n` +
          `(matched on ${match.matchedOn})\n\n` +
          `Items (${analysis.items.length}):\n${itemsList}\n\n` +
          `${analysis.notes ? `Notes: ${analysis.notes}\n\n` : ''}` +
          `Create this request?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Yes, create request', callback_data: 'create_request' }],
                [{ text: 'Different customer', callback_data: 'change_customer' }],
                [{ text: 'Cancel', callback_data: 'cancel' }]
              ]
            }
          }
        );
      } else {
        // Customer not found
        conversationState.set(ctx.from!.id, {
          step: 'customer_not_found',
          data: {
            analysis,
            images,
            suggestions: match.suggestions,
            matchedReleases
          }
        });

        let message = `Customer "${analysis.customerName}" not found.\n\n`;
        message += `Items (${analysis.items.length}):\n${itemsList}\n\n`;

        if (match.suggestions && match.suggestions.length > 0) {
          message += `Similar customers:\n`;
          match.suggestions.forEach((s, i) => {
            message += `${i + 1}. ${s.name}${s.facebook_name ? ` (FB: ${s.facebook_name})` : ''}\n`;
          });
          message += `\nReply with a number to select, or:`;
        }

        await ctx.reply(message, {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Create new customer', callback_data: 'new_customer' }],
              [{ text: 'Search by name', callback_data: 'search_customer' }],
              [{ text: 'Cancel', callback_data: 'cancel' }]
            ]
          }
        });
      }
    } catch (error) {
      log.error('Error processing images', error);
      await ctx.reply('Error processing images. Please try again.');
    }
  }

  /**
   * Process a media group after collection timeout
   */
  async function processMediaGroup(groupId: string, ctx: Context): Promise<void> {
    const buffer = mediaGroupBuffers.get(groupId);
    if (!buffer || buffer.photos.length === 0) return;

    // Clear the buffer
    mediaGroupBuffers.delete(groupId);

    log.info('Processing media group', {
      groupId,
      photoCount: buffer.photos.length,
      caption: buffer.caption
    });

    await ctx.reply(`Analyzing ${buffer.photos.length} images...`);

    // Download all photos
    const images: Array<{ base64: string }> = [];
    for (const photo of buffer.photos) {
      try {
        const file = await ctx.telegram.getFile(photo.fileId);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        images.push({ base64: Buffer.from(arrayBuffer).toString('base64') });
      } catch (error) {
        log.error('Failed to download photo', { fileId: photo.fileId, error });
      }
    }

    if (images.length === 0) {
      await ctx.reply('Failed to download images. Please try again.');
      return;
    }

    await processImages(ctx, images, buffer.caption);
  }

  // Handle photo uploads
  bot.on('photo', async (ctx) => {
    try {
      const message = ctx.message as Message.PhotoMessage;
      const mediaGroupId = (message as unknown as { media_group_id?: string }).media_group_id;

      if (mediaGroupId) {
        // Part of a media group - buffer it
        const existing = mediaGroupBuffers.get(mediaGroupId);

        if (existing) {
          // Clear existing timeout
          if (existing.timeoutId) {
            clearTimeout(existing.timeoutId);
          }
          // Add photo to existing buffer
          const photo = message.photo[message.photo.length - 1];
          existing.photos.push({ fileId: photo.file_id });
          if (message.caption && !existing.caption) {
            existing.caption = message.caption;
          }
        } else {
          // Create new buffer
          const photo = message.photo[message.photo.length - 1];
          mediaGroupBuffers.set(mediaGroupId, {
            photos: [{ fileId: photo.file_id }],
            chatId: ctx.chat!.id,
            fromId: ctx.from!.id,
            caption: message.caption,
            timestamp: Date.now()
          });
        }

        // Set timeout to process after 1.5 seconds
        const buffer = mediaGroupBuffers.get(mediaGroupId)!;
        buffer.timeoutId = setTimeout(() => {
          processMediaGroup(mediaGroupId, ctx);
        }, 1500);

        return;
      }

      // Single photo - process immediately
      await ctx.reply('Analyzing screenshot...');

      const photo = message.photo[message.photo.length - 1];
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      await processImages(ctx, [{ base64 }], message.caption);

    } catch (error) {
      log.error('Error processing photo', error);
      await ctx.reply('Error processing image. Please try again.');
    }
  });

  // Handle callback buttons
  bot.on('callback_query', async (ctx) => {
    const data = (ctx.callbackQuery as { data?: string }).data;
    const state = conversationState.get(ctx.from.id);

    if (!data) {
      await ctx.answerCbQuery();
      return;
    }

    if (data === 'create_request' && state?.data) {
      await createRequestFromState(ctx, state.data);
      conversationState.delete(ctx.from.id);
    }

    if (data === 'new_customer' && state?.data?.analysis) {
      // Create customer immediately with just the name (no email prompt)
      const customerName = state.data.analysis.customerName;
      const supabase = getSupabaseAdmin();

      try {
        // Generate a placeholder email (database requires non-null email for now)
        // Format: facebook_name_timestamp@placeholder.enchantedparkpickups.com
        const timestamp = Date.now();
        const safeName = customerName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
        const placeholderEmail = `${safeName}_${timestamp}@placeholder.enchantedparkpickups.com`;

        // Create customer with placeholder email
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customerName,
            facebook_name: customerName,
            email: placeholderEmail,
          })
          .select()
          .single();

        if (customerError || !newCustomer) {
          log.error('Failed to create customer', customerError);
          await ctx.reply('Failed to create customer. Please try again.');
          conversationState.delete(ctx.from.id);
          await ctx.answerCbQuery();
          return;
        }

        // Add alias for future matching (ignore errors - not critical)
        await supabase.from('customer_aliases').insert({
          customer_id: newCustomer.id,
          alias_type: 'facebook',
          alias_value: customerName.toLowerCase().trim()
        });

        // Update state with new customer and create request
        state.data.customer = {
          id: newCustomer.id,
          name: newCustomer.name,
          email: null,
          facebook_name: customerName
        };

        // Mark as new customer for success message
        (state.data as { isNewCustomer?: boolean }).isNewCustomer = true;

        await createRequestFromState(ctx, state.data);
        conversationState.delete(ctx.from.id);
      } catch (error) {
        log.error('Error creating new customer', error);
        await ctx.reply('Failed to create customer. Please try again.');
        conversationState.delete(ctx.from.id);
      }
    }

    if (data === 'change_customer' && state?.data) {
      conversationState.set(ctx.from.id, {
        step: 'enter_customer_name',
        data: state.data
      });
      await ctx.reply('Enter the customer name to search for:');
    }

    if (data === 'search_customer') {
      conversationState.set(ctx.from.id, {
        step: 'search_customer',
        data: state?.data || {}
      });
      await ctx.reply('Enter customer name to search:');
    }

    if (data === 'cancel') {
      conversationState.delete(ctx.from.id);
      await ctx.reply('Cancelled.');
    }

    // Handle suggestion selection (callback_data like "select_1", "select_2", etc.)
    if (data.startsWith('select_') && state?.data?.suggestions) {
      const index = parseInt(data.replace('select_', '')) - 1;
      const selected = state.data.suggestions[index];

      if (selected) {
        state.data.customer = {
          id: selected.id,
          name: selected.name,
          email: selected.email,
          facebook_name: selected.facebook_name
        };

        // Link this customer to the FB name
        if (state.data.analysis?.customerName) {
          await linkCustomerToFacebook(selected.id, state.data.analysis.customerName);
        }

        await createRequestFromState(ctx, state.data);
        conversationState.delete(ctx.from.id);
      }
    }

    await ctx.answerCbQuery();
  });

  // Handle text messages (for conversation flow)
  bot.on('text', async (ctx) => {
    const state = conversationState.get(ctx.from.id);
    if (!state) return;

    const text = ctx.message.text.trim();

    // Handle suggestion number selection
    if (state.step === 'customer_not_found' && /^[1-5]$/.test(text)) {
      const index = parseInt(text) - 1;
      const suggestions = state.data.suggestions;

      if (suggestions && suggestions[index]) {
        const selected = suggestions[index];
        state.data.customer = {
          id: selected.id,
          name: selected.name,
          email: selected.email,
          facebook_name: selected.facebook_name
        };

        // Link this customer to the FB name
        if (state.data.analysis?.customerName) {
          await linkCustomerToFacebook(selected.id, state.data.analysis.customerName);
        }

        await createRequestFromState(ctx, state.data);
        conversationState.delete(ctx.from.id);
        return;
      }
    }

    // Handle customer name search
    if (state.step === 'search_customer' || state.step === 'enter_customer_name') {
      const match = await matchCustomerByFBName(text);

      if (match.found && match.customer) {
        state.data.customer = match.customer;

        await ctx.reply(
          `Found: ${match.customer.name}\n` +
          `Create request for this customer?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Yes', callback_data: 'create_request' }],
                [{ text: 'Search again', callback_data: 'search_customer' }],
                [{ text: 'Cancel', callback_data: 'cancel' }]
              ]
            }
          }
        );
      } else if (match.suggestions && match.suggestions.length > 0) {
        state.data.suggestions = match.suggestions;

        let message = `No exact match for "${text}". Similar:\n\n`;
        match.suggestions.forEach((s, i) => {
          message += `${i + 1}. ${s.name}\n`;
        });

        await ctx.reply(message, {
          reply_markup: {
            inline_keyboard: [
              ...match.suggestions.slice(0, 3).map((s, i) => ([
                { text: `${i + 1}. ${s.name}`, callback_data: `select_${i + 1}` }
              ])),
              [{ text: 'Create new', callback_data: 'new_customer' }],
              [{ text: 'Cancel', callback_data: 'cancel' }]
            ]
          }
        });
      } else {
        await ctx.reply(
          `No customers found matching "${text}".\n\n` +
          `Create a new customer with this name?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Yes, create new', callback_data: 'new_customer' }],
                [{ text: 'Search again', callback_data: 'search_customer' }],
                [{ text: 'Cancel', callback_data: 'cancel' }]
              ]
            }
          }
        );
      }
    }
  });

  // Help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `*Enchanted Park Pickups Bot*\n\n` +
      `Upload a screenshot of a Facebook conversation where a customer is requesting an item.\n\n` +
      `The bot will:\n` +
      `1. Analyze the screenshot\n` +
      `2. Extract customer name and product details\n` +
      `3. Match to existing customer or create new\n` +
      `4. Create a request in the CRM\n\n` +
      `Commands:\n` +
      `/help - Show this message\n` +
      `/status - Check bot status`,
      { parse_mode: 'Markdown' }
    );
  });

  // Status command
  bot.command('status', async (ctx) => {
    await ctx.reply('Bot is running and ready to process screenshots.');
  });

  // Error handling
  bot.catch((err, ctx) => {
    log.error('Telegram bot error', err);
  });

  return bot;
}

// Singleton bot instance
let botInstance: Telegraf | null = null;

export function getTelegramBot(): Telegraf {
  if (!botInstance) {
    botInstance = createTelegramBot();
  }
  return botInstance;
}

export { conversationState };
