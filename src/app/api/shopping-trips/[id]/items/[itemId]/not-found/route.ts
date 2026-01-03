import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

// POST - Mark item as not found
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: tripId, itemId } = await params;
    const body = await request.json();
    const { reason, trip_notes } = body;

    // reason can be: 'not_found', 'out_of_stock', or custom text
    const tripStatus = reason === 'out_of_stock' ? 'out_of_stock' : 'not_found';

    // Verify item belongs to this trip
    // @ts-expect-error - tables may not be in generated types
    const { data: item, error: fetchError } = await supabase
      .from('request_items')
      .select('id, shopping_trip_id, request_id')
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

    // Build notes with reason
    let notes = trip_notes || '';
    if (reason && reason !== 'not_found' && reason !== 'out_of_stock') {
      notes = reason + (notes ? ` - ${notes}` : '');
    }

    // Update item as not found
    // @ts-expect-error - tables may not be in generated types
    const { data: updatedItem, error: updateError } = await supabase
      .from('request_items')
      .update({
        trip_status: tripStatus,
        status: 'not_found', // Main item status
        trip_notes: notes || null,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Check if all items in the request have been processed
    // @ts-expect-error - tables may not be in generated types
    const { data: requestItems, error: requestError } = await supabase
      .from('request_items')
      .select('id, status')
      .eq('request_id', item.request_id);

    if (!requestError && requestItems) {
      const allProcessed = requestItems.every((i: any) =>
        ['found', 'not_found', 'substituted'].includes(i.status)
      );

      if (allProcessed) {
        // Check if at least one item was found
        const anyFound = requestItems.some((i: any) => i.status === 'found');

        // Update request status based on results
        // @ts-expect-error - tables may not be in generated types
        await supabase
          .from('requests')
          .update({ status: anyFound ? 'found' : 'shopping' })
          .eq('id', item.request_id);
      }
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
    });
  } catch (error) {
    console.error('Error marking item as not found:', error);
    return NextResponse.json(
      { error: 'Failed to mark item as not found' },
      { status: 500 }
    );
  }
}
