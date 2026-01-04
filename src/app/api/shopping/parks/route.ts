import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Park configuration
const PARKS = [
  { code: 'disney_mk', name: 'Magic Kingdom', parent: 'disney', icon: '🏰' },
  { code: 'disney_epcot', name: 'EPCOT', parent: 'disney', icon: '🌍' },
  { code: 'disney_hs', name: 'Hollywood Studios', parent: 'disney', icon: '🎬' },
  { code: 'disney_ak', name: 'Animal Kingdom', parent: 'disney', icon: '🦁' },
  { code: 'disney_springs', name: 'Disney Springs', parent: 'disney', icon: '🏪' },
  { code: 'universal_usf', name: 'Universal Studios', parent: 'universal', icon: '🎢' },
  { code: 'universal_ioa', name: 'Islands of Adventure', parent: 'universal', icon: '🏝️' },
  { code: 'universal_citywalk', name: 'CityWalk', parent: 'universal', icon: '🎵' },
  { code: 'seaworld', name: 'SeaWorld', parent: 'seaworld', icon: '🐬' },
] as const;

export async function GET() {
  try {
    // Get all pending items
    const { data: items, error } = await supabase
      .from('request_items')
      .select('id, park')
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    // Count items per park with multi-park logic
    const parkCounts: Record<string, number> = {};

    // Initialize counts
    PARKS.forEach(park => {
      parkCounts[park.code] = 0;
    });

    // Count items - each item may appear in multiple parks
    (items || []).forEach(item => {
      const itemPark = item.park;

      if (!itemPark || itemPark === 'multiple') {
        // Show in ALL parks
        PARKS.forEach(park => {
          parkCounts[park.code]++;
        });
      } else if (itemPark === 'disney') {
        // Show in all Disney parks
        PARKS.filter(p => p.parent === 'disney').forEach(park => {
          parkCounts[park.code]++;
        });
      } else if (itemPark === 'universal') {
        // Show in all Universal parks
        PARKS.filter(p => p.parent === 'universal').forEach(park => {
          parkCounts[park.code]++;
        });
      } else if (itemPark === 'seaworld') {
        // Show only in SeaWorld
        parkCounts['seaworld']++;
      } else {
        // Specific park (disney_mk, disney_epcot, etc.)
        if (parkCounts[itemPark] !== undefined) {
          parkCounts[itemPark]++;
        }
      }
    });

    // Build response with park info and counts
    const parks = PARKS.map(park => ({
      code: park.code,
      name: park.name,
      icon: park.icon,
      parent: park.parent,
      pendingCount: parkCounts[park.code],
    }));

    return NextResponse.json({ parks });
  } catch (error) {
    console.error('Error in parks route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
