import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if customer exists with this email
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('email', email.toLowerCase())
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For now, use a simple password check (you could enhance this with proper auth)
    // In production, you'd want to use Supabase Auth or a proper password hash
    // For demo purposes, we'll just verify the email exists

    // Get all requests for this customer
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .select('*')
      .eq('email', email.toLowerCase())
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching requests:', requestsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch requests' },
        { status: 500 }
      );
    }

    // Transform requests to expected format
    const formattedRequests = (requests || []).map((req) => ({
      id: req.id,
      date: req.created_at,
      park: req.park || 'disney',
      status: req.status || 'pending',
      needed_by: req.needed_by,
      full_name: req.full_name || req.name,
      email: req.email,
      phone: req.phone,
      shipping_address: req.shipping_address || req.address,
      item_description: req.item_description || req.description,
      reference_urls: req.reference_urls,
      time_sensitive: !!req.needed_by,
      images: req.images || [],
    }));

    // Get invoices for this customer
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    // Get shipments for this customer (via requests or directly)
    const requestIds = (requests || []).map((r) => r.id);
    const { data: shipments } = await supabase
      .from('shipments')
      .select('*')
      .or(`customer_id.eq.${customer.id}${requestIds.length > 0 ? `,request_id.in.(${requestIds.join(',')})` : ''}`)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
      requests: formattedRequests,
      invoices: invoices || [],
      shipments: shipments || [],
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
