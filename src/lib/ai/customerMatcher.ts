// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import type { Database, Park, ItemCategory } from '@/lib/database.types';

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface CustomerInterest {
  id: string;
  customer_id: string;
  category: string | null;
  park: Park | 'all' | null;
  keywords: string[] | null;
  notify_new_releases: boolean;
}

interface NewRelease {
  id: string;
  title: string;
  park: Park;
  category: ItemCategory;
  ai_tags: string[] | null;
  ai_demand_score: number | null;
}

interface CustomerMatch {
  customerId: string;
  releaseId: string;
  matchScore: number;
  matchReasons: string[];
}

export function calculateMatchScore(
  release: NewRelease,
  interest: CustomerInterest
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Park match (3 points)
  if (interest.park === 'all' || interest.park === release.park) {
    score += 3;
    if (interest.park === release.park) {
      reasons.push(`Matches preferred park: ${release.park}`);
    }
  }

  // Category match (5 points)
  if (interest.category && interest.category === release.category) {
    score += 5;
    reasons.push(`Matches category: ${release.category}`);
  }

  // Keyword matches (2 points per match, max 10)
  if (interest.keywords && interest.keywords.length > 0 && release.ai_tags) {
    const lowerTitle = release.title.toLowerCase();
    const lowerTags = release.ai_tags.map(t => t.toLowerCase());

    for (const keyword of interest.keywords) {
      const lowerKeyword = keyword.toLowerCase();

      if (lowerTitle.includes(lowerKeyword)) {
        score += 2;
        reasons.push(`Title contains: "${keyword}"`);
      } else if (lowerTags.some(tag => tag.includes(lowerKeyword) || lowerKeyword.includes(tag))) {
        score += 2;
        reasons.push(`Tag match: "${keyword}"`);
      }

      if (score >= 10) break; // Cap keyword contribution
    }
  }

  // Demand score bonus (high demand items get extra visibility)
  if (release.ai_demand_score && release.ai_demand_score >= 8) {
    score += 2;
    reasons.push('High demand item');
  }

  return { score, reasons };
}

export async function findMatchingCustomers(
  release: NewRelease
): Promise<CustomerMatch[]> {
  const supabase = getSupabaseAdmin();

  // Get all customer interests with notifications enabled
  const { data: interests, error } = await supabase
    .from('customer_interests')
    .select('*')
    .eq('notify_new_releases', true);

  if (error || !interests) {
    console.error('Error fetching customer interests:', error);
    return [];
  }

  const matches: CustomerMatch[] = [];

  for (const interest of interests) {
    const { score, reasons } = calculateMatchScore(release, interest as CustomerInterest);

    // Only include if score is above threshold (at least park match)
    if (score >= 3) {
      matches.push({
        customerId: interest.customer_id,
        releaseId: release.id,
        matchScore: score,
        matchReasons: reasons,
      });
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

export async function findMatchingReleasesForCustomer(
  customerId: string,
  limit: number = 10
): Promise<{ release: NewRelease; matchScore: number; reasons: string[] }[]> {
  const supabase = getSupabaseAdmin();

  // Get customer interests
  const { data: interests, error: interestError } = await supabase
    .from('customer_interests')
    .select('*')
    .eq('customer_id', customerId);

  if (interestError || !interests || interests.length === 0) {
    return [];
  }

  // Get recent approved releases
  const { data: releases, error: releaseError } = await supabase
    .from('new_releases')
    .select('*')
    .eq('status', 'approved')
    .order('release_date', { ascending: false })
    .limit(50);

  if (releaseError || !releases) {
    return [];
  }

  // Score each release against all customer interests
  const scoredReleases: { release: NewRelease; matchScore: number; reasons: string[] }[] = [];

  for (const release of releases) {
    let bestScore = 0;
    let bestReasons: string[] = [];

    for (const interest of interests) {
      const { score, reasons } = calculateMatchScore(
        release as NewRelease,
        interest as CustomerInterest
      );

      if (score > bestScore) {
        bestScore = score;
        bestReasons = reasons;
      }
    }

    if (bestScore > 0) {
      scoredReleases.push({
        release: release as NewRelease,
        matchScore: bestScore,
        reasons: bestReasons,
      });
    }
  }

  // Sort by score and return top matches
  return scoredReleases
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

export async function getRecommendedReleasesForAllCustomers(): Promise<
  Map<string, { release: NewRelease; matchScore: number }[]>
> {
  const supabase = getSupabaseAdmin();

  // Get all customers with interests
  const { data: interests, error } = await supabase
    .from('customer_interests')
    .select('customer_id')
    .eq('notify_new_releases', true);

  if (error || !interests) {
    return new Map();
  }

  // Get unique customer IDs
  const customerIds = [...new Set(interests.map(i => i.customer_id))];

  const recommendations = new Map<string, { release: NewRelease; matchScore: number }[]>();

  for (const customerId of customerIds) {
    const matches = await findMatchingReleasesForCustomer(customerId, 5);
    if (matches.length > 0) {
      recommendations.set(
        customerId,
        matches.map(m => ({ release: m.release, matchScore: m.matchScore }))
      );
    }
  }

  return recommendations;
}

export async function recordNotificationSent(
  releaseId: string,
  customerId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase.from('release_notifications').insert({
    release_id: releaseId,
    customer_id: customerId,
  });
}

export async function recordNotificationClicked(
  releaseId: string,
  customerId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase
    .from('release_notifications')
    .update({
      clicked: true,
      clicked_at: new Date().toISOString(),
    })
    .eq('release_id', releaseId)
    .eq('customer_id', customerId);
}

export async function recordConversion(
  releaseId: string,
  customerId: string,
  requestId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase
    .from('release_notifications')
    .update({
      converted_to_request: true,
      request_id: requestId,
    })
    .eq('release_id', releaseId)
    .eq('customer_id', customerId);
}
