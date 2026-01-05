/**
 * Backfill releases by crawling merchandise category pages
 * Uses ScraperAPI to access blocked sites
 */

// Load environment variables
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { smartFetchText } from '../src/lib/scraper/proxyFetch';
import { processArticle, scrapeArticle } from '../src/lib/ai/feedFetcher';
import { getSupabaseAdmin } from '../src/lib/supabase/admin';
import * as cheerio from 'cheerio';

const MERCHANDISE_PAGES = [
  {
    name: 'WDWNT Merchandise',
    url: 'https://wdwnt.com/category/merchandise/',
    park: 'disney' as const,
  },
  {
    name: 'WDWNT Universal',
    url: 'https://wdwnt.com/category/merchandise/universal-merchandise/',
    park: 'universal' as const,
  },
  {
    name: 'BlogMickey',
    url: 'https://blogmickey.com/category/merchandise/',
    park: 'disney' as const,
  },
  {
    name: 'Chip and Company',
    url: 'https://chipandco.com/category/disney-merchandise/',
    park: 'disney' as const,
  },
];

async function extractArticleUrls(pageUrl: string): Promise<string[]> {
  console.log('[Crawl] Fetching: ' + pageUrl);
  const html = await smartFetchText(pageUrl);
  const $ = cheerio.load(html);

  const urls: string[] = [];

  // Common article link patterns
  $('article a, .post a, .entry-title a, h2 a, h3 a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('/202') && !urls.includes(href)) {
      // Only include article URLs (contain year like /2026/ or /2025/)
      urls.push(href);
    }
  });

  // Also check for direct article links in the page
  $('a[href*="/2026/"], a[href*="/2025/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !urls.includes(href) && !href.includes('#') && !href.includes('?')) {
      urls.push(href);
    }
  });

  // Dedupe and filter
  const uniqueUrls = [...new Set(urls)].filter(url => {
    // Must be a full article URL, not category/tag page
    return url.match(/\/\d{4}\/\d{2}\//) && !url.includes('/category/') && !url.includes('/tag/');
  });

  console.log('[Crawl] Found ' + uniqueUrls.length + ' article URLs');
  return uniqueUrls.slice(0, 30); // Limit to 30 per source
}

async function backfillFromSource(source: typeof MERCHANDISE_PAGES[0]) {
  const supabase = getSupabaseAdmin();
  console.log('\n=== Processing ' + source.name + ' ===');

  try {
    const articleUrls = await extractArticleUrls(source.url);
    let processed = 0;
    let newReleases = 0;
    let updated = 0;

    for (const url of articleUrls) {
      // Check if already processed
      const { data: existing } = await supabase
        .from('processed_articles')
        .select('id')
        .eq('url', url)
        .single();

      if (existing) {
        console.log('[Skip] Already processed: ' + url.substring(0, 60) + '...');
        continue;
      }

      try {
        console.log('[Process] ' + url.substring(0, 70) + '...');
        const { content, images } = await scrapeArticle(url);

        // Extract title from URL
        const titleMatch = url.match(/\/([^/]+)\/?$/);
        const title = titleMatch ? titleMatch[1].replace(/-/g, ' ') : 'Untitled';

        const mockSource = {
          id: 'backfill',
          name: source.name,
          url: source.url,
          type: 'crawl',
          park: source.park,
          is_active: true,
          check_frequency_hours: 24,
          last_checked: null,
        };

        const result = await processArticle(mockSource, url, title, content, images);

        processed++;
        newReleases += result.newReleases;
        updated += result.updatedReleases;

        if (result.newReleases > 0) {
          console.log('  Created ' + result.newReleases + ' new release(s)');
        }
        if (result.updatedReleases > 0) {
          console.log('  Updated ' + result.updatedReleases + ' existing release(s)');
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.log('  Error: ' + (err instanceof Error ? err.message : 'Unknown'));
      }
    }

    console.log('\n' + source.name + ' Summary: ' + processed + ' articles, ' + newReleases + ' new, ' + updated + ' updated');
    return { processed, newReleases, updated };

  } catch (err) {
    console.error('Failed to process ' + source.name + ':', err);
    return { processed: 0, newReleases: 0, updated: 0 };
  }
}

async function main() {
  console.log('Starting backfill of recent merchandise articles...\n');

  let totalProcessed = 0;
  let totalNew = 0;
  let totalUpdated = 0;

  for (const source of MERCHANDISE_PAGES) {
    const result = await backfillFromSource(source);
    totalProcessed += result.processed;
    totalNew += result.newReleases;
    totalUpdated += result.updated;

    // Wait between sources
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('\n========================================');
  console.log('BACKFILL COMPLETE');
  console.log('   Articles processed: ' + totalProcessed);
  console.log('   New releases: ' + totalNew);
  console.log('   Updated releases: ' + totalUpdated);
  console.log('========================================\n');
}

main().catch(console.error);
