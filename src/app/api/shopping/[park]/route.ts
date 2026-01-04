import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Disable caching for this route
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map specific parks to their parent for multi-park queries
const PARK_PARENTS: Record<string, string> = {
  disney_mk: 'disney',
  disney_epcot: 'disney',
  disney_hs: 'disney',
  disney_ak: 'disney',
  disney_springs: 'disney',
  universal_usf: 'universal',
  universal_ioa: 'universal',
  universal_citywalk: 'universal',
  seaworld: 'seaworld',
};

const PARK_NAMES: Record<string, string> = {
  disney_mk: 'Magic Kingdom',
  disney_epcot: 'EPCOT',
  disney_hs: 'Hollywood Studios',
  disney_ak: 'Animal Kingdom',
  disney_springs: 'Disney Springs',
  universal_usf: 'Universal Studios',
  universal_ioa: 'Islands of Adventure',
  universal_citywalk: 'CityWalk',
  seaworld: 'SeaWorld',
};

// All parks in each parent group (for "Also at" badges)
const SIBLING_PARKS: Record<string, string[]> = {
  disney: ['disney_mk', 'disney_epcot', 'disney_hs', 'disney_ak', 'disney_springs'],
  universal: ['universal_usf', 'universal_ioa', 'universal_citywalk'],
  seaworld: ['seaworld'],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ park: string }> }
) {
  try {
    const { park } = await params;
    const parent = PARK_PARENTS[park];

    if (!parent) {
      return NextResponse.json({ error: 'Invalid park code' }, { status: 400 });
    }

    // Build query to get items for this park
    // Include: specific park, parent park (generic), multiple, null
    const { data: items, error } = await supabase
      .from('request_items')
      .select(`
        id,
        name,
        description,
        category,
        park,
        store_name,
        land_name,
        quantity,
        quantity_found,
        size,
        color,
        variant,
        customer_notes,
        estimated_price,
        actual_price,
        status,
        reference_image_url,
        found_image_url,
        notes,
        not_found_reason,
        created_at,
        request:requests(
          id,
          customer:customers(
            id,
            name
          )
        )
      `)
      .or(`park.eq.${park},park.eq.${parent},park.eq.multiple,park.is.null`)
      .order('store_name', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    // Calculate which other parks each item appears in
    const itemsWithParks = (items || []).map(item => {
      const alsoAt: string[] = [];
      const itemPark = item.park;

      if (!itemPark || itemPark === 'multiple') {
        // Shows everywhere - list sibling parks (excluding current)
        const siblings = SIBLING_PARKS[parent] || [];
        siblings.forEach(p => {
          if (p !== park) alsoAt.push(PARK_NAMES[p]);
        });
        // Also add other park groups
        if (parent !== 'disney') alsoAt.push('Disney Parks');
        if (parent !== 'universal') alsoAt.push('Universal Parks');
        if (parent !== 'seaworld') alsoAt.push('SeaWorld');
      } else if (itemPark === parent) {
        // Generic parent (disney, universal) - shows in sibling parks
        const siblings = SIBLING_PARKS[parent] || [];
        siblings.forEach(p => {
          if (p !== park) alsoAt.push(PARK_NAMES[p]);
        });
      }
      // Specific park items don't show "also at"

      return {
        ...item,
        alsoAt,
        customerName: (item.request as any)?.customer?.name || 'Unknown',
        requestId: (item.request as any)?.id,
      };
    });

    // Group by store
    const storeGroups: Record<string, typeof itemsWithParks> = {};
    itemsWithParks.forEach(item => {
      const storeName = item.store_name || 'Unknown Location';
      if (!storeGroups[storeName]) {
        storeGroups[storeName] = [];
      }
      storeGroups[storeName].push(item);
    });

    // Convert to array and sort stores
    const stores = Object.entries(storeGroups)
      .map(([storeName, items]) => ({
        storeName,
        landName: items[0]?.land_name || null,
        items,
        pendingCount: items.filter(i => i.status === 'pending').length,
        foundCount: items.filter(i => i.status === 'found').length,
        notFoundCount: items.filter(i => i.status === 'not_found').length,
      }))
      .sort((a, b) => {
        // Put "Unknown Location" last
        if (a.storeName === 'Unknown Location') return 1;
        if (b.storeName === 'Unknown Location') return -1;
        return a.storeName.localeCompare(b.storeName);
      });

    // Calculate totals
    const allItems = itemsWithParks;
    const stats = {
      total: allItems.length,
      pending: allItems.filter(i => i.status === 'pending').length,
      found: allItems.filter(i => i.status === 'found').length,
      notFound: allItems.filter(i => i.status === 'not_found').length,
      totalSpent: allItems
        .filter(i => i.status === 'found' && i.actual_price)
        .reduce((sum, i) => sum + (i.actual_price || 0), 0),
    };

    return NextResponse.json({
      park: {
        code: park,
        name: PARK_NAMES[park],
        parent,
      },
      stores,
      stats,
    });
  } catch (error) {
    console.error('Error in park route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
