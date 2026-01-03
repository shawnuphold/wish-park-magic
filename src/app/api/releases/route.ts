import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { validateRequestBody, createReleaseSchema } from '@/lib/validations';

// GET is public - supports the /new-releases page
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const searchParams = request.nextUrl.searchParams;

  const status = searchParams.get('status');
  const park = searchParams.get('park');
  const category = searchParams.get('category');
  const featured = searchParams.get('featured');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('new_releases')
    .select('*', { count: 'exact' })
    .order('release_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }
  if (park) {
    query = query.eq('park', park);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (featured === 'true') {
    query = query.eq('is_featured', true);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ releases: data, total: count });
}

// POST requires admin auth
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  // Validate request body
  const validation = await validateRequestBody(request, createReleaseSchema);
  if (!validation.success) return validation.response;

  const supabase = getSupabaseAdmin();
  const body = validation.data;

  try {
    const { data, error } = await supabase
      .from('new_releases')
      .insert({
        title: body.title,
        description: body.description,
        image_url: body.image_url || '',
        source_url: body.source_url || '',
        source: body.source,
        park: body.park,
        category: body.category,
        price_estimate: body.price_estimate,
        release_date: body.release_date || new Date().toISOString(),
        is_limited_edition: body.is_limited_edition,
        is_featured: body.is_featured,
        ai_tags: body.ai_tags || [],
        ai_demand_score: body.ai_demand_score,
        status: 'approved', // Manual entries are auto-approved
        location: body.location,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ release: data });
  } catch (error) {
    console.error('Error creating release:', error);
    return NextResponse.json(
      { error: 'Failed to create release' },
      { status: 500 }
    );
  }
}
