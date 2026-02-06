import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setVerificationCode, getVerificationCode, clearVerificationCode, generateCode } from '@/lib/verificationStore';
import { sendEmail } from '@/lib/email/mailer';
import {
  generateVerificationEmailHtml,
  generateVerificationEmailText,
} from '@/lib/email/templates/verificationCode';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, action, code } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Step 1: Send verification code
    if (action === 'send-code' || !action) {
      // Check if customer exists with this email
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name, email')
        .eq('email', email.toLowerCase())
        .single();

      if (customerError || !customer) {
        // Don't reveal whether the email exists
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, a verification code has been sent.',
          step: 'code',
        });
      }

      // Generate and store code (use email as both parts of the key for login flow)
      const verificationCode = generateCode();
      setVerificationCode(email, 'login', verificationCode);

      // Send verification email
      try {
        await sendEmail({
          to: email,
          subject: `Your login code: ${verificationCode}`,
          html: generateVerificationEmailHtml({ code: verificationCode, requestId: 'Account Login' }),
          text: generateVerificationEmailText({ code: verificationCode, requestId: 'Account Login' }),
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification code has been sent.',
        step: 'code',
        // In development, return the code for testing
        ...(process.env.NODE_ENV === 'development' && { code: verificationCode }),
      });
    }

    // Step 2: Verify code and return dashboard data
    if (action === 'verify-code') {
      if (!code) {
        return NextResponse.json(
          { success: false, error: 'Verification code is required' },
          { status: 400 }
        );
      }

      // Verify the code
      const storedCode = getVerificationCode(email, 'login');

      if (!storedCode || storedCode !== code) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired verification code' },
          { status: 401 }
        );
      }

      // Clear the used code
      clearVerificationCode(email, 'login');

      // Fetch the customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name, email, phone, address_line1, address_line2, city, state, postal_code')
        .eq('email', email.toLowerCase())
        .single();

      if (customerError || !customer) {
        return NextResponse.json(
          { success: false, error: 'Account not found' },
          { status: 401 }
        );
      }

      // Get all requests for this customer with their items
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select(`
          id,
          status,
          notes,
          created_at,
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
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch requests' },
          { status: 500 }
        );
      }

      // Build shipping address from customer fields
      const addressParts = [customer.address_line1, customer.address_line2, customer.city, customer.state, customer.postal_code].filter(Boolean);
      const shippingAddress = addressParts.join(', ');

      // Transform requests to expected format
      const formattedRequests = (requests || []).map((req) => {
        const items = (req.request_items as Array<Record<string, unknown>>) || [];
        const firstItem = items[0] as Record<string, unknown> | undefined;
        return {
          id: req.id,
          date: req.created_at,
          park: (firstItem?.park as string) || 'disney',
          status: req.status || 'pending',
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
      });

      // Get invoices for this customer
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      }

      // Get shipments for this customer
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (shipmentsError) {
        console.error('Error fetching shipments:', shipmentsError);
      }

      return NextResponse.json({
        success: true,
        step: 'authenticated',
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
        requests: formattedRequests,
        invoices: invoices || [],
        shipments: shipments || [],
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
