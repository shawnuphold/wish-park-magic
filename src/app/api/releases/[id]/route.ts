import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// GET is public - for viewing release details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin();
  const { id } = await params;

  const { data, error } = await supabase
    .from('new_releases')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Release not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ release: data });
}

// PATCH requires admin auth
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

    // Handle status updates (approve/reject)
    if (body.status) {
      const { data, error } = await supabase
        .from('new_releases')
        .update({ status: body.status })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message || 'Release not found' },
          { status: error ? 500 : 404 }
        );
      }

      return NextResponse.json({ release: data });
    }

    // Handle full updates - build update object from provided fields
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'image_url', 'park', 'category',
      'price_estimate', 'is_limited_edition', 'is_featured',
      'ai_tags', 'ai_demand_score', 'location',
      'projected_release_date', 'actual_release_date', 'sold_out_date',
    ];
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('new_releases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Release not found' },
        { status: error ? 500 : 404 }
      );
    }

    return NextResponse.json({ release: data });
  } catch (error) {
    console.error('Error updating release:', error);
    return NextResponse.json(
      { error: 'Failed to update release' },
      { status: 500 }
    );
  }
}

// DELETE requires admin auth
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const supabase = getSupabaseAdmin();
  const { id } = await params;

  const { error, count } = await supabase
    .from('new_releases')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (count === 0) {
    return NextResponse.json({ error: 'Release not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
