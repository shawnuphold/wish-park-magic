import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;

    const supabase = await createSupabaseServerClient();

    // Reset the request item to pending
    const { data, error } = await supabase
      .from('request_items')
      .update({
        status: 'pending',
        trip_status: 'pending',
        actual_price: null,
        found_image_url: null,
        notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error resetting item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update request status back to shopping if it was found
    const { data: requestData } = await supabase
      .from('requests')
      .select('id, status')
      .eq('id', data.request_id)
      .single();

    if (requestData && requestData.status === 'found') {
      await supabase
        .from('requests')
        .update({ status: 'shopping', updated_at: new Date().toISOString() })
        .eq('id', data.request_id);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
