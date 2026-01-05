// Type checking enabled
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { parseArticleForProducts } from './parseArticle';
import { generateCanonicalName } from './deduplication';
import { downloadAndStoreImage, uploadBufferToS3, storeOriginalImage, extractImagesFromHtml } from '@/lib/images/releaseImages';
import { findBestImageForProduct } from '@/lib/images/verifyImage';
import { processCompositeImage } from '@/lib/images/smartCropper';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { smartFetch } from '@/lib/scraper/proxyFetch';
import type { Park, ItemCategory, ReleaseStatus } from '@/lib/database.types';

const log = createLogger('FeedFetcher');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'EnchantedParkPickups/1.0 (merchandise-tracker)',
  },
  customFields: {
    item: [['content:encoded', 'contentEncoded']],
  },
});

interface FeedItem {
  title?: string;
  link?: string;
  content?: string;
  contentEncoded?: string; // Full HTML content from content:encoded
  contentSnippet?: string;
  pubDate?: string;
  enclosure?: { url?: string };
}

interface FeedSource {
  id: string;
  name: string;
  url: string;
  type: string;
  park: Park | 'all';
  is_active: boolean;
  check_frequency_hours: number;
  last_checked: string | null;
}

export async function fetchRSSFeed(url: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.map(item => ({
      title: item.title,
      link: item.link,
      content: item.content || item.contentSnippet,
      contentEncoded: (item as any).contentEncoded, // Full HTML with images from content:encoded
      contentSnippet: item.contentSnippet,
      pubDate: item.pubDate || item.isoDate,
      enclosure: item.enclosure,
    }));
  } catch (error) {
    log.error(`Error fetching RSS feed ${url}`, error);
    throw error;
  }
}

export async function scrapeArticle(url: string): Promise<{ content: string; images: string[] }> {
  try {
    // Use smartFetch which routes blocked domains through ScraperAPI
    const response = await smartFetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer, ads, and related articles sections
    $('script, style, nav, footer, aside, .ad, .advertisement, .sidebar').remove();
    // Remove "related articles" sections that can cause false product matches
    $('.related-posts, .related-articles, .related, .yarpp-related, .jp-relatedposts, [class*="related-post"], [class*="related-article"], .more-stories, .recommended-posts, .you-may-also-like').remove();

    // Get main content
    const mainContent = $('article, .post-content, .entry-content, main').first();
    const content = mainContent.length > 0 ? mainContent.text() : $('body').text();

    // Extract images
    const images: string[] = [];
    const seenImages = new Set<string>();

    $('img').each((_, el) => {
      // Get src from various attributes
      let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');

      // Also check srcset for higher quality images
      const srcset = $(el).attr('srcset') || $(el).attr('data-srcset');
      if (srcset) {
        // Extract the largest image from srcset (usually last one or one with highest w value)
        const srcsetParts = srcset.split(',').map(s => s.trim().split(' ')[0]);
        if (srcsetParts.length > 0) {
          // Prefer larger images (usually at the end of srcset)
          src = srcsetParts[srcsetParts.length - 1] || src;
        }
      }

      if (src && !src.includes('avatar') && !src.includes('logo') && !src.includes('icon') && !src.includes('subscribe') && !src.includes('Get-Away-Today')) {
        try {
          // Clean up the URL (remove resize/crop parameters for full-size image)
          let cleanUrl = src.replace(/\?.*$/, ''); // Remove query params
          if (src.includes('wp.com')) {
            // For wp.com CDN, use the base URL
            cleanUrl = src.split('?')[0];
          }
          const absoluteUrl = new URL(cleanUrl, url).href;

          // Extract base filename to avoid duplicates
          const baseFile = absoluteUrl.match(/IMG_\d+|[^/]+\.(jpg|jpeg|png|webp|gif)/i)?.[0] || absoluteUrl;
          if (!seenImages.has(baseFile)) {
            seenImages.add(baseFile);
            images.push(absoluteUrl);
          }
        } catch {
          if (src.startsWith('http')) {
            images.push(src);
          }
        }
      }
    });

    return {
      content: content.replace(/\s+/g, ' ').trim(),
      images: images.slice(0, 20),
    };
  } catch (error) {
    log.error(`Error scraping article ${url}`, error);
    throw error;
  }
}

function mapParkLocation(parkLocation: string, sourcePark: Park | 'all'): Park {
  if (parkLocation.startsWith('disney')) return 'disney';
  if (parkLocation.startsWith('universal')) return 'universal';
  if (parkLocation === 'seaworld') return 'seaworld';
  if (sourcePark !== 'all') return sourcePark;
  return 'disney';
}

interface ProcessResult {
  newReleases: number;
  updatedReleases: number;
  error?: string;
}

export async function processArticle(
  source: FeedSource,
  articleUrl: string,
  articleTitle: string,
  articleContent: string,
  articleImages: string[],
  articlePubDate?: string // Article publication date from RSS feed
): Promise<ProcessResult> {
  const supabase = getSupabaseAdmin();

  try {
    // Check if article already processed
    const { data: existing } = await supabase
      .from('processed_articles')
      .select('id')
      .eq('url', articleUrl)
      .single();

    if (existing) {
      return { newReleases: 0, updatedReleases: 0 };
    }

    // Parse article with AI
    const parseResult = await parseArticleForProducts(articleContent, articleUrl, source.name);

    // Record that we processed this article
    await supabase.from('processed_articles').insert({
      source_id: source.id,
      url: articleUrl,
      title: articleTitle,
      items_found: parseResult.products.length,
    });

    if (!parseResult.isMerchandiseRelated || parseResult.products.length === 0) {
      return { newReleases: 0, updatedReleases: 0 };
    }

    let newReleases = 0;
    let updatedReleases = 0;

    // California parks to exclude (Orlando-only service)
    const californiaParkCodes = ['disneyland_ca', 'dca_ca', 'universal_hollywood'];

    // Filter out California products first
    const eligibleProducts = parseResult.products.filter(p => !californiaParkCodes.includes(p.park));

    // Try smart cropping for composite images when we have multiple products
    // Maps product name to { buffer, sourceUrl }
    const croppedImages = new Map<string, { buffer: Buffer; sourceUrl: string }>();

    if (eligibleProducts.length > 1 && articleImages.length > 0) {
      const productNames = eligibleProducts.map(p => p.name);
      log.debug(`Checking for composite images`, { productCount: productNames.length });

      // Try each article image as a potential composite
      for (const compositeImageUrl of articleImages.slice(0, 5)) {
        try {
          const cropped = await processCompositeImage(compositeImageUrl, productNames);
          if (cropped.size > 0) {
            log.debug(`Found composite image`, { productCount: cropped.size });
            for (const [name, buffer] of cropped) {
              croppedImages.set(name, { buffer, sourceUrl: compositeImageUrl });
            }
            break; // Found a composite, stop checking other images
          }
        } catch (error) {
          // Ignore errors, continue with regular image processing
        }
      }
    }

    for (const product of parseResult.products) {
      // Skip online-only products - we only do park pickups
      if (product.is_online_only) {
        log.debug(`Skipping online-only item`, { name: product.name });
        continue;
      }

      // Skip California parks - we only service Orlando
      if (californiaParkCodes.includes(product.park)) {
        log.debug(`Skipping California item`, { name: product.name, park: product.park });
        continue;
      }

      // Skip non-Orlando theme park properties
      // Note: SeaWorld Orlando IS included (removed from exclusion list)
      // Note: Nickelodeon/SpongeBob is at Universal Orlando, so we keep those
      const nonThemeParkBrands = ['warner bros', 'six flags', 'cedar fair', 'busch gardens', 'legoland'];
      const lowerProductName = product.name.toLowerCase();
      const isNonThemePark = nonThemeParkBrands.some(brand => lowerProductName.includes(brand));
      if (isNonThemePark) {
        log.debug(`Skipping non-theme-park item`, { name: product.name });
        continue;
      }

      // Check if we have a cropped image from composite image processing
      let croppedBuffer: Buffer | undefined = undefined;
      let originalSourceUrl: string | undefined = undefined;
      const croppedForProduct = croppedImages.get(product.name);
      if (croppedForProduct) {
        log.debug(`Using cropped image`, { name: product.name });
        croppedBuffer = croppedForProduct.buffer;
        originalSourceUrl = croppedForProduct.sourceUrl;
      }

      // Use AI to find the best matching image for this product (if no cropped image)
      let imageUrl = product.image_url || '';
      if (!croppedBuffer && !imageUrl && articleImages.length > 0) {
        log.debug(`AI searching for image`, { name: product.name });
        const bestMatch = await findBestImageForProduct(
          articleImages,
          product.name,
          product.category
        );
        if (bestMatch) {
          imageUrl = bestMatch;
          log.debug(`AI found matching image`);
        } else {
          log.debug(`No AI-verified image found, skipping image for this product`);
        }
      }

      // Generate canonical name for foolproof duplicate detection
      const productCanonical = generateCanonicalName(product.name);

      // Use comprehensive duplicate check function (checks URL, image, title similarity, word overlap)
      const { data: dupCheck, error: dupError } = await supabase
        .rpc('is_duplicate_release', {
          p_title: product.name,
          p_source_url: articleUrl,
          p_image_url: imageUrl || null
        });

      let existingRelease: { id: string; title: string; image_url: string | null; canonical_name: string | null } | null = null;

      if (dupCheck && dupCheck.length > 0 && dupCheck[0].is_duplicate) {
        // Fetch the existing release details
        const { data: existingData } = await supabase
          .from('new_releases')
          .select('id, title, image_url, canonical_name')
          .eq('id', dupCheck[0].existing_id)
          .single();

        if (existingData) {
          existingRelease = existingData;
          log.debug(`Duplicate detected via ${dupCheck[0].match_reason}`, {
            name: product.name,
            existingTitle: existingRelease.title,
            similarity: dupCheck[0].similarity_score
          });
        }
      }

      // Fallback: Also check canonical_name in case the RPC fails
      if (!existingRelease && !dupError) {
        const { data: existingByCanonical } = await supabase
          .from('new_releases')
          .select('id, title, image_url, canonical_name')
          .eq('canonical_name', productCanonical)
          .is('merged_into_id', null)
          .single();

        if (existingByCanonical) {
          existingRelease = existingByCanonical;
          log.debug(`Duplicate detected via canonical_name fallback`, { name: product.name, existingTitle: existingRelease.title });
        }
      }

      if (existingRelease) {
        // Product exists - update image if needed
        if (!existingRelease.image_url && (croppedBuffer || imageUrl)) {
          let s3Url: string | null = null;
          let originalS3Url: string | null = null;

          if (croppedBuffer) {
            // Upload cropped buffer directly
            s3Url = await uploadBufferToS3(croppedBuffer, existingRelease.id, 'image/jpeg');
            // Also store the original uncropped image for manual re-cropping
            if (originalSourceUrl) {
              log.debug(`Storing original image for manual re-crop`);
              originalS3Url = await storeOriginalImage(originalSourceUrl, existingRelease.id);
            }
          } else if (imageUrl) {
            s3Url = await downloadAndStoreImage(imageUrl, existingRelease.id, 'blog');
          }

          if (s3Url) {
            const updateData: { image_url: string; original_image_url?: string } = {
              image_url: s3Url,
            };
            if (originalS3Url) {
              updateData.original_image_url = originalS3Url;
            }
            await supabase
              .from('new_releases')
              .update(updateData)
              .eq('id', existingRelease.id);
          }
        }

        updatedReleases++;
        log.info(`Updated existing release`, { name: product.name });
      } else {
        // New product - create release record
        // Nickelodeon/SpongeBob items are Universal (not Disney)
        const nickelodeonBrands = ['spongebob', 'nickelodeon', 'patrick star', 'bikini bottom'];
        const isNickelodeon = nickelodeonBrands.some(b => lowerProductName.includes(b));
        const productPark = isNickelodeon ? 'universal' : mapParkLocation(product.park, source.park);

        const { data: newRelease, error } = await supabase
          .from('new_releases')
          .insert({
            title: product.name,
            canonical_name: productCanonical, // For duplicate prevention
            description: product.description,
            image_url: '', // Will be set after S3 upload
            source_url: articleUrl,
            source: source.name,
            park: productPark,
            category: product.category as ItemCategory,
            price_estimate: product.estimated_price,
            release_date: articlePubDate ? new Date(articlePubDate).toISOString() : new Date().toISOString(),
            is_limited_edition: product.is_limited_edition,
            is_featured: product.demand_score >= 8,
            ai_description: product.description,
            ai_tags: product.tags,
            ai_demand_score: product.demand_score,
            raw_content: articleContent.slice(0, 5000),
            status: product.release_status as ReleaseStatus,
            article_url: articleUrl,
            location: product.park,
            locations: product.locations || [],  // Structured location data from AI
            store_name: product.store_name || null,  // Specific store name from article
            store_area: product.store_area || null,  // Land/area from article
          })
          .select('id')
          .single();

        if (!error && newRelease) {
          // Download and store article image to S3
          if (croppedBuffer || imageUrl) {
            let s3Url: string | null = null;
            let originalS3Url: string | null = null;

            if (croppedBuffer) {
              // Upload cropped buffer directly
              s3Url = await uploadBufferToS3(croppedBuffer, newRelease.id, 'image/jpeg');
              // Also store the original uncropped image for manual re-cropping
              if (originalSourceUrl) {
                log.debug(`Storing original image for manual re-crop`);
                originalS3Url = await storeOriginalImage(originalSourceUrl, newRelease.id);
              }
            } else if (imageUrl) {
              s3Url = await downloadAndStoreImage(imageUrl, newRelease.id, 'blog');
            }

            if (s3Url) {
              const updateData: { image_url: string; original_image_url?: string } = {
                image_url: s3Url,
              };
              if (originalS3Url) {
                updateData.original_image_url = originalS3Url;
              }
              await supabase
                .from('new_releases')
                .update(updateData)
                .eq('id', newRelease.id);
            }
          }

          newReleases++;
          log.info(`Created new release`, { name: product.name });
        } else if (error) {
          log.error('Error inserting release', error);
        }
      }
    }

    return { newReleases, updatedReleases };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase.from('processed_articles').insert({
      source_id: source.id,
      url: articleUrl,
      title: articleTitle,
      items_found: 0,
      error: errorMessage,
    });

    return { newReleases: 0, updatedReleases: 0, error: errorMessage };
  }
}

export async function processFeedSource(source: FeedSource): Promise<{
  articlesProcessed: number;
  newReleases: number;
  updatedReleases: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];
  let articlesProcessed = 0;
  let totalNew = 0;
  let totalUpdated = 0;

  try {
    const items = await fetchRSSFeed(source.url);

    for (const item of items.slice(0, 50)) {
      if (!item.link) continue;

      try {
        const lowerTitle = (item.title || '').toLowerCase();
        const merchandiseKeywords = [
          'merchandise', 'merch', 'loungefly', 'spirit jersey', 'ears',
          'popcorn bucket', 'sipper', 'pin', 'plush', 'squishmallow', 'mug', 'tumbler',
          'collection', 'exclusive', 'limited', 'release', 'arriving', 'debuts',
          'now available', 'coming soon', 'new at', 'shop', 'store',
          'sweatshirt', 'hoodie', 'jacket', 't-shirt', 'tee', 'shirt',
          'backpack', 'bag', 'purse', 'wallet', 'hat', 'cap', 'headband',
          'ornament', 'figure', 'figurine', 'toy', 'doll', 'stuffed'
        ];

        const isMerchRelated = merchandiseKeywords.some(kw => lowerTitle.includes(kw));

        if (!isMerchRelated && !item.content?.toLowerCase().includes('merchandise')) {
          continue;
        }

        // Skip non-Orlando articles (Orlando-only service)
        // Note: "70th" refers to Disneyland's 70th anniversary (1955-2025), WDW opened in 1971
        // Use word boundary matching for short keywords to avoid false positives (e.g., "dca" matching "wildcats")
        const nonOrlandoKeywords = ['disneyland', 'california adventure', 'anaheim', 'universal hollywood', 'universal studios hollywood', '70th anniversary', 'disneyland 70', 'times square', 'new york'];
        const nonOrlandoShortKeywords = ['dca', 'nyc']; // These need word boundary matching
        const isNonOrlandoArticle = nonOrlandoKeywords.some(kw => lowerTitle.includes(kw)) ||
          nonOrlandoShortKeywords.some(kw => new RegExp(`\\b${kw}\\b`).test(lowerTitle));
        if (isNonOrlandoArticle) {
          log.debug(`Skipping non-Orlando article`, { title: item.title });
          continue;
        }

        // Skip discount/sale articles - we only want NEW merchandise releases
        const discountKeywords = ['discount', 'sale', 'bogo', 'buy one get one', '% off', 'clearance', 'markdown', 'price cut', 'deal', 'save on'];
        const isDiscountArticle = discountKeywords.some(kw => lowerTitle.includes(kw));
        if (isDiscountArticle) {
          log.debug(`Skipping discount/sale article`, { title: item.title });
          continue;
        }

        // Skip non-park retail articles (Aldi, Target, Walmart, Five Below, etc.)
        // Only park/resort merchandise is valid - we're an Orlando park pickup service
        const nonParkRetailers = [
          // Discount/variety stores
          'aldi', 'target', 'walmart', 'costco', 'five below', 'dollar tree', 'dollar general',
          // Fashion retailers
          'boxlunch', 'hot topic', 'kohls', 'jcpenney', 'macy', 'nordstrom', 'primark',
          // Online retailers
          'amazon', 'shopdisney.com',
          // Fast food (movie tie-ins)
          'burger king', 'mcdonalds', 'wendy', 'taco bell', 'kfc', 'chick-fil-a', 'popeyes',
          // Grocery stores
          'publix', 'kroger', 'safeway', 'trader joe',
        ];
        const isNonParkRetail = nonParkRetailers.some(kw => lowerTitle.includes(kw));
        if (isNonParkRetail) {
          log.debug(`Skipping non-park retail article`, { title: item.title });
          continue;
        }

        // Skip articles that are specifically about shopDisney online-only releases
        // These items are available online, not in parks - our service is for park pickups only
        const onlineOnlyKeywords = ['shopdisney exclusive', 'shopdisney.com', 'available on shopdisney', 'online exclusive', 'web exclusive'];
        const isOnlineOnlyArticle = onlineOnlyKeywords.some(kw => lowerTitle.includes(kw));
        if (isOnlineOnlyArticle) {
          log.debug(`Skipping online-only article`, { title: item.title });
          continue;
        }

        let content: string;
        let images: string[];

        // PREFER RSS content to avoid ScraperAPI costs
        // RSS feeds provide content:encoded which has full article HTML with images
        // Only scrape if RSS content is insufficient (< 500 chars or no images)
        const rssContent = item.contentEncoded || item.content || '';
        const rssImages = extractImagesFromHtml(rssContent, item.link || '');

        if (rssContent.length >= 500 || rssImages.length > 0) {
          // RSS content is sufficient - use it (FREE, no ScraperAPI)
          content = rssContent;
          images = rssImages;
          log.debug(`Using RSS content (no scrape needed)`, {
            contentLength: rssContent.length,
            imageCount: images.length
          });
        } else {
          // RSS content insufficient - need to scrape (uses ScraperAPI credits)
          try {
            log.debug(`RSS content insufficient, scraping article`, {
              rssLength: rssContent.length,
              rssImages: rssImages.length
            });
            const scraped = await scrapeArticle(item.link);
            content = scraped.content;
            images = scraped.images;
          } catch (scrapeError) {
            // Fallback to RSS content when scraping fails (e.g., 403 errors)
            log.warn(`Scrape failed, using RSS content fallback`, { title: item.title });
            content = rssContent;
            images = rssImages;
          }
        }

        const result = await processArticle(
          source,
          item.link,
          item.title || 'Untitled',
          content || item.content || '',
          images,
          item.pubDate // Pass article publication date
        );

        articlesProcessed++;
        totalNew += result.newReleases;
        totalUpdated += result.updatedReleases;

        if (result.error) {
          errors.push(`${item.title}: ${result.error}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errors.push(`${item.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update feed source - now using feed_sources table
    await supabase
      .from('feed_sources')
      .update({
        last_checked: new Date().toISOString(),
        last_error: errors.length > 0 ? errors[0] : null,
      })
      .eq('id', source.id);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch feed';
    errors.push(errorMessage);

    await supabase
      .from('feed_sources')
      .update({
        last_checked: new Date().toISOString(),
        last_error: errorMessage,
      })
      .eq('id', source.id);
  }

  return { articlesProcessed, newReleases: totalNew, updatedReleases: totalUpdated, errors };
}

export async function processAllSources(): Promise<{
  sourcesProcessed: number;
  totalArticles: number;
  newReleases: number;
  updatedReleases: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();

  // Acquire processing lock to prevent concurrent runs
  const lockName = 'feed_processing';
  const { data: lockAcquired, error: lockError } = await supabase
    .rpc('acquire_feed_lock', { p_lock_name: lockName, p_timeout_minutes: 30 });

  if (lockError || !lockAcquired) {
    log.warn('Could not acquire processing lock - another process may be running');
    return {
      sourcesProcessed: 0,
      totalArticles: 0,
      newReleases: 0,
      updatedReleases: 0,
      errors: ['Could not acquire processing lock - another process is running']
    };
  }

  log.info('Processing lock acquired');

  try {
    // Use feed_sources table
    const { data: sources, error } = await supabase
      .from('feed_sources')
      .select('*')
      .eq('is_active', true);

    if (error || !sources) {
      return {
        sourcesProcessed: 0,
        totalArticles: 0,
        newReleases: 0,
        updatedReleases: 0,
        errors: [error?.message || 'No sources found']
      };
    }

    const now = new Date();
    const allErrors: string[] = [];
    let totalArticles = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let sourcesProcessed = 0;

    for (const source of sources) {
      // Skip time check if FORCE_RECHECK is set
      if (!process.env.FORCE_RECHECK && source.last_checked) {
        const lastChecked = new Date(source.last_checked);
        const hoursSinceCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);

        if (hoursSinceCheck < source.check_frequency_hours) {
          continue;
        }
      }

      log.info(`Processing source`, { name: source.name });
      const result = await processFeedSource(source as FeedSource);

      sourcesProcessed++;
      totalArticles += result.articlesProcessed;
      totalNew += result.newReleases;
      totalUpdated += result.updatedReleases;
      allErrors.push(...result.errors.map(e => `[${source.name}] ${e}`));

      // Summary logging for this source
      log.info(`[Feed] ${source.name}: ${result.articlesProcessed} articles, ${result.newReleases} new, ${result.updatedReleases} duplicates updated`);

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Final summary logging
    log.info(`[Feed] TOTAL: ${sourcesProcessed} sources, ${totalArticles} articles, ${totalNew} new releases, ${totalUpdated} duplicates updated`);

    return {
      sourcesProcessed,
      totalArticles,
      newReleases: totalNew,
      updatedReleases: totalUpdated,
      errors: allErrors,
    };
  } finally {
    // Always release the lock when done
    await supabase.rpc('release_feed_lock', { p_lock_name: lockName });
    log.info('Processing lock released');
  }
}
