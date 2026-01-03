import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCustomerAliases, addCustomerAlias } from '@/lib/customers/matchCustomer';

// GET /api/customers/[id]/aliases - List all aliases for a customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;

  try {
    const aliases = await getCustomerAliases(customerId);
    return NextResponse.json({ aliases });
  } catch (error) {
    console.error('Error fetching aliases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aliases' },
      { status: 500 }
    );
  }
}

// POST /api/customers/[id]/aliases - Add a new alias
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;

  try {
    const body = await request.json();
    const { alias_type, alias_value, is_primary = false } = body;

    if (!alias_type || !alias_value) {
      return NextResponse.json(
        { error: 'alias_type and alias_value are required' },
        { status: 400 }
      );
    }

    const validTypes = ['facebook', 'instagram', 'telegram', 'email', 'phone', 'other'];
    if (!validTypes.includes(alias_type)) {
      return NextResponse.json(
        { error: `Invalid alias_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const success = await addCustomerAlias(
      customerId,
      alias_type as 'facebook' | 'instagram' | 'email' | 'phone' | 'other',
      alias_value,
      is_primary
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add alias' },
        { status: 500 }
      );
    }

    // Fetch the newly created alias
    const supabase = getSupabaseAdmin();
    const { data: newAlias } = await supabase
      .from('customer_aliases')
      .select('*')
      .eq('customer_id', customerId)
      .eq('alias_type', alias_type)
      .ilike('alias_value', alias_value.toLowerCase().trim())
      .single();

    return NextResponse.json({ alias: newAlias }, { status: 201 });
  } catch (error) {
    console.error('Error adding alias:', error);
    return NextResponse.json(
      { error: 'Failed to add alias' },
      { status: 500 }
    );
  }
}
