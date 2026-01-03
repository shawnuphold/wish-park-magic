import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

// GET - Get single item details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;

    // @ts-expect-error - tables may not be in generated types
    const { data: item, error } = await supabase
      .from('request_items')
      .select(`
        *,
        request:requests(
          id,
          customer:customers(id, name, phone, email)
        )
      `)
      .eq('id', itemId)
      .single();

    if (error) throw error;

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

// PATCH - Update item (priority, notes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const { priority, trip_notes, trip_status } = body;

    const updates: Record<string, any> = {};
    if (priority !== undefined) updates.priority = priority;
    if (trip_notes !== undefined) updates.trip_notes = trip_notes;
    if (trip_status !== undefined) updates.trip_status = trip_status;

    // @ts-expect-error - tables may not be in generated types
    const { data: item, error } = await supabase
      .from('request_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from trip (doesn't delete the item, just unassigns)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: tripId, itemId } = await params;

    // Verify item belongs to this trip
    // @ts-expect-error - tables may not be in generated types
    const { data: item, error: fetchError } = await supabase
      .from('request_items')
      .select('id, shopping_trip_id')
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

    // Unassign item from trip
    // @ts-expect-error - tables may not be in generated types
    const { error: updateError } = await supabase
      .from('request_items')
      .update({
        shopping_trip_id: null,
        trip_status: 'pending',
        trip_notes: null,
      })
      .eq('id', itemId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing item from trip:', error);
    return NextResponse.json(
      { error: 'Failed to remove item from trip' },
      { status: 500 }
    );
  }
}
