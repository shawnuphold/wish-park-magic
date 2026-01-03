import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

// GET - Get single trip with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // @ts-expect-error - tables may not be in generated types
    const { data: trip, error } = await supabase
      .from('shopping_trips')
      .select(`
        *,
        shopper:admin_users(id, name, email),
        items:request_items(
          *,
          request:requests(
            id,
            customer:customers(id, name, phone)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!trip) {
      return NextResponse.json(
        { error: 'Shopping trip not found' },
        { status: 404 }
      );
    }

    // Group items by store for mobile shopper view
    const items = trip.items || [];
    const itemsByStore: Record<string, any[]> = {};

    items.forEach((item: any) => {
      const storeName = item.store_name || 'Unknown Store';
      if (!itemsByStore[storeName]) {
        itemsByStore[storeName] = [];
      }
      itemsByStore[storeName].push(item);
    });

    // Sort items within each store by priority
    Object.keys(itemsByStore).forEach(store => {
      itemsByStore[store].sort((a, b) => (a.priority || 5) - (b.priority || 5));
    });

    return NextResponse.json({
      trip: {
        ...trip,
        items_by_store: itemsByStore,
        item_count: items.length,
        found_count: items.filter((i: any) => i.trip_status === 'found').length,
        not_found_count: items.filter((i: any) => ['not_found', 'out_of_stock'].includes(i.trip_status)).length,
        pending_count: items.filter((i: any) => ['pending', 'assigned', 'shopping'].includes(i.trip_status)).length,
      },
    });
  } catch (error) {
    console.error('Error fetching shopping trip:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping trip' },
      { status: 500 }
    );
  }
}

// PATCH - Update trip
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, trip_date, park, shopper_id, status, notes } = body;

    const updates: Record<string, any> = {};

    if (name !== undefined) updates.name = name;
    if (trip_date !== undefined) {
      updates.trip_date = trip_date;
      updates.date = trip_date;
    }
    if (park !== undefined) {
      updates.park = park;
      updates.parks = park ? [park.split('_')[0]] : [];
    }
    if (shopper_id !== undefined) updates.shopper_id = shopper_id;
    if (status !== undefined) {
      updates.status = status;
      // Set timestamps based on status
      if (status === 'active' && !body.started_at) {
        updates.started_at = new Date().toISOString();
      }
      if (status === 'completed' && !body.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
    }
    if (notes !== undefined) updates.notes = notes;

    // @ts-expect-error - tables may not be in generated types
    const { data: trip, error } = await supabase
      .from('shopping_trips')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ trip });
  } catch (error) {
    console.error('Error updating shopping trip:', error);
    return NextResponse.json(
      { error: 'Failed to update shopping trip' },
      { status: 500 }
    );
  }
}

// DELETE - Delete trip (only if planning status)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check trip status first
    // @ts-expect-error - tables may not be in generated types
    const { data: trip, error: fetchError } = await supabase
      .from('shopping_trips')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!trip) {
      return NextResponse.json(
        { error: 'Shopping trip not found' },
        { status: 404 }
      );
    }

    if (trip.status !== 'planning' && trip.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Can only delete trips in planning or cancelled status' },
        { status: 400 }
      );
    }

    // Unassign all items from this trip
    // @ts-expect-error - tables may not be in generated types
    await supabase
      .from('request_items')
      .update({
        shopping_trip_id: null,
        trip_status: 'pending',
        trip_notes: null,
      })
      .eq('shopping_trip_id', id);

    // Delete the trip
    // @ts-expect-error - tables may not be in generated types
    const { error: deleteError } = await supabase
      .from('shopping_trips')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shopping trip:', error);
    return NextResponse.json(
      { error: 'Failed to delete shopping trip' },
      { status: 500 }
    );
  }
}
