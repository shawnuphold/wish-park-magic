/**
 * Local Database Search for Product Matching
 *
 * Searches the new_releases table for matching products
 * using text search and tag matching.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ProductDescription } from './describeProduct';
import type { VisionAnalysisResult } from './googleVision';

export interface LocalSearchResult {
  id: string;
  title: string;
  description: string | null;
  category: string;
  park: string;
  image_url: string | null;
  price_estimate: number | null;
  store_name: string | null;
  store_area: string | null;
  ai_tags: string[] | null;
  source_url: string | null;
  confidence: number;
  matchReason: string;
}

export interface LocalSearchResponse {
  matches: LocalSearchResult[];
  bestMatch: LocalSearchResult | null;
}

/**
 * Search the local database for matching products
 */
export async function searchLocalDatabase(
  productDescription: ProductDescription,
  visionAnalysis?: VisionAnalysisResult
): Promise<LocalSearchResponse> {
  const supabase = getSupabaseAdmin();
  const matches: LocalSearchResult[] = [];

  // Build search terms
  const searchTerms = [
    productDescription.name,
    ...productDescription.characters,
    ...productDescription.themes,
    ...productDescription.searchTerms.slice(0, 5)
  ].filter(Boolean);

  console.log('[LocalSearch] Searching with terms:', searchTerms.slice(0, 5));

  try {
    // Method 1: Full-text search on title
    for (const term of searchTerms.slice(0, 3)) {
      const { data: titleMatches } = await supabase
        .from('new_releases')
        .select('id, title, description, category, park, image_url, price_estimate, store_name, store_area, ai_tags, source_url')
        .ilike('title', `%${term}%`)
        .eq('status', 'approved')
        .limit(5);

      if (titleMatches) {
        for (const match of titleMatches) {
          if (!matches.find(m => m.id === match.id)) {
            const confidence = calculateConfidence(match, productDescription);
            matches.push({
              ...match,
              confidence,
              matchReason: `Title matches: "${term}"`
            });
          }
        }
      }
    }

    // Method 2: Tag-based search
    const tagSearchTerms = [
      ...productDescription.characters,
      ...productDescription.themes,
      productDescription.productType
    ].filter(Boolean).map(t => t.toLowerCase());

    if (tagSearchTerms.length > 0) {
      const { data: tagMatches } = await supabase
        .from('new_releases')
        .select('id, title, description, category, park, image_url, price_estimate, store_name, store_area, ai_tags, source_url')
        .eq('status', 'approved')
        .limit(20);

      if (tagMatches) {
        for (const match of tagMatches) {
          if (matches.find(m => m.id === match.id)) continue;

          const tags = (match.ai_tags || []).map((t: string) => t.toLowerCase());
          const matchingTags = tagSearchTerms.filter(term =>
            tags.some((tag: string) => tag.includes(term) || term.includes(tag))
          );

          if (matchingTags.length > 0) {
            const confidence = calculateConfidence(match, productDescription);
            matches.push({
              ...match,
              confidence,
              matchReason: `Tags match: ${matchingTags.join(', ')}`
            });
          }
        }
      }
    }

    // Method 3: Category + Park filter
    if (productDescription.estimatedPark) {
      const parkPrefix = productDescription.estimatedPark === 'disney' ? 'disney' :
                        productDescription.estimatedPark === 'universal' ? 'universal' :
                        'seaworld';

      const { data: parkMatches } = await supabase
        .from('new_releases')
        .select('id, title, description, category, park, image_url, price_estimate, store_name, store_area, ai_tags, source_url')
        .like('park', `${parkPrefix}%`)
        .eq('category', productDescription.estimatedCategory)
        .eq('status', 'approved')
        .limit(10);

      if (parkMatches) {
        for (const match of parkMatches) {
          if (matches.find(m => m.id === match.id)) continue;

          const titleLower = match.title.toLowerCase();
          const nameLower = productDescription.name.toLowerCase();

          // Check for word overlap
          const titleWords = titleLower.split(/\s+/);
          const nameWords = nameLower.split(/\s+/);
          const overlap = titleWords.filter(w => nameWords.includes(w) && w.length > 3);

          if (overlap.length >= 2) {
            const confidence = calculateConfidence(match, productDescription);
            matches.push({
              ...match,
              confidence,
              matchReason: `Park/category match with word overlap: ${overlap.join(', ')}`
            });
          }
        }
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    // Filter to only include high-confidence matches
    const filteredMatches = matches.filter(m => m.confidence >= 40);

    console.log('[LocalSearch] Found', filteredMatches.length, 'matches');

    return {
      matches: filteredMatches.slice(0, 5),
      bestMatch: filteredMatches.length > 0 && filteredMatches[0].confidence >= 60
        ? filteredMatches[0]
        : null
    };

  } catch (error) {
    console.error('[LocalSearch] Error:', error);
    return { matches: [], bestMatch: null };
  }
}

/**
 * Calculate confidence score for a database match
 */
function calculateConfidence(
  dbItem: any,
  description: ProductDescription
): number {
  let score = 0;

  const titleLower = (dbItem.title || '').toLowerCase();
  const descLower = (dbItem.description || '').toLowerCase();
  const nameLower = description.name.toLowerCase();

  // Exact title match
  if (titleLower === nameLower) {
    score += 50;
  } else if (titleLower.includes(nameLower) || nameLower.includes(titleLower)) {
    score += 35;
  }

  // Word overlap in title
  const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2);
  const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
  const wordOverlap = titleWords.filter(w => nameWords.includes(w)).length;
  score += Math.min(wordOverlap * 5, 25);

  // Character matches
  for (const char of description.characters) {
    if (titleLower.includes(char.toLowerCase()) || descLower.includes(char.toLowerCase())) {
      score += 10;
    }
  }

  // Theme matches
  for (const theme of description.themes) {
    if (titleLower.includes(theme.toLowerCase()) || descLower.includes(theme.toLowerCase())) {
      score += 8;
    }
  }

  // Product type match
  if (description.productType && dbItem.category) {
    const typeToCategory: Record<string, string[]> = {
      'popcorn_bucket': ['collectibles', 'merchandise'],
      'sipper': ['collectibles', 'merchandise'],
      'ears': ['accessories', 'merchandise'],
      'spirit_jersey': ['apparel'],
      'loungefly': ['accessories'],
      'plush': ['toys'],
      'pin': ['collectibles', 'accessories'],
      'mug': ['home_decor', 'merchandise'],
      'magicband': ['accessories', 'merchandise'],
      'apparel': ['apparel'],
      'ornament': ['home_decor', 'collectibles'],
      'toy': ['toys'],
      'bag': ['accessories']
    };

    const expectedCategories = typeToCategory[description.productType] || [];
    if (expectedCategories.includes(dbItem.category)) {
      score += 10;
    }
  }

  // Park match
  if (description.estimatedPark && dbItem.park) {
    if (dbItem.park.toLowerCase().includes(description.estimatedPark)) {
      score += 5;
    }
  }

  // Tag overlap
  const dbTags = (dbItem.ai_tags || []).map((t: string) => t.toLowerCase());
  const searchTags = [
    ...description.characters,
    ...description.themes,
    description.productType
  ].map(t => t?.toLowerCase()).filter(Boolean);

  for (const tag of searchTags) {
    if (dbTags.some((dbTag: string) => dbTag.includes(tag) || tag.includes(dbTag))) {
      score += 3;
    }
  }

  return Math.min(score, 100);
}
