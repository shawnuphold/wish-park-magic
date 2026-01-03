/**
 * Release Matching for Telegram Bot
 *
 * Matches product names from screenshots to existing releases in the database.
 * Uses multiple matching strategies: exact match, word overlap, and category matching.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

interface ReleaseMatch {
  id: string;
  title: string;
  price_estimate: number | null;
  ai_demand_score: number | null;
  is_limited_edition: boolean;
  image_url: string;
}

interface MatchResult {
  found: boolean;
  release?: ReleaseMatch;
  confidence: number;
}

/**
 * Normalize a string for matching
 * - Lowercase
 * - Remove special characters
 * - Normalize whitespace
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract meaningful words from a string (filter out common words)
 */
function extractWords(str: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'new', 'now', 'just', 'only', 'also', 'very', 'even', 'back', 'any',
    'item', 'items', 'product', 'products', 'disney', 'park', 'parks'
  ]);

  return normalize(str)
    .split(' ')
    .filter(word => word.length > 1 && !stopWords.has(word));
}

/**
 * Calculate word overlap percentage between two strings
 * Returns a value between 0 and 1
 */
function calculateWordOverlap(str1: string, str2: string): number {
  const words1 = new Set(extractWords(str1));
  const words2 = new Set(extractWords(str2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let matchCount = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      matchCount++;
    } else {
      // Check for partial matches (one word contains another)
      for (const w2 of words2) {
        if (word.includes(w2) || w2.includes(word)) {
          matchCount += 0.5;
          break;
        }
      }
    }
  }

  // Use the smaller set as the denominator for more accurate overlap
  const minSize = Math.min(words1.size, words2.size);
  return matchCount / minSize;
}

/**
 * Find matching release from the new_releases database
 *
 * Search order:
 * 1. Exact normalized title match (confidence: 1.0)
 * 2. High word overlap >= 70% (confidence: 0.8-0.95)
 * 3. Same category + 50% word overlap (confidence: 0.6-0.75)
 * 4. Any 40%+ word overlap (confidence: 0.4-0.55)
 */
export async function findMatchingRelease(
  productName: string,
  category?: string
): Promise<MatchResult> {
  const supabase = getSupabaseAdmin();
  const normalizedSearch = normalize(productName);
  const searchWords = extractWords(productName);

  // Fetch releases from last 6 months (more likely to be relevant)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: releases, error } = await supabase
    .from('new_releases')
    .select('id, title, canonical_name, price_estimate, ai_demand_score, is_limited_edition, image_url, category')
    .gte('created_at', sixMonthsAgo.toISOString())
    .is('merged_into_id', null) // Only non-merged releases
    .order('created_at', { ascending: false });

  if (error || !releases || releases.length === 0) {
    return { found: false, confidence: 0 };
  }

  let bestMatch: ReleaseMatch | null = null;
  let bestConfidence = 0;

  for (const release of releases) {
    const releaseTitle = release.canonical_name || release.title;
    const normalizedTitle = normalize(releaseTitle);

    // 1. Exact match check
    if (normalizedTitle === normalizedSearch) {
      return {
        found: true,
        release: {
          id: release.id,
          title: release.title,
          price_estimate: release.price_estimate,
          ai_demand_score: release.ai_demand_score,
          is_limited_edition: release.is_limited_edition,
          image_url: release.image_url
        },
        confidence: 1.0
      };
    }

    // 2. Calculate word overlap
    const overlap = calculateWordOverlap(productName, releaseTitle);

    let confidence = 0;

    if (overlap >= 0.7) {
      // High overlap: 0.8-0.95 confidence
      confidence = 0.8 + (overlap - 0.7) * 0.5;
    } else if (overlap >= 0.5 && category && release.category === category) {
      // Same category with moderate overlap: 0.6-0.75 confidence
      confidence = 0.6 + (overlap - 0.5) * 0.75;
    } else if (overlap >= 0.4) {
      // Lower overlap: 0.4-0.55 confidence
      confidence = 0.4 + (overlap - 0.4) * 0.5;
    }

    // Boost confidence for limited editions (they're more distinctive)
    if (release.is_limited_edition && confidence > 0.3) {
      confidence = Math.min(confidence + 0.05, 0.95);
    }

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = {
        id: release.id,
        title: release.title,
        price_estimate: release.price_estimate,
        ai_demand_score: release.ai_demand_score,
        is_limited_edition: release.is_limited_edition,
        image_url: release.image_url
      };
    }
  }

  // Only return a match if confidence is above threshold
  if (bestMatch && bestConfidence >= 0.4) {
    return {
      found: true,
      release: bestMatch,
      confidence: Math.round(bestConfidence * 100) / 100
    };
  }

  return { found: false, confidence: 0 };
}
