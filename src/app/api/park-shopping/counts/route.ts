import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RESORTS, getAllLocations } from '@/lib/park-shopping-config';
import { requireAdminAuth } from '@/lib/auth/api-auth';

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const supabase = await createSupabaseServerClient();

    // Get all pending/active request items (not found, not substituted)
    const { data: items, error } = await supabase
      .from('request_items')
      .select('id, park, status')
      .in('status', ['pending']);

    if (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Count items by resort and park
    const counts: Record<string, { total: number; parks: Record<string, number> }> = {};

    // Initialize counts for all resorts
    Object.keys(RESORTS).forEach(resort => {
      counts[resort] = { total: 0, parks: {} };
      getAllLocations(resort).forEach(location => {
        counts[resort].parks[location.dbValue] = 0;
      });
    });

    // Process each item
    items?.forEach(item => {
      const park = item.park as string;

      // Handle generic park names (disney, universal, seaworld) or 'multiple'
      if (park === 'disney' || park?.startsWith('disney_')) {
        counts.disney.total++;
        if (park === 'disney') {
          // Generic disney - add to magic kingdom as default
          counts.disney.parks['disney_mk'] = (counts.disney.parks['disney_mk'] || 0) + 1;
        } else if (counts.disney.parks[park] !== undefined) {
          counts.disney.parks[park]++;
        }
      } else if (park === 'universal' || park?.startsWith('universal_')) {
        counts.universal.total++;
        if (park === 'universal') {
          counts.universal.parks['universal_usf'] = (counts.universal.parks['universal_usf'] || 0) + 1;
        } else if (counts.universal.parks[park] !== undefined) {
          counts.universal.parks[park]++;
        }
      } else if (park === 'seaworld') {
        counts.seaworld.total++;
        counts.seaworld.parks['seaworld'] = (counts.seaworld.parks['seaworld'] || 0) + 1;
      } else if (park === 'multiple') {
        // Add to all resorts' totals
        counts.disney.total++;
        counts.universal.total++;
        counts.seaworld.total++;
      }
    });

    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error in park-shopping counts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
