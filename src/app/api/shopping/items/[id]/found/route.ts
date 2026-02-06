import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '@/lib/auth/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { actual_price, quantity_found, found_image_url } = body;

    // Validate required fields
    if (actual_price === undefined || actual_price === null) {
      return NextResponse.json({ error: 'Price is required' }, { status: 400 });
    }

    // Get the item first to check quantity
    const { data: item, error: fetchError } = await supabase
      .from('request_items')
      .select('quantity')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Determine quantity found (default to full quantity if not specified)
    const qtyFound = quantity_found !== undefined ? quantity_found : (item.quantity || 1);

    // Update the item
    const updateData: Record<string, unknown> = {
      status: 'found',
      actual_price: parseFloat(actual_price),
      quantity_found: qtyFound,
      updated_at: new Date().toISOString(),
    };

    if (found_image_url) {
      updateData.found_image_url = found_image_url;
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('request_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating item:', updateError);
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }

    // Check if all items in the request are now processed
    const { data: requestItems } = await supabase
      .from('request_items')
      .select('status')
      .eq('request_id', updatedItem.request_id);

    const allProcessed = (requestItems || []).every(
      i => i.status === 'found' || i.status === 'not_found' || i.status === 'substituted'
    );

    if (allProcessed) {
      // Update request status
      const hasFound = (requestItems || []).some(i => i.status === 'found');
      await supabase
        .from('requests')
        .update({
          status: hasFound ? 'found' : 'not_found',
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedItem.request_id);
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      allProcessed,
    });
  } catch (error) {
    console.error('Error in found route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
