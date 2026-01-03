import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// All source routes require admin auth
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const supabase = getSupabaseAdmin();
  const { id } = await params;

  const { data, error } = await supabase
    .from('feed_sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Source not found' },
      { status: 404 }
    );
  }

  // Get recent processed articles for this source
  const { data: articles } = await supabase
    .from('processed_articles')
    .select('*')
    .eq('source_id', id)
    .order('processed_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ source: data, recentArticles: articles || [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const supabase = getSupabaseAdmin();
  const { id } = await params;

  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.park !== undefined) updateData.park = body.park;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.check_frequency_hours !== undefined) updateData.check_frequency_hours = body.check_frequency_hours;

    const { data, error } = await supabase
      .from('feed_sources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Source not found' },
        { status: error ? 500 : 404 }
      );
    }

    return NextResponse.json({ source: data });
  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const supabase = getSupabaseAdmin();
  const { id } = await params;

  const { error } = await supabase
    .from('feed_sources')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
