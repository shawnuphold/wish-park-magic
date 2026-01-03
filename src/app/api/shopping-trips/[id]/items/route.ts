import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

// GET - Get all items for a trip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const groupBy = searchParams.get('group_by') || 'store'; // store, customer, priority

    let query = supabase
      .from('request_items')
      .select(`
        *,
        request:requests(
          id,
          customer:customers(id, name, phone)
        )
      `)
      .eq('shopping_trip_id', tripId)
      .order('priority', { ascending: true });

    if (status) {
      query = query.eq('trip_status', status);
    }

    // @ts-expect-error - tables may not be in generated types
    const { data: items, error } = await query;

    if (error) throw error;

    // Group items based on requested grouping
    let grouped: Record<string, any[]> = {};

    if (groupBy === 'store') {
      (items || []).forEach((item: any) => {
        const key = item.store_name || 'Unknown Store';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });
    } else if (groupBy === 'customer') {
      (items || []).forEach((item: any) => {
        const key = item.request?.customer?.name || 'Unknown Customer';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });
    } else if (groupBy === 'priority') {
      (items || []).forEach((item: any) => {
        const priority = item.priority || 5;
        const key = priority <= 3 ? 'High Priority' : priority <= 6 ? 'Normal' : 'Low Priority';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });
    }

    return NextResponse.json({
      items: items || [],
      grouped,
      stats: {
        total: (items || []).length,
        found: (items || []).filter((i: any) => i.trip_status === 'found').length,
        not_found: (items || []).filter((i: any) => ['not_found', 'out_of_stock'].includes(i.trip_status)).length,
        pending: (items || []).filter((i: any) => ['pending', 'assigned', 'shopping'].includes(i.trip_status)).length,
      },
    });
  } catch (error) {
    console.error('Error fetching trip items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip items' },
      { status: 500 }
    );
  }
}

// POST - Add items to a trip
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const body = await request.json();
    const { item_ids } = body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json(
        { error: 'item_ids array is required' },
        { status: 400 }
      );
    }

    // Verify trip exists and is in planning status
    // @ts-expect-error - tables may not be in generated types
    const { data: trip, error: tripError } = await supabase
      .from('shopping_trips')
      .select('id, status')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { error: 'Shopping trip not found' },
        { status: 404 }
      );
    }

    if (trip.status !== 'planning') {
      return NextResponse.json(
        { error: 'Can only add items to trips in planning status' },
        { status: 400 }
      );
    }

    // Assign items to this trip
    // @ts-expect-error - tables may not be in generated types
    const { data: updatedItems, error: updateError } = await supabase
      .from('request_items')
      .update({
        shopping_trip_id: tripId,
        trip_status: 'assigned',
      })
      .in('id', item_ids)
      .select();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      items_added: updatedItems?.length || 0,
    });
  } catch (error) {
    console.error('Error adding items to trip:', error);
    return NextResponse.json(
      { error: 'Failed to add items to trip' },
      { status: 500 }
    );
  }
}
