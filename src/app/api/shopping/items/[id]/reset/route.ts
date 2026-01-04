import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the item first to get request_id
    const { data: item, error: fetchError } = await supabase
      .from('request_items')
      .select('request_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Only allow reset from found or not_found status
    if (item.status !== 'found' && item.status !== 'not_found') {
      return NextResponse.json(
        { error: 'Item is already pending' },
        { status: 400 }
      );
    }

    // Reset the item - clear found/not-found fields but keep reference data
    const { data: updatedItem, error: updateError } = await supabase
      .from('request_items')
      .update({
        status: 'pending',
        actual_price: null,
        quantity_found: 0,
        not_found_reason: null,
        found_image_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error resetting item:', updateError);
      return NextResponse.json({ error: 'Failed to reset item' }, { status: 500 });
    }

    // Re-evaluate parent request status
    // If request was marked found/not_found, revert to in_progress since we now have a pending item
    const { data: parentRequest } = await supabase
      .from('requests')
      .select('status')
      .eq('id', item.request_id)
      .single();

    if (parentRequest && (parentRequest.status === 'found' || parentRequest.status === 'not_found')) {
      await supabase
        .from('requests')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.request_id);
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
    });
  } catch (error) {
    console.error('Error in reset route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
