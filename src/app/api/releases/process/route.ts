// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { processAllSources, processFeedSource } from '@/lib/ai/feedFetcher';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/releases/process - Trigger feed processing
export async function POST(request: NextRequest) {
  // Check for API key (for cron jobs) or auth
  const apiKey = request.headers.get('x-api-key');
  const isValidApiKey = apiKey === process.env.CRON_API_KEY;

  if (!isValidApiKey) {
    // For web requests, we'll just allow it for now (add auth check later)
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sourceId = body.sourceId;

  try {
    if (sourceId) {
      // Process specific source
      const supabase = getSupabaseAdmin();
      const { data: source, error } = await supabase
        .from('release_sources')
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

// GET /api/releases/process - Get processing status/stats
export async function GET() {
  const supabase = getSupabaseAdmin();

  // Get recent processing stats
  const { data: recentArticles } = await supabase
    .from('processed_articles')
    .select('*')
    .order('processed_at', { ascending: false })
    .limit(20);

  const { data: sources } = await supabase
    .from('release_sources')
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
