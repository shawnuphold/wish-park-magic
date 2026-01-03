import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// GET requires admin auth - feed sources are admin-only
export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('feed_sources')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sources: data });
}

// POST requires admin auth
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('feed_sources')
      .insert({
        name: body.name,
        url: body.url,
        type: body.type || 'rss',
        park: body.park || 'all',
        is_active: body.is_active ?? true,
        check_frequency_hours: body.check_frequency_hours || 4,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ source: data });
  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    );
  }
}
