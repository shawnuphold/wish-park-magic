import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason, notes } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Update the request item
    const updateData: Record<string, unknown> = {
      status: 'not_found',
      trip_status: 'not_found',
      updated_at: new Date().toISOString(),
    };

    // Store the reason in the notes field with a prefix
    const reasonText = `[NOT FOUND: ${reason}]${notes ? ` ${notes}` : ''}`;
    updateData.notes = reasonText;

    const { data, error } = await supabase
      .from('request_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error marking item as not found:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if all items in the request are now resolved
    const { data: allItems } = await supabase
      .from('request_items')
      .select('id, status')
      .eq('request_id', data.request_id);

    const allResolved = allItems?.every(i => i.status === 'found' || i.status === 'not_found');

    if (allResolved) {
      // Update request status
      const hasAnyFound = allItems?.some(i => i.status === 'found');
      const newStatus = hasAnyFound ? 'found' : 'shopping'; // Keep as shopping if nothing found

      await supabase
        .from('requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', data.request_id);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in mark not found:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
