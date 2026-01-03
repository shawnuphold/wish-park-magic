// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin();
  const { id } = await params;

  const { data, error } = await supabase
    .from('release_sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
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
  const supabase = getSupabaseAdmin();
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.url !== undefined) updateData.url = body.url;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.park !== undefined) updateData.park = body.park;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;
  if (body.check_frequency_hours !== undefined) updateData.check_frequency_hours = body.check_frequency_hours;

  const { data, error } = await supabase
    .from('release_sources')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ source: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin();
  const { id } = await params;

  const { error } = await supabase
    .from('release_sources')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
