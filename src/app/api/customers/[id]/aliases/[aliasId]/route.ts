import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// DELETE /api/customers/[id]/aliases/[aliasId] - Remove an alias
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; aliasId: string }> }
) {
  const { id: customerId, aliasId } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase
      .from('customer_aliases')
      .delete()
      .eq('id', aliasId)
      .eq('customer_id', customerId);

    if (error) {
      console.error('Error deleting alias:', error);
      return NextResponse.json(
        { error: 'Failed to delete alias' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting alias:', error);
    return NextResponse.json(
      { error: 'Failed to delete alias' },
      { status: 500 }
    );
  }
}

// PATCH /api/customers/[id]/aliases/[aliasId] - Update an alias (e.g., set as primary)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; aliasId: string }> }
) {
  const { id: customerId, aliasId } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { is_primary } = body;

    // If setting as primary, first unset any existing primary for the same type
    if (is_primary) {
      // Get the alias type first
      const { data: alias } = await supabase
        .from('customer_aliases')
        .select('alias_type')
        .eq('id', aliasId)
        .single();

      if (alias) {
        // Unset existing primaries for this type
        await supabase
          .from('customer_aliases')
          .update({ is_primary: false })
          .eq('customer_id', customerId)
          .eq('alias_type', alias.alias_type)
          .eq('is_primary', true);
      }
    }

    // Update the alias
    const { data: updatedAlias, error } = await supabase
      .from('customer_aliases')
      .update({ is_primary })
      .eq('id', aliasId)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating alias:', error);
      return NextResponse.json(
        { error: 'Failed to update alias' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alias: updatedAlias });
  } catch (error) {
    console.error('Error updating alias:', error);
    return NextResponse.json(
      { error: 'Failed to update alias' },
      { status: 500 }
    );
  }
}
