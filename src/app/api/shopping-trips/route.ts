import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

// GET - List all shopping trips
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const park = searchParams.get('park');

    let query = supabase
      .from('shopping_trips')
      .select(`
        *,
        shopper:admin_users(id, name, email),
        items:request_items(
          id,
          name,
          category,
          park,
          store_name,
          trip_status,
          priority,
          request:requests(
            id,
            customer:customers(id, name)
          )
        )
      `)
      .order('trip_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (park) {
      query = query.eq('park', park);
    }

    // @ts-expect-error - tables may not be in generated types
    const { data: trips, error } = await query;

    if (error) throw error;

    // Calculate stats for each trip
    const tripsWithStats = (trips || []).map((trip: any) => {
      const items = trip.items || [];
      return {
        ...trip,
        item_count: items.length,
        found_count: items.filter((i: any) => i.trip_status === 'found').length,
        not_found_count: items.filter((i: any) => ['not_found', 'out_of_stock'].includes(i.trip_status)).length,
        pending_count: items.filter((i: any) => ['pending', 'assigned', 'shopping'].includes(i.trip_status)).length,
      };
    });

    return NextResponse.json({ trips: tripsWithStats });
  } catch (error) {
    console.error('Error fetching shopping trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping trips' },
      { status: 500 }
    );
  }
}

// POST - Create a new shopping trip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, trip_date, park, shopper_id, notes, item_ids } = body;

    if (!trip_date) {
      return NextResponse.json(
        { error: 'Trip date is required' },
        { status: 400 }
      );
    }

    // Create the trip
    // @ts-expect-error - tables may not be in generated types
    const { data: trip, error: tripError } = await supabase
      .from('shopping_trips')
      .insert({
        name: name || `Trip - ${trip_date}`,
        date: trip_date,
        trip_date,
        park,
        parks: park ? [park.split('_')[0]] : [], // Legacy field - extract general park
        shopper_id,
        status: 'planning',
        notes,
      })
      .select()
      .single();

    if (tripError) throw tripError;

    // If item_ids provided, assign them to this trip
    if (item_ids && item_ids.length > 0) {
      // @ts-expect-error - tables may not be in generated types
      const { error: itemsError } = await supabase
        .from('request_items')
        .update({
          shopping_trip_id: trip.id,
          trip_status: 'assigned',
        })
        .in('id', item_ids);

      if (itemsError) throw itemsError;
    }

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    console.error('Error creating shopping trip:', error);
    return NextResponse.json(
      { error: 'Failed to create shopping trip' },
      { status: 500 }
    );
  }
}
