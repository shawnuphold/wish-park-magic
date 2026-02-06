import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '@/lib/auth/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const park = searchParams.get('park');

    if (!park) {
      return NextResponse.json({ error: 'Park parameter is required' }, { status: 400 });
    }

    // Map specific park code to general park for filtering
    const generalPark = park.startsWith('disney') ? 'disney'
      : park.startsWith('universal') ? 'universal'
      : 'seaworld';

    // Get pending items for this park that aren't assigned to a trip
    const { data: items, error } = await supabase
      .from('request_items')
      .select(`
        id,
        name,
        category,
        store_name,
        priority,
        request_id,
        requests (
          id,
          customer_id,
          customers (
            name
          )
        )
      `)
      .eq('park', generalPark)
      .in('status', ['pending'])
      .is('shopping_trip_id', null)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching suggested items:', error);
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    // Format items with nested customer data
    const formattedItems = (items || []).map((item: Record<string, unknown>) => {
      const requests = item.requests as Record<string, unknown> | null;
      const customers = requests?.customers as Record<string, unknown> | null;
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        store_name: item.store_name,
        priority: item.priority,
        request: {
          customer: customers ? { name: customers.name } : null,
        },
      };
    });

    return NextResponse.json({ items: formattedItems });
  } catch (error) {
    console.error('Error fetching suggested items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
