import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ParkStore {
  id: string;
  park: string;
  land: string | null;
  store_name: string;
  store_type: string;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ParkStoresByLocation {
  parks: string[];
  landsByPark: Record<string, string[]>;
  storesByParkAndLand: Record<string, Record<string, ParkStore[]>>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('include_inactive') === 'true';

  try {
    let query = supabase
      .from('park_stores')
      .select('*')
      .order('park')
      .order('land')
      .order('sort_order')
      .order('store_name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: stores, error } = await query;

    if (error) {
      console.error('Error fetching park stores:', error);
      // If table doesn't exist, return empty data structure
      if (error.code === 'PGRST116' || error.message?.includes('park_stores')) {
        return NextResponse.json({
          parks: [],
          landsByPark: {},
          storesByParkAndLand: {},
          _error: 'Table not yet created - run migration first'
        } as ParkStoresByLocation & { _error?: string });
      }
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }

    // Organize stores by park and land for efficient cascading dropdown
    const parks = new Set<string>();
    const landsByPark: Record<string, Set<string>> = {};
    const storesByParkAndLand: Record<string, Record<string, ParkStore[]>> = {};

    for (const store of stores || []) {
      const park = store.park;
      const land = store.land || 'General';

      parks.add(park);

      if (!landsByPark[park]) {
        landsByPark[park] = new Set();
      }
      landsByPark[park].add(land);

      if (!storesByParkAndLand[park]) {
        storesByParkAndLand[park] = {};
      }
      if (!storesByParkAndLand[park][land]) {
        storesByParkAndLand[park][land] = [];
      }
      storesByParkAndLand[park][land].push(store);
    }

    // Convert Sets to arrays for JSON serialization
    const result: ParkStoresByLocation = {
      parks: Array.from(parks).sort(),
      landsByPark: Object.fromEntries(
        Object.entries(landsByPark).map(([park, lands]) => [
          park,
          Array.from(lands).sort()
        ])
      ),
      storesByParkAndLand
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error in park-stores API:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
