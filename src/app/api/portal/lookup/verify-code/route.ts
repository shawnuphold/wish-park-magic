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

    // Fetch the request details
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', request_id)
      .eq('email', email.toLowerCase())
      .single();

    if (requestError || !requestData) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    // Format the request
    const formattedRequest = {
      id: requestData.id,
      date: requestData.created_at,
      park: requestData.park || 'disney',
      status: requestData.status || 'pending',
      needed_by: requestData.needed_by,
      full_name: requestData.full_name || requestData.name,
      email: requestData.email,
      phone: requestData.phone,
      shipping_address: requestData.shipping_address || requestData.address,
      item_description: requestData.item_description || requestData.description,
      reference_urls: requestData.reference_urls,
      time_sensitive: !!requestData.needed_by,
      images: requestData.images || [],
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
