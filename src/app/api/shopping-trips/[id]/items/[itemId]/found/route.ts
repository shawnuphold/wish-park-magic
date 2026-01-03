import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

// POST - Mark item as found
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: tripId, itemId } = await params;
    const body = await request.json();
    const { actual_price, found_image_url, trip_notes } = body;

    // Verify item belongs to this trip
    // @ts-expect-error - tables may not be in generated types
    const { data: item, error: fetchError } = await supabase
      .from('request_items')
      .select('id, shopping_trip_id, status')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item.shopping_trip_id !== tripId) {
      return NextResponse.json(
        { error: 'Item does not belong to this trip' },
        { status: 400 }
      );
    }

    // Update item as found
    const updates: Record<string, any> = {
      trip_status: 'found',
      status: 'found', // Also update the main item status
    };

    if (actual_price !== undefined) updates.actual_price = actual_price;
    if (found_image_url) updates.found_image_url = found_image_url;
    if (trip_notes !== undefined) updates.trip_notes = trip_notes;

    // @ts-expect-error - tables may not be in generated types
    const { data: updatedItem, error: updateError } = await supabase
      .from('request_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Check if all items in the request are now found
    // @ts-expect-error - tables may not be in generated types
    const { data: requestItems, error: requestError } = await supabase
      .from('request_items')
      .select('id, status')
      .eq('request_id', updatedItem.request_id);

    if (!requestError && requestItems) {
      const allFound = requestItems.every((i: any) =>
        ['found', 'not_found', 'substituted'].includes(i.status)
      );

      if (allFound) {
        // Update request status to 'found'
        // @ts-expect-error - tables may not be in generated types
        await supabase
          .from('requests')
          .update({ status: 'found' })
          .eq('id', updatedItem.request_id);
      }
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
    });
  } catch (error) {
    console.error('Error marking item as found:', error);
    return NextResponse.json(
      { error: 'Failed to mark item as found' },
      { status: 500 }
    );
  }
}
