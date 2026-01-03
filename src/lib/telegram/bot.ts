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
  addCustomerAlias,
  createCustomerFromFacebook,
  linkCustomerToFacebook
} from '../customers/matchCustomer';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadBufferToFolder } from '@/lib/s3';
import { createLogger } from '@/lib/logger';

const log = createLogger('TelegramBot');

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
    imageBase64?: string;
    imageUrl?: string;
    suggestions?: Array<{
      id: string;
      name: string;
      email: string | null;
      facebook_name: string | null;
      matchType: string;
    }>;
    customerName?: string;
  };
}

const conversationState = new Map<number, ConversationState>();

interface ScreenshotAnalysis {
  isValidRequest: boolean;
  customerName: string;
  productName: string;
  size?: string;
  notes?: string;
  park?: 'disney' | 'universal' | 'seaworld';
  category?: string;
  urgency?: 'normal' | 'urgent' | 'asap';
}

/**
 * Analyze a screenshot using Claude Vision
 */
async function analyzeScreenshot(base64: string): Promise<ScreenshotAnalysis> {
  const anthropic = new Anthropic();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64
            }
          },
          {
            type: 'text',
            text: `Analyze this screenshot of a Facebook message/comment/post. Extract the following information:

1. Customer name - The person requesting the item. Look for their Facebook profile name (usually shown next to their message or comment).

2. Product name - What specific item they want to buy. Be specific (e.g., "Mickey Mouse Spirit Jersey" not just "spirit jersey").

3. Size/variant - If they mention a size (S, M, L, XL, etc.) or color variant.

4. Notes - Any special requests, urgency mentions, or additional context.

5. Park - Which theme park if mentioned:
   - disney (Walt Disney World, Magic Kingdom, EPCOT, Hollywood Studios, Animal Kingdom, Disney Springs)
   - universal (Universal Studios, Islands of Adventure, CityWalk, Epic Universe)
   - seaworld (SeaWorld Orlando)

6. Category - Best fit from: loungefly, ears, spirit_jersey, popcorn_bucket, pins, plush, apparel, drinkware, collectible, home_decor, toys, jewelry, other

7. Urgency - normal, urgent, or asap based on their message tone

If this is NOT a product request (just casual chat, meme, unrelated content), set isValidRequest to false.

Return ONLY valid JSON in this exact format:
{
  "isValidRequest": true,
  "customerName": "Customer's Facebook Name",
  "productName": "Specific Product Name",
  "size": "M" or null,
  "notes": "Any special notes" or null,
  "park": "disney" or null,
  "category": "apparel" or null,
  "urgency": "normal"
}`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { isValidRequest: false, customerName: '', productName: '' };
  } catch (error) {
    log.error('Error analyzing screenshot', error);
    return { isValidRequest: false, customerName: '', productName: '' };
  }
}

/**
 * Create a request from the conversation state
 */
async function createRequestFromState(
  ctx: Context,
  data: ConversationState['data']
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { analysis, customer, imageBase64 } = data;

  if (!analysis || !customer) {
    await ctx.reply('Missing data to create request.');
    return;
  }

  try {
    // Upload screenshot to S3 reference-images folder
    let screenshotUrl: string | null = null;
    log.info('createRequestFromState called', {
      hasImageBase64: !!imageBase64,
      imageBase64Length: imageBase64?.length || 0
    });

    if (imageBase64) {
      try {
        const buffer = Buffer.from(imageBase64, 'base64');
        log.info('Uploading screenshot to S3', { bufferSize: buffer.length });
        screenshotUrl = await uploadBufferToFolder(
          buffer,
          'reference-images',
          'image/jpeg'
        );
        log.info('Screenshot uploaded to S3', { screenshotUrl });
      } catch (error) {
        log.error('Failed to upload screenshot to S3', error);
      }
    } else {
      log.warn('No imageBase64 in conversation state');
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

    // Create request item with reference_images array (not reference_image_url)
    log.info('Creating request item', {
      requestId: request.id,
      screenshotUrl,
      hasScreenshotUrl: !!screenshotUrl
    });

    const { error: itemError } = await supabase
      .from('request_items')
      .insert({
        request_id: request.id,
        name: analysis.productName,
        category: analysis.category || 'other',
        park: analysis.park || 'disney',
        quantity: 1,
        notes: analysis.size ? `Size: ${analysis.size}` : null,
        reference_images: screenshotUrl ? [screenshotUrl] : []
      });

    if (itemError) {
      log.error('Failed to create request item', itemError);
    } else {
      log.info('Request item created successfully with image', { screenshotUrl });
    }

    // Link customer to FB name if not already linked
    if (analysis.customerName && !customer.facebook_name) {
      await linkCustomerToFacebook(customer.id, analysis.customerName);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://enchantedparkpickups.com';

    await ctx.reply(
      `Request created!\n\n` +
      `Customer: ${customer.name}\n` +
      `Item: ${analysis.productName}\n` +
      `${analysis.size ? `Size: ${analysis.size}\n` : ''}` +
      `${analysis.park ? `Park: ${analysis.park}\n` : ''}` +
      `\nView in CRM: ${baseUrl}/admin/requests/${request.id}`,
      { parse_mode: 'HTML' }
    );

    log.info('Request created from Telegram', {
      requestId: request.id,
      customerId: customer.id,
      product: analysis.productName
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

  // Handle photo uploads
  bot.on('photo', async (ctx) => {
    try {
      const message = ctx.message as Message.PhotoMessage;
      await ctx.reply('Analyzing screenshot...');

      // Get highest resolution photo
      const photo = message.photo[message.photo.length - 1];
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

      // Download and convert to base64
      const response = await fetch(fileUrl);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      // Analyze with Claude Vision
      const analysis = await analyzeScreenshot(base64);

      if (!analysis.isValidRequest) {
        await ctx.reply(
          'Could not identify a product request in this image.\n' +
          'Please upload a screenshot of a customer requesting an item.'
        );
        return;
      }

      // Try to match customer
      const match = await matchCustomerByFBName(analysis.customerName);

      if (match.found && match.customer) {
        // Customer found - confirm and create request
        conversationState.set(ctx.from!.id, {
          step: 'confirm_request',
          data: {
            analysis,
            customer: match.customer,
            imageBase64: base64
          }
        });

        await ctx.reply(
          `Found customer: ${match.customer.name}\n` +
          `(matched on ${match.matchedOn})\n\n` +
          `Product: ${analysis.productName}\n` +
          `${analysis.size ? `Size: ${analysis.size}\n` : ''}` +
          `${analysis.park ? `Park: ${analysis.park}\n` : ''}` +
          `${analysis.notes ? `Notes: ${analysis.notes}\n` : ''}\n` +
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
            imageBase64: base64,
            suggestions: match.suggestions
          }
        });

        let message = `Customer "${analysis.customerName}" not found.\n\n`;

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
      conversationState.set(ctx.from.id, {
        step: 'enter_customer_email',
        data: {
          ...state.data,
          customerName: state.data.analysis.customerName
        }
      });
      await ctx.reply(
        `Creating new customer: ${state.data.analysis.customerName}\n\n` +
        `Enter their email address (or type "skip" to skip):`
      );
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

    // Handle email entry for new customer
    if (state.step === 'enter_customer_email') {
      const email = text.toLowerCase() === 'skip' ? null : text;

      // Create new customer
      const newCustomer = await createCustomerFromFacebook(
        state.data.customerName!,
        email
      );

      if (newCustomer) {
        state.data.customer = newCustomer;
        await createRequestFromState(ctx, state.data);
      } else {
        await ctx.reply('Failed to create customer. Please try again.');
      }

      conversationState.delete(ctx.from.id);
      return;
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
