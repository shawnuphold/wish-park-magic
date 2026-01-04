import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    // Validate reason
    const validReasons = ['out_of_stock', 'cant_find', 'discontinued'];
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json({
        error: 'Invalid reason. Must be: out_of_stock, cant_find, or discontinued'
      }, { status: 400 });
    }

    // Update the item
    const { data: updatedItem, error: updateError } = await supabase
      .from('request_items')
      .update({
        status: 'not_found',
        not_found_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating item:', updateError);
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }

    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
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
    console.error('Error in not-found route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
