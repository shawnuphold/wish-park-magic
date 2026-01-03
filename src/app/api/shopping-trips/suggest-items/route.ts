import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

// GET - Suggest items that can be added to a trip for a given park
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const park = searchParams.get('park');
    const excludeTripId = searchParams.get('exclude_trip_id');

    // Find items that:
    // 1. Are from any active request (pending through shopping)
    // 2. Match the park (if specified)
    // 3. Are not already assigned to a trip
    // 4. Have item status pending (not yet found)
    // Note: No quote/approval required - items can be added to trips immediately
    let query = supabase
      .from('request_items')
      .select(`
        *,
        request:requests!inner(
          id,
          status,
          customer:customers(id, name)
        )
      `)
      .in('request.status', ['pending', 'quoted', 'approved', 'scheduled', 'shopping'])
      .eq('status', 'pending')
      .is('shopping_trip_id', null)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    // Filter by park if specified
    if (park) {
      // Extract general park from granular code (e.g., disney_mk -> disney)
      const generalPark = park.split('_')[0];
      query = query.eq('park', generalPark);
    }

    // @ts-expect-error - tables may not be in generated types
    const { data: items, error } = await query;

    if (error) throw error;

    // Group items by store for easier planning
    const itemsByStore: Record<string, any[]> = {};
    (items || []).forEach((item: any) => {
      const storeName = item.store_name || 'Unknown Store';
      if (!itemsByStore[storeName]) {
        itemsByStore[storeName] = [];
      }
      itemsByStore[storeName].push(item);
    });

    // Group items by customer for alternative view
    const itemsByCustomer: Record<string, any[]> = {};
    (items || []).forEach((item: any) => {
      const customerName = item.request?.customer?.name || 'Unknown Customer';
      if (!itemsByCustomer[customerName]) {
        itemsByCustomer[customerName] = [];
      }
      itemsByCustomer[customerName].push(item);
    });

    return NextResponse.json({
      items: items || [],
      items_by_store: itemsByStore,
      items_by_customer: itemsByCustomer,
      total_count: (items || []).length,
    });
  } catch (error) {
    console.error('Error suggesting items:', error);
    return NextResponse.json(
      { error: 'Failed to suggest items' },
      { status: 500 }
    );
  }
}
