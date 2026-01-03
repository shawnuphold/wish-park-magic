// @ts-nocheck
/**
 * Online Availability Checker
 *
 * INTERNAL USE ONLY - Never expose results to customers.
 * Used to determine if a product is park exclusive or available online.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { generateCanonicalName } from '../ai/deduplication';
import type { Database } from '../database.types';

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface OnlineAvailabilityResult {
  available: boolean;
  price?: number;
  url?: string;
  sku?: string;
  matchConfidence: 'exact' | 'high' | 'medium' | 'low' | 'none';
}

const SHOPDISNEY_SEARCH_URL = 'https://www.shopdisney.com/search?q=';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Calculate similarity between two canonical names
 */
function calculateSimilarity(name1: string, name2: string): number {
  const words1 = name1.toLowerCase().split('-').filter(Boolean);
  const words2 = name2.toLowerCase().split('-').filter(Boolean);

  if (words1.length === 0 || words2.length === 0) return 0;

  let matches = 0;
  for (const word of words1) {
    if (words2.includes(word)) {
      matches++;
    }
  }

  const maxWords = Math.max(words1.length, words2.length);
  return matches / maxWords;
}

/**
 * Search shopDisney for a product
 */
export async function isAvailableOnline(productName: string): Promise<OnlineAvailabilityResult> {
  const searchCanonical = generateCanonicalName(productName);
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1920, height: 1080 });

    // Create search query - use important words from the product name
    const searchTerms = productName
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 5) // Limit to 5 words
      .join(' ');

    const searchUrl = `${SHOPDISNEY_SEARCH_URL}${encodeURIComponent(searchTerms)}`;

    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for search results
    await page.waitForSelector('[data-product-id], .product-tile, .product-card, .no-results', {
      timeout: 10000,
    }).catch(() => {});

    // Check for no results
    const noResults = await page.$('.no-results, .empty-results, [data-test="no-results"]');
    if (noResults) {
      return {
        available: false,
        matchConfidence: 'none',
      };
    }

    // Extract search results
    const results = await page.evaluate(() => {
      const products: Array<{
        name: string;
        price: number | null;
        url: string;
        sku: string;
        inStock: boolean;
      }> = [];

      const productTiles = document.querySelectorAll('[data-product-id], .product-tile, .product-card');

      productTiles.forEach((tile) => {
        try {
          const nameEl = tile.querySelector('.product-name, .product-title, [data-test="product-name"], h3, h4');
          const priceEl = tile.querySelector('.product-price, .price, [data-test="product-price"], .sales-price');
          const linkEl = tile.querySelector('a[href*="/product/"], a[href*="/p/"]') as HTMLAnchorElement;
          const skuEl = tile.querySelector('[data-product-id], [data-sku]');

          const name = nameEl?.textContent?.trim();
          if (!name) return;

          const priceText = priceEl?.textContent?.trim();
          const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;

          const url = linkEl?.href || '';
          const sku = skuEl?.getAttribute('data-product-id') ||
                     skuEl?.getAttribute('data-sku') ||
                     url.split('/').pop()?.split('?')[0] || '';

          // Check if in stock
          const outOfStock = tile.querySelector('.out-of-stock, .sold-out');
          const inStock = !outOfStock;

          products.push({
            name,
            price: isNaN(price!) ? null : price,
            url,
            sku,
            inStock,
          });
        } catch {
          // Skip
        }
      });

      return products;
    });

    if (results.length === 0) {
      return {
        available: false,
        matchConfidence: 'none',
      };
    }

    // Find best match
    let bestMatch: typeof results[0] | null = null;
    let bestSimilarity = 0;

    for (const result of results) {
      const resultCanonical = generateCanonicalName(result.name);
      const similarity = calculateSimilarity(searchCanonical, resultCanonical);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = result;
      }
    }

    if (!bestMatch) {
      return {
        available: false,
        matchConfidence: 'none',
      };
    }

    // Determine confidence level
    let matchConfidence: OnlineAvailabilityResult['matchConfidence'];
    if (bestSimilarity >= 0.9) matchConfidence = 'exact';
    else if (bestSimilarity >= 0.7) matchConfidence = 'high';
    else if (bestSimilarity >= 0.5) matchConfidence = 'medium';
    else if (bestSimilarity >= 0.3) matchConfidence = 'low';
    else matchConfidence = 'none';

    // Only return as available if we have at least medium confidence
    if (matchConfidence === 'none' || matchConfidence === 'low') {
      return {
        available: false,
        matchConfidence,
      };
    }

    return {
      available: bestMatch.inStock,
      price: bestMatch.price || undefined,
      url: bestMatch.url,
      sku: bestMatch.sku,
      matchConfidence,
    };

  } catch (error) {
    console.error('Online availability check failed:', error);
    return {
      available: false,
      matchConfidence: 'none',
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Check online availability for a release and update the database
 */
export async function checkAndUpdateReleaseAvailability(releaseId: string): Promise<OnlineAvailabilityResult> {
  const supabase = getSupabaseAdmin();

  // Get the release
  const { data: release, error } = await supabase
    .from('new_releases')
    .select('title, canonical_name')
    .eq('id', releaseId)
    .single();

  if (error || !release) {
    return { available: false, matchConfidence: 'none' };
  }

  // Check availability
  const result = await isAvailableOnline(release.title);

  // Update the release
  await supabase
    .from('new_releases')
    .update({
      available_online: result.available,
      online_price: result.price || null,
      online_url: result.url || null,
      online_sku: result.sku || null,
      online_checked_at: new Date().toISOString(),
    })
    .eq('id', releaseId);

  return result;
}

/**
 * Check availability for all releases that need checking
 * (null or > 7 days old)
 */
export async function checkAllStaleReleases(): Promise<{
  checked: number;
  availableOnline: number;
  parkExclusive: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get releases that need checking
  const { data: releases, error } = await supabase
    .from('new_releases')
    .select('id, title')
    .is('merged_into_id', null)
    .in('status', ['available', 'coming_soon'])
    .or(`online_checked_at.is.null,online_checked_at.lt.${sevenDaysAgo.toISOString()}`)
    .limit(50); // Process in batches

  if (error || !releases) {
    return {
      checked: 0,
      availableOnline: 0,
      parkExclusive: 0,
      errors: [error?.message || 'No releases to check'],
    };
  }

  let checked = 0;
  let availableOnline = 0;
  let parkExclusive = 0;
  const errors: string[] = [];

  for (const release of releases) {
    try {
      const result = await checkAndUpdateReleaseAvailability(release.id);
      checked++;

      if (result.available) {
        availableOnline++;
        console.log(`${release.title}: Available online at $${result.price}`);
      } else {
        parkExclusive++;
        console.log(`${release.title}: Park exclusive (not found online)`);
      }

      // Rate limiting - be respectful
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      errors.push(`${release.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { checked, availableOnline, parkExclusive, errors };
}
