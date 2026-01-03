// Type checking enabled
/**
 * shopDisney Internal Tracker
 *
 * INTERNAL USE ONLY - This data is for admin reference.
 * NEVER expose shopDisney as a source to customers.
 * NEVER link to shopDisney URLs publicly.
 * NEVER use their images for public display.
 *
 * Purpose: Track what's available online vs park exclusive
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { generateCanonicalName } from '../ai/deduplication';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface ShopDisneyProduct {
  sku: string;
  name: string;
  canonical_name: string;
  price: number | null;
  url: string;
  image_url: string | null;
  availability_status: 'in_stock' | 'out_of_stock' | 'pre_order';
}

interface ScrapeResult {
  products: ShopDisneyProduct[];
  pagesScraped: number;
  errors: string[];
}

const SHOPDISNEY_NEW_URL = 'https://www.shopdisney.com/new/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Launch browser with stealth settings
 */
async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });
}

/**
 * Setup page with stealth mode and proper headers
 */
async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  await page.setUserAgent(USER_AGENT);
  await page.setViewport({ width: 1920, height: 1080 });

  // Block images and unnecessary resources for faster scraping
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['font', 'stylesheet'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  return page;
}

/**
 * Extract products from a single page
 */
async function extractProductsFromPage(page: Page): Promise<ShopDisneyProduct[]> {
  return page.evaluate(() => {
    const products: ShopDisneyProduct[] = [];

    // shopDisney uses product tiles with data attributes
    const productTiles = document.querySelectorAll('[data-product-id], .product-tile, .product-card');

    productTiles.forEach((tile) => {
      try {
        // Try to extract product info from various possible structures
        const nameEl = tile.querySelector('.product-name, .product-title, [data-test="product-name"], h3, h4');
        const priceEl = tile.querySelector('.product-price, .price, [data-test="product-price"], .sales-price');
        const linkEl = tile.querySelector('a[href*="/product/"], a[href*="/p/"]') as HTMLAnchorElement;
        const imageEl = tile.querySelector('img[src], img[data-src]') as HTMLImageElement;
        const skuEl = tile.querySelector('[data-product-id], [data-sku]');

        const name = nameEl?.textContent?.trim();
        if (!name) return;

        const priceText = priceEl?.textContent?.trim();
        const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;

        const url = linkEl?.href || '';
        const imageUrl = imageEl?.src || imageEl?.getAttribute('data-src') || null;
        const sku = skuEl?.getAttribute('data-product-id') ||
                   skuEl?.getAttribute('data-sku') ||
                   url.split('/').pop()?.split('?')[0] ||
                   `sd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Check availability
        const outOfStock = tile.querySelector('.out-of-stock, .sold-out, [data-availability="out-of-stock"]');
        const preOrder = tile.querySelector('.pre-order, [data-availability="pre-order"]');

        let availability_status: 'in_stock' | 'out_of_stock' | 'pre_order' = 'in_stock';
        if (outOfStock) availability_status = 'out_of_stock';
        if (preOrder) availability_status = 'pre_order';

        products.push({
          sku,
          name,
          canonical_name: '', // Will be generated server-side
          price: isNaN(price!) ? null : price,
          url,
          image_url: imageUrl,
          availability_status,
        });
      } catch {
        // Skip products that can't be parsed
      }
    });

    return products;
  });
}

/**
 * Get total number of pages available
 */
async function getTotalPages(page: Page): Promise<number> {
  try {
    const totalPages = await page.evaluate(() => {
      // Look for pagination
      const paginationLinks = document.querySelectorAll('.pagination a, [data-page], .page-number');
      let maxPage = 1;

      paginationLinks.forEach((link) => {
        const pageNum = parseInt(link.textContent || '0', 10);
        if (!isNaN(pageNum) && pageNum > maxPage) {
          maxPage = pageNum;
        }
      });

      // Also check for "X of Y" text
      const totalText = document.querySelector('.results-count, .total-results');
      if (totalText) {
        const match = totalText.textContent?.match(/of\s+(\d+)/i);
        if (match) {
          const total = parseInt(match[1], 10);
          const perPage = 24; // typical products per page
          maxPage = Math.ceil(total / perPage);
        }
      }

      return Math.min(maxPage, 20); // Cap at 20 pages to be reasonable
    });

    return totalPages;
  } catch {
    return 1;
  }
}

/**
 * Scrape all new products from shopDisney
 */
export async function scrapeShopDisneyNew(maxPages: number = 10): Promise<ScrapeResult> {
  const products: ShopDisneyProduct[] = [];
  const errors: string[] = [];
  let pagesScraped = 0;

  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await setupPage(browser);

    // Load first page
    console.log('Loading shopDisney new arrivals...');
    await page.goto(SHOPDISNEY_NEW_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for products to load
    await page.waitForSelector('[data-product-id], .product-tile, .product-card', { timeout: 10000 })
      .catch(() => console.log('Product selector not found, trying to continue...'));

    const totalPages = await getTotalPages(page);
    const pagesToScrape = Math.min(totalPages, maxPages);

    console.log(`Found ${totalPages} pages, scraping ${pagesToScrape}...`);

    // Scrape first page
    const firstPageProducts = await extractProductsFromPage(page);
    products.push(...firstPageProducts);
    pagesScraped++;
    console.log(`Page 1: Found ${firstPageProducts.length} products`);

    // Scrape additional pages
    for (let pageNum = 2; pageNum <= pagesToScrape; pageNum++) {
      try {
        const pageUrl = `${SHOPDISNEY_NEW_URL}?page=${pageNum}`;
        await page.goto(pageUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await page.waitForSelector('[data-product-id], .product-tile, .product-card', { timeout: 10000 })
          .catch(() => {});

        const pageProducts = await extractProductsFromPage(page);
        products.push(...pageProducts);
        pagesScraped++;
        console.log(`Page ${pageNum}: Found ${pageProducts.length} products`);

        // Rate limiting - be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        errors.push(`Page ${pageNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

  } catch (error) {
    errors.push(`Scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Generate canonical names for all products
  const productsWithCanonical = products.map(p => ({
    ...p,
    canonical_name: generateCanonicalName(p.name),
  }));

  return {
    products: productsWithCanonical,
    pagesScraped,
    errors,
  };
}

/**
 * Save scraped products to database and match with existing releases
 */
export async function saveAndMatchProducts(products: ShopDisneyProduct[]): Promise<{
  saved: number;
  matched: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();
  let saved = 0;
  let matched = 0;
  const errors: string[] = [];

  for (const product of products) {
    try {
      // Upsert to shopdisney_products table
      const { error: upsertError } = await supabase
        .from('shopdisney_products')
        .upsert({
          sku: product.sku,
          name: product.name,
          canonical_name: product.canonical_name,
          price: product.price,
          url: product.url,
          image_url: product.image_url,
          availability_status: product.availability_status,
          last_checked_at: new Date().toISOString(),
        }, {
          onConflict: 'sku',
        });

      if (upsertError) {
        errors.push(`Upsert ${product.sku}: ${upsertError.message}`);
        continue;
      }
      saved++;

      // Try to match with existing releases
      const { data: matchedRelease } = await supabase
        .from('new_releases')
        .select('id, title')
        .eq('canonical_name', product.canonical_name)
        .is('merged_into_id', null)
        .single();

      if (matchedRelease) {
        // Update the release with online availability info
        await supabase
          .from('new_releases')
          .update({
            available_online: product.availability_status === 'in_stock',
            online_price: product.price,
            online_url: product.url,
            online_sku: product.sku,
            online_checked_at: new Date().toISOString(),
          })
          .eq('id', matchedRelease.id);

        // Link the product to the release
        await supabase
          .from('shopdisney_products')
          .update({ matched_release_id: matchedRelease.id })
          .eq('sku', product.sku);

        matched++;
        console.log(`Matched: "${product.name}" → "${matchedRelease.title}"`);
      }

    } catch (error) {
      errors.push(`Process ${product.sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { saved, matched, errors };
}

/**
 * Create new releases from unmatched shopDisney products
 * Only for products that are in_stock and not matched to any release
 */
export async function createReleasesFromUnmatched(): Promise<{
  created: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();
  let created = 0;
  const errors: string[] = [];

  // Find unmatched products that are in stock
  const { data: unmatchedProducts, error: fetchError } = await supabase
    .from('shopdisney_products')
    .select('*')
    .is('matched_release_id', null)
    .eq('availability_status', 'in_stock');

  if (fetchError || !unmatchedProducts) {
    return { created: 0, errors: [fetchError?.message || 'No unmatched products'] };
  }

  for (const product of unmatchedProducts) {
    try {
      // Create new release
      const { data: newRelease, error: createError } = await supabase
        .from('new_releases')
        .insert({
          title: product.name,
          description: null,
          image_url: '', // Don't use shopDisney images publicly
          source_url: '', // Never expose shopDisney URL
          source: 'Internal Discovery', // Generic source
          park: 'disney',
          category: 'other',
          release_date: new Date().toISOString(),
          status: 'available',
          canonical_name: product.canonical_name,
          available_online: true,
          online_price: product.price,
          online_url: product.url,
          online_sku: product.sku,
          online_checked_at: new Date().toISOString(),
          is_limited_edition: false,
          is_featured: false,
        })
        .select('id')
        .single();

      if (createError) {
        errors.push(`Create release for ${product.sku}: ${createError.message}`);
        continue;
      }

      if (newRelease) {
        // Link product to release
        await supabase
          .from('shopdisney_products')
          .update({ matched_release_id: newRelease.id })
          .eq('sku', product.sku);

        created++;
      }

    } catch (error) {
      errors.push(`Create ${product.sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { created, errors };
}

/**
 * Full scrape and process pipeline
 */
export async function runFullShopDisneyScrape(): Promise<{
  productsScraped: number;
  productsSaved: number;
  releasesMatched: number;
  releasesCreated: number;
  errors: string[];
}> {
  console.log('Starting shopDisney scrape...');

  // Step 1: Scrape products
  const scrapeResult = await scrapeShopDisneyNew(10);
  console.log(`Scraped ${scrapeResult.products.length} products from ${scrapeResult.pagesScraped} pages`);

  if (scrapeResult.products.length === 0) {
    return {
      productsScraped: 0,
      productsSaved: 0,
      releasesMatched: 0,
      releasesCreated: 0,
      errors: [...scrapeResult.errors, 'No products found'],
    };
  }

  // Step 2: Save and match products
  const saveResult = await saveAndMatchProducts(scrapeResult.products);
  console.log(`Saved ${saveResult.saved} products, matched ${saveResult.matched} releases`);

  // Step 3: Create releases from unmatched (optional - uncomment if desired)
  // const createResult = await createReleasesFromUnmatched();
  // console.log(`Created ${createResult.created} new releases`);

  return {
    productsScraped: scrapeResult.products.length,
    productsSaved: saveResult.saved,
    releasesMatched: saveResult.matched,
    releasesCreated: 0, // createResult.created
    errors: [...scrapeResult.errors, ...saveResult.errors],
  };
}
