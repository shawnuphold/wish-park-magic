/**
 * Crawl WDWNT Universal for specific date range (12/24 - 1/4)
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { smartFetchText } from '../src/lib/scraper/proxyFetch';
import { processArticle, scrapeArticle } from '../src/lib/ai/feedFetcher';
import { getSupabaseAdmin } from '../src/lib/supabase/admin';
import * as cheerio from 'cheerio';

async function crawlPage(url: string): Promise<string[]> {
  console.log('[Crawl] Fetching: ' + url);
  const html = await smartFetchText(url);
  const $ = cheerio.load(html);

  const urls: string[] = [];

  // Find all article links
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    // Match WDWNT article URLs with dates
    const dateMatch = href.match(/wdwnt\.com\/(\d{4})\/(\d{2})\/([^/]+)/);
    if (dateMatch && !urls.includes(href)) {
      const year = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);

      // Include Dec 2025 and Jan 2026
      if ((year === 2025 && month === 12) || (year === 2026 && month === 1)) {
        urls.push(href);
      }
    }
  });

  return [...new Set(urls)];
}

async function processUrl(url: string) {
  const supabase = getSupabaseAdmin();

  // Check if already processed
  const { data: existing } = await supabase
    .from('processed_articles')
    .select('id')
    .eq('url', url)
    .single();

  if (existing) {
    console.log('[Skip] Already processed');
    return { newReleases: 0, updatedReleases: 0 };
  }

  try {
    const { content, images } = await scrapeArticle(url);

    // Extract title from URL
    const titleMatch = url.match(/\/([^/]+)\/?$/);
    const title = titleMatch ? titleMatch[1].replace(/-/g, ' ') : 'Untitled';

    const mockSource = {
      id: 'backfill-universal',
      name: 'WDWNT Universal',
      url: 'https://wdwnt.com/category/merchandise/universal-merchandise/',
      type: 'crawl',
      park: 'universal' as const,
      is_active: true,
      check_frequency_hours: 24,
      last_checked: null,
    };

    return await processArticle(mockSource, url, title, content, images);
  } catch (err) {
    console.log('  Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    return { newReleases: 0, updatedReleases: 0 };
  }
}

async function main() {
  console.log('Crawling WDWNT Universal for 12/24 - 1/4 articles...\n');

  // Crawl multiple pages to get older articles
  const pages = [
    'https://wdwnt.com/category/merchandise/universal-merchandise/',
    'https://wdwnt.com/category/merchandise/universal-merchandise/page/2/',
    'https://wdwnt.com/category/merchandise/universal-merchandise/page/3/',
    'https://wdwnt.com/category/merchandise/universal-merchandise/page/4/',
    'https://wdwnt.com/category/merchandise/universal-merchandise/page/5/',
  ];

  const allUrls: string[] = [];

  for (const pageUrl of pages) {
    try {
      const urls = await crawlPage(pageUrl);
      console.log('Found ' + urls.length + ' articles from Dec 25/Jan 26');
      allUrls.push(...urls);
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.log('Error crawling page: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  }

  const uniqueUrls = [...new Set(allUrls)];
  console.log('\nTotal unique articles: ' + uniqueUrls.length);

  // Process each article
  let totalNew = 0;
  let totalUpdated = 0;
  let processed = 0;

  for (const url of uniqueUrls) {
    const dateMatch = url.match(/\/(\d{4})\/(\d{2})\/([^/]+)/);
    const dateStr = dateMatch ? dateMatch[1] + '-' + dateMatch[2] : 'unknown';
    const slug = dateMatch ? dateMatch[3].substring(0, 40) : url.substring(0, 40);

    console.log('\n[' + (processed + 1) + '/' + uniqueUrls.length + '] ' + dateStr + ': ' + slug + '...');

    const result = await processUrl(url);

    if (result.newReleases > 0) {
      console.log('  Created ' + result.newReleases + ' new release(s)');
    }
    if (result.updatedReleases > 0) {
      console.log('  Updated ' + result.updatedReleases + ' existing release(s)');
    }

    totalNew += result.newReleases;
    totalUpdated += result.updatedReleases;
    processed++;

    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n========================================');
  console.log('CRAWL COMPLETE');
  console.log('   Articles processed: ' + processed);
  console.log('   New releases: ' + totalNew);
  console.log('   Updated releases: ' + totalUpdated);
  console.log('========================================\n');
}

main().catch(console.error);
