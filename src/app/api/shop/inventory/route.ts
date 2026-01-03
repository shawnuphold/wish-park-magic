/**
 * Shop Inventory API
 *
 * Returns available unclaimed inventory items for the public shop.
 *
 * DISABLED BY DEFAULT - Set ENABLE_SHOP=true to enable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SHOP_ENABLED = process.env.ENABLE_SHOP === 'true';

export async function GET(request: NextRequest) {
  try {
    if (!SHOP_ENABLED) {
      // Return empty array when shop is disabled
      return NextResponse.json({ items: [], disabled: true });
    }

    const { data, error } = await supabase
      .from('unclaimed_inventory')
      .select('id, name, description, price, image_url, park, category, quantity, is_limited_edition')
      .gt('quantity', 0)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventory:', error);
      return NextResponse.json({ items: [] });
    }

    // Transform to expected format
    const items = (data || []).map(item => ({
      id: item.id,
      title: item.name,
      price: item.price || 0,
      image: item.image_url || '/placeholder.svg',
      park: item.park,
      category: item.category,
      quantity: item.quantity,
      isLimited: item.is_limited_edition,
    }));

    return NextResponse.json({ items });

  } catch (error) {
    console.error('Shop inventory error:', error);
    return NextResponse.json({ items: [], error: 'Failed to fetch inventory' }, { status: 500 });
  }
}
