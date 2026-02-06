import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerificationCode, clearVerificationCode } from '@/lib/verificationStore';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, request_id, code } = await request.json();

    if (!email || !request_id || !code) {
      return NextResponse.json(
        { success: false, error: 'Email, request ID, and code are required' },
        { status: 400 }
      );
    }

    // Verify the code
    const storedCode = getVerificationCode(email, request_id);

    if (!storedCode || storedCode !== code) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    // Clear the used code
    clearVerificationCode(email, request_id);

    // Fetch the request with items and customer data
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .select(`
        id,
        status,
        created_at,
        customer_id,
        request_items (
          id,
          name,
          description,
          park,
          reference_url,
          reference_images,
          estimated_price,
          actual_price,
          status
        )
      `)
      .eq('id', request_id)
      .single();

    if (requestError || !requestData) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    // Verify the customer email matches
    const { data: customer } = await supabase
      .from('customers')
      .select('name, email, phone, address_line1, address_line2, city, state, postal_code')
      .eq('id', requestData.customer_id)
      .single();

    if (!customer || customer.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Email verification failed' },
        { status: 403 }
      );
    }

    // Build shipping address
    const addressParts = [customer.address_line1, customer.address_line2, customer.city, customer.state, customer.postal_code].filter(Boolean);
    const shippingAddress = addressParts.join(', ');

    // Format the request using customer and items data
    const items = (requestData.request_items as Array<Record<string, unknown>>) || [];
    const firstItem = items[0] as Record<string, unknown> | undefined;

    const formattedRequest = {
      id: requestData.id,
      date: requestData.created_at,
      park: (firstItem?.park as string) || 'disney',
      status: requestData.status || 'pending',
      needed_by: null,
      full_name: customer.name,
      email: customer.email,
      phone: customer.phone,
      shipping_address: shippingAddress,
      item_description: items.map((i) => i.name).join(', ') || 'No items',
      reference_urls: (firstItem?.reference_url as string) || null,
      time_sensitive: false,
      images: (firstItem?.reference_images as string[]) || [],
    };

    return NextResponse.json({
      success: true,
      request: formattedRequest,
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
