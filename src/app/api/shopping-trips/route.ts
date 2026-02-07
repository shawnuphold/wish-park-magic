import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '@/lib/auth/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const { name, trip_date, park, parks, notes, item_ids, request_ids, shopper_id } = await request.json();

    // Support both flows: CreateTripModal sends park (specific), trips/new sends parks (array)
    if (!trip_date && !park && (!parks || parks.length === 0)) {
      return NextResponse.json({ error: 'Date and park are required' }, { status: 400 });
    }

    // Map park code to general park category
    const generalPark = park
      ? (park.startsWith('disney') ? 'disney'
        : park.startsWith('universal') ? 'universal'
        : 'seaworld')
      : null;
    const tripParks = parks || (generalPark ? [generalPark] : []);

    // Create the trip
    const { data: trip, error: tripError } = await supabase
      .from('shopping_trips')
      .insert({
        name: name || `Trip - ${trip_date}`,
        date: trip_date,
        trip_date,
        park: park || null,
        parks: tripParks,
        shopper_id: shopper_id || null,
        status: 'planned',
        notes: notes || null,
      })
      .select()
      .single();

    if (tripError || !trip) {
      console.error('Error creating trip:', tripError);
      return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
    }

    // Assign selected items to the trip
    if (item_ids && item_ids.length > 0) {
      const { error: assignError } = await supabase
        .from('request_items')
        .update({
          shopping_trip_id: trip.id,
          trip_status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .in('id', item_ids);

      if (assignError) {
        console.error('Error assigning items:', assignError);
      }

      // Also link parent requests to this trip so the trip detail page can find them
      const { data: assignedItems } = await supabase
        .from('request_items')
        .select('request_id')
        .in('id', item_ids);

      if (assignedItems && assignedItems.length > 0) {
        const uniqueRequestIds = [...new Set(assignedItems.map(i => i.request_id))].filter(Boolean);
        if (uniqueRequestIds.length > 0) {
          await supabase
            .from('requests')
            .update({
              shopping_trip_id: trip.id,
              status: 'scheduled',
            })
            .in('id', uniqueRequestIds);
        }
      }
    }

    // Assign requests directly (used by /admin/trips/new page)
    if (request_ids && request_ids.length > 0) {
      const { error: requestAssignError } = await supabase
        .from('requests')
        .update({
          shopping_trip_id: trip.id,
          status: 'scheduled',
        })
        .in('id', request_ids);

      if (requestAssignError) {
        console.error('Error assigning requests:', requestAssignError);
      }

      // Also link the request_items to the trip so the detail page can show them
      const { error: itemAssignError } = await supabase
        .from('request_items')
        .update({
          shopping_trip_id: trip.id,
          trip_status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .in('request_id', request_ids);

      if (itemAssignError) {
        console.error('Error assigning request items to trip:', itemAssignError);
      }
    }

    return NextResponse.json({ trip });
  } catch (error) {
    console.error('Error creating shopping trip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
