import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// All customer-interests mutations require auth
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  const supabase = getSupabaseAdmin();
  const { id } = await params;

  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.category !== undefined) updateData.category = body.category;
    if (body.park !== undefined) updateData.park = body.park;
    if (body.keywords !== undefined) updateData.keywords = body.keywords;
    if (body.notify_new_releases !== undefined) updateData.notify_new_releases = body.notify_new_releases;

    const { data, error } = await supabase
      .from('customer_interests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Interest not found' },
        { status: error ? 500 : 404 }
      );
    }

    return NextResponse.json({ interest: data });
  } catch (error) {
    console.error('Error updating interest:', error);
    return NextResponse.json(
      { error: 'Failed to update interest' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  const supabase = getSupabaseAdmin();
  const { id } = await params;

  const { error, count } = await supabase
    .from('customer_interests')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (count === 0) {
    return NextResponse.json({ error: 'Interest not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
