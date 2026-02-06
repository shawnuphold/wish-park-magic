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
    const { name, trip_date, park, notes, item_ids } = await request.json();

    if (!trip_date || !park) {
      return NextResponse.json({ error: 'Date and park are required' }, { status: 400 });
    }

    // Map park code to general park category
    const generalPark = park.startsWith('disney') ? 'disney'
      : park.startsWith('universal') ? 'universal'
      : 'seaworld';

    // Create the trip
    const { data: trip, error: tripError } = await supabase
      .from('shopping_trips')
      .insert({
        name: name || `Trip - ${trip_date}`,
        date: trip_date,
        trip_date,
        park,
        parks: [generalPark],
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
    }

    return NextResponse.json({ trip });
  } catch (error) {
    console.error('Error creating shopping trip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
