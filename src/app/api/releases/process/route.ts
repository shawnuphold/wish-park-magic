import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { processAllSources, processFeedSource } from '@/lib/ai/feedFetcher';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { timingSafeEqual } from 'crypto';

/**
 * Timing-safe API key comparison to prevent timing attacks.
 * Returns true only if both keys exist and match.
 */
function isValidCronApiKey(providedKey: string | null): boolean {
  const expectedKey = process.env.CRON_API_KEY;

  // Both must be present
  if (!providedKey || !expectedKey) {
    return false;
  }

  // Keys must be the same length for timingSafeEqual
  // If lengths differ, they can't match anyway
  if (providedKey.length !== expectedKey.length) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedKey);
  const expectedBuffer = Buffer.from(expectedKey);

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

// POST /api/releases/process - Trigger feed processing (admin or cron)
export async function POST(request: NextRequest) {
  // Check for cron API key first (timing-safe comparison)
  const apiKey = request.headers.get('x-api-key');
  const isValidApiKey = isValidCronApiKey(apiKey);

  // If no valid API key, require admin auth
  if (!isValidApiKey) {
    const auth = await requireAdminAuth();
    if (!auth.success) return auth.response;
  }

  const body = await request.json().catch(() => ({}));
  const sourceId = body.sourceId;

  try {
    if (sourceId) {
      // Process specific source
      const supabase = getSupabaseAdmin();
      const { data: source, error } = await supabase
        .from('feed_sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error || !source) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }

      const result = await processFeedSource(source as Parameters<typeof processFeedSource>[0]);

      return NextResponse.json({
        success: true,
        sourceName: source.name,
        articlesProcessed: result.articlesProcessed,
        itemsCreated: result.itemsCreated,
        errors: result.errors,
      });
    }

    // Process all sources
    const result = await processAllSources();

    return NextResponse.json({
      success: true,
      sourcesProcessed: result.sourcesProcessed,
      totalArticles: result.totalArticles,
      totalItems: result.totalItems,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error processing feeds:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

// GET /api/releases/process - Get processing status/stats (admin only)
export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const supabase = getSupabaseAdmin();

  // Get recent processing stats
  const { data: recentArticles } = await supabase
    .from('processed_articles')
    .select('*')
    .order('processed_at', { ascending: false })
    .limit(20);

  const { data: sources } = await supabase
    .from('feed_sources')
    .select('*')
    .eq('is_active', true);

  const { count: pendingCount } = await supabase
    .from('new_releases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: todayCount } = await supabase
    .from('new_releases')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date().toISOString().split('T')[0]);

  return NextResponse.json({
    sources: sources || [],
    recentArticles: recentArticles || [],
    stats: {
      pendingReview: pendingCount || 0,
      addedToday: todayCount || 0,
      activeSources: sources?.length || 0,
    },
  });
}
