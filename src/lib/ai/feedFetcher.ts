// @ts-nocheck
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { parseArticleForProducts, type ParsedProduct } from './parseArticle';
import { generateCanonicalName } from './deduplication';
import { downloadAndStoreImage, uploadBufferToS3 } from '@/lib/images/releaseImages';
import { findBestImageForProduct } from '@/lib/images/verifyImage';
import { processCompositeImage } from '@/lib/images/smartCropper';
import type { Database, Park, ItemCategory, ReleaseStatus } from '@/lib/database.types';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'EnchantedParkPickups/1.0 (merchandise-tracker)',
  },
});

// Create admin Supabase client for server-side operations
function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface FeedItem {
  title?: string;
  link?: string;
  content?: string;
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
      content: item.content || item['content:encoded'] || item.contentSnippet,
      contentSnippet: item.contentSnippet,
      pubDate: item.pubDate || item.isoDate,
      enclosure: item.enclosure,
    }));
  } catch (error) {
    console.error(`Error fetching RSS feed ${url}:`, error);
    throw error;
  }
}

export async function scrapeArticle(url: string): Promise<{ content: string; images: string[] }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnchantedParkPickups/1.0)',
      },
    });

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
    console.error(`Error scraping article ${url}:`, error);
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
    // Maps product name to cropped image buffer
    const croppedImages = new Map<string, Buffer>();

    if (eligibleProducts.length > 1 && articleImages.length > 0) {
      const productNames = eligibleProducts.map(p => p.name);
      console.log(`  📐 Checking for composite images with ${productNames.length} products...`);

      // Try each article image as a potential composite
      for (const imageUrl of articleImages.slice(0, 5)) {
        try {
          const cropped = await processCompositeImage(imageUrl, productNames);
          if (cropped.size > 0) {
            console.log(`  ✂️ Found composite with ${cropped.size} products`);
            for (const [name, buffer] of cropped) {
              croppedImages.set(name, buffer);
            }
            break; // Found a composite, stop checking other images
          }
        } catch (error) {
          // Ignore errors, continue with regular image processing
        }
      }
    }

    for (const product of parseResult.products) {
      // Skip California parks - we only service Orlando
      if (californiaParkCodes.includes(product.park)) {
        console.log(`Skipping California item: ${product.name} (${product.park})`);
        continue;
      }

      // Skip non-Disney/Universal properties (only Orlando theme parks)
      // Note: Nickelodeon/SpongeBob is at Universal Orlando, so we keep those
      const nonThemeParkBrands = ['warner bros', 'six flags', 'cedar fair', 'seaworld', 'busch gardens'];
      const lowerProductName = product.name.toLowerCase();
      const isNonThemePark = nonThemeParkBrands.some(brand => lowerProductName.includes(brand));
      if (isNonThemePark) {
        console.log(`Skipping non-theme-park item: ${product.name}`);
        continue;
      }

      // Check if we have a cropped image from composite image processing
      let croppedBuffer: Buffer | undefined = undefined;
      const croppedForProduct = croppedImages.get(product.name);
      if (croppedForProduct) {
        console.log(`  ✂️ Using cropped image for: ${product.name}`);
        croppedBuffer = croppedForProduct;
      }

      // Use AI to find the best matching image for this product (if no cropped image)
      let imageUrl = product.image_url || '';
      if (!croppedBuffer && !imageUrl && articleImages.length > 0) {
        console.log(`  🔍 AI searching for image: ${product.name}`);
        const bestMatch = await findBestImageForProduct(
          articleImages,
          product.name,
          product.category
        );
        if (bestMatch) {
          imageUrl = bestMatch;
          console.log(`  ✓ AI found matching image`);
        } else {
          console.log(`  ⚠️ No AI-verified image found, skipping image for this product`);
        }
      }

      // Generate canonical name for foolproof duplicate detection
      const productCanonical = generateCanonicalName(product.name);

      // Check for existing release by canonical_name (primary) or exact title match (fallback)
      const { data: existingByCanonical } = await supabase
        .from('new_releases')
        .select('id, title, image_url, canonical_name')
        .eq('canonical_name', productCanonical)
        .is('merged_into_id', null)
        .single();

      let existingRelease = existingByCanonical;

      // If no canonical match, try exact title match as fallback
      if (!existingRelease) {
        const { data: existingByTitle } = await supabase
          .from('new_releases')
          .select('id, title, image_url, canonical_name')
          .ilike('title', product.name)
          .is('merged_into_id', null)
          .single();
        existingRelease = existingByTitle;
      }

      if (existingRelease) {
        console.log(`    Duplicate detected: "${product.name}" matches "${existingRelease.title}" (canonical: ${productCanonical})`);
      }

      if (existingRelease) {
        // Product exists - update image if needed
        if (!existingRelease.image_url && (croppedBuffer || imageUrl)) {
          let s3Url: string | null = null;
          if (croppedBuffer) {
            // Upload cropped buffer directly
            s3Url = await uploadBufferToS3(croppedBuffer, existingRelease.id, 'image/jpeg');
          } else if (imageUrl) {
            s3Url = await downloadAndStoreImage(imageUrl, existingRelease.id, 'blog');
          }
          if (s3Url) {
            await supabase
              .from('new_releases')
              .update({
                image_url: s3Url,
              })
              .eq('id', existingRelease.id);
          }
        }

        updatedReleases++;
        console.log(`Updated existing release: ${product.name}`);
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
          })
          .select('id')
          .single();

        if (!error && newRelease) {
          // Download and store article image to S3
          if (croppedBuffer || imageUrl) {
            let s3Url: string | null = null;
            if (croppedBuffer) {
              // Upload cropped buffer directly
              s3Url = await uploadBufferToS3(croppedBuffer, newRelease.id, 'image/jpeg');
            } else if (imageUrl) {
              s3Url = await downloadAndStoreImage(imageUrl, newRelease.id, 'blog');
            }
            if (s3Url) {
              await supabase
                .from('new_releases')
                .update({
                  image_url: s3Url,
                })
                .eq('id', newRelease.id);
            }
          }

          newReleases++;
          console.log(`Created new release: ${product.name}`);
        } else if (error) {
          console.error('Error inserting release:', error);
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
          'popcorn bucket', 'sipper', 'pin', 'plush', 'mug', 'tumbler',
          'collection', 'exclusive', 'limited', 'release', 'arriving',
          'now available', 'coming soon', 'new at', 'shop', 'store'
        ];

        const isMerchRelated = merchandiseKeywords.some(kw => lowerTitle.includes(kw));

        if (!isMerchRelated && !item.content?.toLowerCase().includes('merchandise')) {
          continue;
        }

        // Skip non-Orlando articles (Orlando-only service)
        // Note: "70th" refers to Disneyland's 70th anniversary (1955-2025), WDW opened in 1971
        const nonOrlandoKeywords = ['disneyland', 'california adventure', 'dca', 'anaheim', 'universal hollywood', 'universal studios hollywood', '70th anniversary', 'disneyland 70', 'times square', 'nyc', 'new york'];
        const isNonOrlandoArticle = nonOrlandoKeywords.some(kw => lowerTitle.includes(kw));
        if (isNonOrlandoArticle) {
          console.log(`Skipping non-Orlando article: ${item.title}`);
          continue;
        }

        // Skip discount/sale articles - we only want NEW merchandise releases
        const discountKeywords = ['discount', 'sale', 'bogo', 'buy one get one', '% off', 'clearance', 'markdown', 'price cut', 'deal', 'save on'];
        const isDiscountArticle = discountKeywords.some(kw => lowerTitle.includes(kw));
        if (isDiscountArticle) {
          console.log(`Skipping discount/sale article: ${item.title}`);
          continue;
        }

        const { content, images } = await scrapeArticle(item.link);

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

    console.log(`Processing source: ${source.name}`);
    const result = await processFeedSource(source as FeedSource);

    sourcesProcessed++;
    totalArticles += result.articlesProcessed;
    totalNew += result.newReleases;
    totalUpdated += result.updatedReleases;
    allErrors.push(...result.errors.map(e => `[${source.name}] ${e}`));

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return {
    sourcesProcessed,
    totalArticles,
    newReleases: totalNew,
    updatedReleases: totalUpdated,
    errors: allErrors,
  };
}
