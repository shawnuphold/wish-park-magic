// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import type { Database, ReleaseStatus, RELEASE_STATUS_ORDER } from '@/lib/database.types';

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Status progression order
const STATUS_ORDER: ReleaseStatus[] = ['rumored', 'announced', 'coming_soon', 'available', 'sold_out'];

/**
 * Generate a canonical name for deduplication matching
 * "Mickey Mouse 50th Anniversary Spirit Jersey" → "mickey-50th-spirit-jersey"
 */
export function generateCanonicalName(productName: string): string {
  return productName
    .toLowerCase()
    // Remove special characters except spaces and hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Normalize common terms
    .replace(/anniversary/g, '')
    .replace(/edition/g, '')
    .replace(/limited/g, '')
    .replace(/exclusive/g, '')
    .replace(/disney/g, '')
    .replace(/world/g, '')
    .replace(/parks?/g, '')
    .replace(/walt/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
    // Replace spaces with hyphens
    .replace(/\s/g, '-')
    // Remove multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '');
}

interface SimilarRelease {
  id: string;
  title: string;
  canonical_name: string | null;
  similarity: number;
}

/**
 * Find an existing release that matches this product
 * Returns the release ID if found, null if this is a new product
 */
export async function findExistingRelease(
  name: string,
  canonicalName: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  // First, try exact canonical name match
  const { data: exactMatch } = await supabase
    .from('new_releases')
    .select('id')
    .eq('canonical_name', canonicalName)
    .is('merged_into_id', null)
    .single();

  if (exactMatch) {
    return exactMatch.id;
  }

  // Then try fuzzy matching using the RPC function
  const { data: fuzzyMatches, error } = await supabase
    .rpc('find_similar_release', {
      search_title: name,
      search_canonical: canonicalName,
      similarity_threshold: 0.7
    });

  if (error) {
    console.error('Error finding similar release:', error);
    // Fallback to a simpler query if the RPC fails
    const { data: fallback } = await supabase
      .from('new_releases')
      .select('id, title, canonical_name')
      .is('merged_into_id', null)
      .ilike('title', `%${name.split(' ').slice(0, 3).join('%')}%`)
      .limit(1);

    if (fallback && fallback.length > 0) {
      return fallback[0].id;
    }
    return null;
  }

  if (fuzzyMatches && fuzzyMatches.length > 0) {
    // Return the best match
    return (fuzzyMatches as SimilarRelease[])[0].id;
  }

  return null;
}

interface ArticleSource {
  url: string;
  name: string;
  title?: string;
  snippet?: string;
}

/**
 * Add a source article to an existing release
 */
export async function addSourceToRelease(
  releaseId: string,
  source: ArticleSource
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('release_article_sources')
    .upsert({
      release_id: releaseId,
      source_url: source.url,
      source_name: source.name,
      article_title: source.title || null,
      snippet: source.snippet || null,
    }, {
      onConflict: 'release_id,source_url'
    });

  if (error) {
    console.error('Error adding source to release:', error);
    return false;
  }

  return true;
}

interface StatusUpdateDates {
  projected_release_date?: string;
  actual_release_date?: string;
  sold_out_date?: string;
}

/**
 * Update the status of a release (only allows forward progression)
 */
export async function updateReleaseStatus(
  releaseId: string,
  newStatus: ReleaseStatus,
  dates?: StatusUpdateDates
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Get current status
  const { data: current } = await supabase
    .from('new_releases')
    .select('status')
    .eq('id', releaseId)
    .single();

  if (!current) {
    console.error('Release not found:', releaseId);
    return false;
  }

  const currentIndex = STATUS_ORDER.indexOf(current.status as ReleaseStatus);
  const newIndex = STATUS_ORDER.indexOf(newStatus);

  // Only allow forward progression (or same status for date updates)
  if (newIndex < currentIndex) {
    console.log(`Status cannot go backward: ${current.status} → ${newStatus}`);
    return false;
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
  };

  // Set appropriate dates
  if (dates?.projected_release_date) {
    updateData.projected_release_date = dates.projected_release_date;
  }
  if (dates?.actual_release_date) {
    updateData.actual_release_date = dates.actual_release_date;
  }
  if (dates?.sold_out_date) {
    updateData.sold_out_date = dates.sold_out_date;
  }

  // Auto-set dates based on status if not provided
  if (newStatus === 'available' && !dates?.actual_release_date) {
    updateData.actual_release_date = new Date().toISOString().split('T')[0];
  }
  if (newStatus === 'sold_out' && !dates?.sold_out_date) {
    updateData.sold_out_date = new Date().toISOString().split('T')[0];
  }

  const { error } = await supabase
    .from('new_releases')
    .update(updateData)
    .eq('id', releaseId);

  if (error) {
    console.error('Error updating release status:', error);
    return false;
  }

  return true;
}

/**
 * Merge two releases (source into target)
 */
export async function mergeReleases(
  sourceId: string,
  targetId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Use the database function
  const { error } = await supabase.rpc('merge_releases', {
    source_release_id: sourceId,
    target_release_id: targetId
  });

  if (error) {
    console.error('Error merging releases:', error);
    return false;
  }

  return true;
}

/**
 * Get all article sources for a release
 */
export async function getReleaseSources(releaseId: string): Promise<ArticleSource[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('release_article_sources')
    .select('source_url, source_name, article_title, snippet')
    .eq('release_id', releaseId)
    .order('discovered_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(s => ({
    url: s.source_url,
    name: s.source_name || 'Unknown',
    title: s.article_title || undefined,
    snippet: s.snippet || undefined,
  }));
}

/**
 * Find potential duplicate releases for manual review
 */
export async function findPotentialDuplicates(releaseId: string): Promise<SimilarRelease[]> {
  const supabase = getSupabaseAdmin();

  // Get the release
  const { data: release } = await supabase
    .from('new_releases')
    .select('title, canonical_name')
    .eq('id', releaseId)
    .single();

  if (!release) {
    return [];
  }

  // Find similar releases
  const { data: matches } = await supabase
    .rpc('find_similar_release', {
      search_title: release.title,
      search_canonical: release.canonical_name,
      similarity_threshold: 0.5 // Lower threshold for suggestions
    });

  if (!matches) {
    return [];
  }

  // Filter out the current release
  return (matches as SimilarRelease[]).filter(m => m.id !== releaseId);
}
