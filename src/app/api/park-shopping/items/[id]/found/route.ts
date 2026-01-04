import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      quantity_found,
      actual_price,
      store_name,
      found_images,
      notes,
    } = body;

    if (!quantity_found || !actual_price) {
      return NextResponse.json(
        { error: 'quantity_found and actual_price are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Update the request item
    const updateData: Record<string, unknown> = {
      status: 'found',
      actual_price: actual_price,
      trip_status: 'found',
      updated_at: new Date().toISOString(),
    };

    if (store_name) {
      updateData.store_name = store_name;
    }

    if (found_images && found_images.length > 0) {
      // For now, just store the first image
      // In production, we'd upload to S3 and store the URL
      updateData.found_image_url = found_images[0];
    }

    if (notes) {
      updateData.notes = notes;
    }

    const { data, error } = await supabase
      .from('request_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error marking item as found:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if all items in the request are now found
    const { data: allItems } = await supabase
      .from('request_items')
      .select('id, status')
      .eq('request_id', data.request_id);

    const allFound = allItems?.every(i => i.status === 'found' || i.status === 'not_found');

    if (allFound) {
      // Update request status to 'found'
      await supabase
        .from('requests')
        .update({ status: 'found', updated_at: new Date().toISOString() })
        .eq('id', data.request_id);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in mark found:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
