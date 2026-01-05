/**
 * Google Lens API via SerpApi
 *
 * Uses SerpApi's Google Lens endpoint for visual product search.
 * Much more accurate than Google Vision for finding exact product matches.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface LensMatch {
  title: string;
  link: string;
  source: string;
  price?: { value: string; extracted_value: number; currency: string };
  thumbnail?: string;
}

export interface GoogleLensResult {
  visualMatches: LensMatch[];
  success: boolean;
  error?: string;
  usageInfo?: { used: number; limit: number };
}

/**
 * Get SerpApi usage for the current month
 */
export async function getSerpApiUsageThisMonth(): Promise<{ used: number; limit: number }> {
  try {
    const supabase = getSupabaseAdmin();

    // Get usage count from settings
    const { data: usageSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'serpapi_usage_count')
      .single();

    const { data: limitSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'serpapi_monthly_limit')
      .single();

    // Parse values - handle both quoted and unquoted formats
    const parseValue = (val: string | null): number => {
      if (!val) return 0;
      const cleaned = val.replace(/^"|"$/g, '');
      return parseInt(cleaned) || 0;
    };

    return {
      used: parseValue(usageSetting?.value),
      limit: parseValue(limitSetting?.value) || 250
    };
  } catch (e) {
    console.error('[Lens] Failed to get usage:', e);
    return { used: 0, limit: 250 };
  }
}

/**
 * Increment SerpApi usage counter
 */
async function incrementUsage(): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { used } = await getSerpApiUsageThisMonth();

    await supabase
      .from('settings')
      .update({
        value: String(used + 1),
        updated_at: new Date().toISOString()
      })
      .eq('key', 'serpapi_usage_count');
  } catch (e) {
    console.error('[Lens] Failed to increment usage:', e);
  }
}

/**
 * Reset usage counter (call at start of each month)
 */
export async function resetMonthlyUsage(): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from('settings')
      .update({
        value: '0',
        updated_at: new Date().toISOString()
      })
      .eq('key', 'serpapi_usage_count');
    console.log('[Lens] Monthly usage reset');
  } catch (e) {
    console.error('[Lens] Failed to reset usage:', e);
  }
}

/**
 * Search Google Lens using SerpApi
 * @param imageUrl - URL of the image to search (must be publicly accessible)
 */
export async function searchGoogleLens(imageUrl: string): Promise<GoogleLensResult> {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    console.log('[Lens] No SERPAPI_KEY configured');
    return { visualMatches: [], success: false, error: 'No API key configured' };
  }

  // Check usage limit
  const usage = await getSerpApiUsageThisMonth();
  if (usage.used >= usage.limit) {
    console.log(`[Lens] Monthly limit reached (${usage.used}/${usage.limit})`);
    return {
      visualMatches: [],
      success: false,
      error: 'Monthly limit reached',
      usageInfo: usage
    };
  }

  try {
    console.log(`[Lens] Searching with image URL: ${imageUrl}`);
    console.log(`[Lens] Usage: ${usage.used + 1}/${usage.limit} this month`);

    const searchUrl = new URL('https://serpapi.com/search.json');
    searchUrl.searchParams.set('engine', 'google_lens');
    searchUrl.searchParams.set('url', imageUrl);
    searchUrl.searchParams.set('api_key', apiKey);

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    if (data.error) {
      console.error('[Lens] API Error:', data.error);
      return {
        visualMatches: [],
        success: false,
        error: data.error,
        usageInfo: usage
      };
    }

    // Increment usage counter on successful request
    await incrementUsage();

    const matches = data.visual_matches || [];
    console.log(`[Lens] Found ${matches.length} visual matches`);

    // Log first few matches for debugging
    if (matches.length > 0) {
      console.log('[Lens] Top matches:');
      matches.slice(0, 3).forEach((m: any, i: number) => {
        console.log(`  ${i + 1}. ${m.title} (${m.source})`);
      });
    }

    return {
      visualMatches: matches.map((m: any) => ({
        title: m.title || '',
        link: m.link || '',
        source: m.source || '',
        price: m.price,
        thumbnail: m.thumbnail,
      })),
      success: true,
      usageInfo: { used: usage.used + 1, limit: usage.limit }
    };
  } catch (error) {
    console.error('[Lens] Error:', error);
    return {
      visualMatches: [],
      success: false,
      error: error instanceof Error ? error.message : String(error),
      usageInfo: usage
    };
  }
}

/**
 * Find the best Disney-related match from Lens results
 * Prioritizes Disney blogs, ShopDisney, and known theme park sources
 * Returns null if no suitable match found (better than garbage)
 */
export function findDisneyMatch(matches: LensMatch[]): LensMatch | null {
  if (matches.length === 0) return null;

  // Log top 5 matches for debugging
  console.log('[Lens] Top 5 raw matches:');
  matches.slice(0, 5).forEach((m, i) => {
    console.log(`  ${i + 1}. "${m.title}" (${m.source})`);
  });

  // AGGRESSIVE filtering - filter out garbage first
  const filteredMatches = matches.filter(m => {
    const title = (m.title || '').toLowerCase();
    const source = (m.source || '').toLowerCase();
    const link = (m.link || '').toLowerCase();

    // Skip Reddit posts
    if (link.includes('reddit.com') || source.includes('reddit') || title.includes('r/') || title.includes(': r/')) {
      console.log('[Lens] SKIP Reddit:', title.substring(0, 40));
      return false;
    }

    // Skip social media (unless title has product keywords)
    const socialPlatforms = ['instagram', 'facebook', 'twitter', 'tiktok', 'pinterest', 'tumblr'];
    if (socialPlatforms.some(p => source.includes(p) || link.includes(p))) {
      const productKeywords = ['jersey', 'fleece', 'jacket', 'shirt', 'hoodie', 'ears', 'loungefly', 'spirit', 'disney'];
      if (!productKeywords.some(kw => title.includes(kw))) {
        console.log('[Lens] SKIP social:', title.substring(0, 40));
        return false;
      }
    }

    // Skip obvious non-products (questions, complaints, warnings)
    const skipPhrases = [
      'scam', 'warning', 'sold me', 'next steps', 'help', 'question', 'advice',
      'hole in it', 'broken', 'fake', 'parking', 'refund', 'return', 'complaint',
      'what should', 'how do i', 'is this', 'anyone know', 'looking for'
    ];
    if (skipPhrases.some(phrase => title.includes(phrase))) {
      console.log('[Lens] SKIP non-product:', title.substring(0, 40));
      return false;
    }

    // Skip if title is too short (likely a username or gibberish)
    if (title.length < 10) {
      console.log('[Lens] SKIP short title:', title);
      return false;
    }

    // Skip if title looks like a person's name (2-3 words, no product keywords)
    const words = title.split(/\s+/);
    if (words.length <= 3) {
      const productIndicators = ['disney', 'jersey', 'fleece', 'jacket', 'shirt', 'hoodie', 'ears', 'bag', 'mug', 'pin'];
      if (!productIndicators.some(pi => title.includes(pi))) {
        // Looks like a name - only keep if from commerce site
        const commerceSites = ['amazon', 'ebay', 'mercari', 'poshmark', 'etsy', 'shop', 'store'];
        if (!commerceSites.some(s => link.includes(s))) {
          console.log('[Lens] SKIP name-like:', title);
          return false;
        }
      }
    }

    return true;
  });

  console.log(`[Lens] Filtered: ${matches.length} → ${filteredMatches.length} valid matches`);

  // Priority 1: Disney blog sources (most likely to have accurate names)
  const disneyBlogs = [
    'wdwnt.com',
    'blogmickey.com',
    'disneyfoodblog.com',
    'laughingplace.com',
    'allears.net',
    'themeparkinsider.com',
    'wdwinfo.com',
    'orlandoparksnews.com',
    'chipandco.com'
  ];

  const blogMatch = filteredMatches.find(m =>
    disneyBlogs.some(domain => m.link?.includes(domain))
  );
  if (blogMatch) {
    console.log('[Lens] Found Disney blog match:', blogMatch.title, '-', blogMatch.source);
    return blogMatch;
  }

  // Priority 2: ShopDisney (official source)
  const shopDisneyMatch = filteredMatches.find(m =>
    m.link?.includes('shopdisney.com')
  );
  if (shopDisneyMatch) {
    console.log('[Lens] Found ShopDisney match:', shopDisneyMatch.title);
    return shopDisneyMatch;
  }

  // Priority 3: Any Disney-related title keywords
  const disneyKeywords = [
    'disney', 'spirit jersey', 'magic kingdom', 'epcot', 'animal kingdom',
    'hollywood studios', 'mickey', 'minnie', 'walt disney', 'wdw',
    'loungefly', 'ears headband', 'park exclusive'
  ];

  const disneyMatch = filteredMatches.find(m => {
    const title = m.title?.toLowerCase() || '';
    return disneyKeywords.some(kw => title.includes(kw));
  });
  if (disneyMatch) {
    console.log('[Lens] Found Disney keyword match:', disneyMatch.title);
    return disneyMatch;
  }

  // Priority 4: E-commerce sites (likely product listings)
  const commerceSites = ['amazon.com', 'ebay.com', 'mercari.com', 'poshmark.com', 'etsy.com'];
  const commerceMatch = filteredMatches.find(m =>
    commerceSites.some(site => m.link?.includes(site))
  );
  if (commerceMatch) {
    console.log('[Lens] Found commerce match:', commerceMatch.title, '-', commerceMatch.source);
    return commerceMatch;
  }

  // Priority 5: Any match with product-like words in title
  const productWords = ['jersey', 'fleece', 'jacket', 'hoodie', 'sweater', 'shirt', 'dress',
    'bag', 'backpack', 'tote', 'ears', 'headband', 'mug', 'tumbler', 'cup',
    'pin', 'plush', 'toy', 'figure', 'ornament', 'keychain'];

  const productMatch = filteredMatches.find(m => {
    const title = m.title?.toLowerCase() || '';
    return productWords.some(pw => title.includes(pw));
  });
  if (productMatch) {
    console.log('[Lens] Found product word match:', productMatch.title);
    return productMatch;
  }

  // NO FALLBACK - return null if nothing good found
  // Better to use Claude's description than garbage
  console.log('[Lens] No suitable match found in', matches.length, 'results - returning null');
  return null;
}

/**
 * Find Disney blog article URL from Lens results
 * Prioritizes high-quality Disney news sources over product listings
 * Returns null if no suitable article found
 *
 * IMPORTANT: Only returns actual article URLs, not homepages or category pages
 */
export function findDisneyArticleUrl(matches: LensMatch[]): string | null {
  if (matches.length === 0) return null;

  // Disney blog domains in priority order
  const disneyBlogs = [
    'wdwnt.com',
    'blogmickey.com',
    'disneyfoodblog.com',
    'laughingplace.com',
    'allears.net',
    'themeparkinsider.com',
    'wdwinfo.com',
    'orlandoparksnews.com',
    'chipandco.com',
    'attractionsmagazine.com',
    'insidethemagic.net'
  ];

  // Find first match from a Disney blog that looks like an article URL
  for (const match of matches) {
    const link = match.link || '';

    for (const domain of disneyBlogs) {
      if (link.includes(domain)) {
        // Check if this looks like an actual article URL (not homepage/category)
        // Article URLs typically have year patterns like /2024/ or /2025/
        // or paths like /news/, /article/, /merchandise/
        const isArticleUrl =
          /\/20\d\d\//.test(link) ||  // Year pattern like /2024/ or /2025/
          link.includes('/news/') ||
          link.includes('/article/') ||
          link.includes('/merchandise/') ||
          link.includes('/photos-') ||
          link.includes('/review-') ||
          link.includes('/first-look-') ||
          link.includes('/new-') ||
          // Most blog URLs have 4+ path segments for articles
          (link.split('/').filter(s => s.length > 0).length >= 4);

        // Skip if it's just the homepage or a very short URL
        const isHomepage = link.replace(/\/$/, '').endsWith(domain) ||
          link.split('/').filter(s => s.length > 0).length <= 2;

        if (isArticleUrl && !isHomepage) {
          console.log(`[Lens] Found Disney article: ${link}`);
          return link;
        } else {
          console.log(`[Lens] Skipping non-article URL: ${link}`);
        }
      }
    }
  }

  console.log('[Lens] No Disney blog article found in results');
  return null;
}

/**
 * Extract product name from a Lens match
 * Cleans up common patterns in titles
 */
export function extractProductName(match: LensMatch): string {
  let title = match.title || '';

  // Remove common suffixes/prefixes
  title = title
    .replace(/\s*-\s*(ShopDisney|Disney Store|eBay|Mercari).*$/i, '')
    .replace(/\s*\|\s*.*$/, '')
    .replace(/^(New|NWT|NWOT|Rare|HTF|Sold Out)\s+/i, '')
    .replace(/\s+(Size|Sz)\s+\w+$/i, '')
    .replace(/\s+\d+\/\d+.*$/, '') // Remove dates like 1/15
    .trim();

  return title;
}
