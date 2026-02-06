/**
 * PayPal Invoice Cancellation API
 *
 * Cancels an invoice in both the database and PayPal (if applicable).
 *
 * Endpoint: POST /api/paypal/cancel-invoice
 * Body: { invoiceId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '@/lib/auth/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PayPal Configuration
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;

/**
 * Get PayPal access token
 */
async function getAccessToken(): Promise<string | null> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    return null;
  }

  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      console.error('Failed to get PayPal access token:', response.status);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    return null;
  }
}

/**
 * Cancel PayPal invoice
 */
async function cancelPayPalInvoice(accessToken: string, paypalInvoiceId: string): Promise<boolean> {
  try {
    // PayPal invoice cancellation endpoint
    const response = await fetch(
      `${PAYPAL_BASE_URL}/v2/invoicing/invoices/${paypalInvoiceId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Invoice Cancelled',
          note: 'This invoice has been cancelled by the merchant.',
          send_to_invoicer: false,
          send_to_recipient: true,
        }),
      }
    );

    if (response.ok || response.status === 204) {
      return true;
    }

    // Check if already cancelled (409 Conflict means already cancelled)
    if (response.status === 409) {
      console.log('PayPal invoice already cancelled');
      return true;
    }

    const error = await response.text();
    console.error('PayPal cancel invoice error:', response.status, error);
    return false;
  } catch (error) {
    console.error('Error cancelling PayPal invoice:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, message: 'Invoice ID required' },
        { status: 400 }
      );
    }

    // Get invoice from database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, status, paypal_invoice_id, request_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if already cancelled
    if (invoice.status === 'cancelled') {
      return NextResponse.json({
        success: true,
        message: 'Invoice already cancelled',
      });
    }

    // Check if paid - can't cancel paid invoices
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { success: false, message: 'Cannot cancel a paid invoice' },
        { status: 400 }
      );
    }

    // If there's a PayPal invoice, try to cancel it
    if (invoice.paypal_invoice_id) {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const cancelled = await cancelPayPalInvoice(accessToken, invoice.paypal_invoice_id);
        if (!cancelled) {
          // Log but continue - we still want to cancel in our database
          console.warn('Failed to cancel PayPal invoice, but continuing with database update');
        }
      } else {
        console.warn('PayPal not configured, skipping PayPal cancellation');
      }
    }

    // Update invoice status in database
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Error updating invoice status:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update invoice status' },
        { status: 500 }
      );
    }

    // If there's a linked request, update its status back to 'found' or appropriate status
    if (invoice.request_id) {
      const { error: requestUpdateError } = await supabase
        .from('requests')
        .update({ status: 'found' })
        .eq('id', invoice.request_id)
        .eq('status', 'invoiced'); // Only update if currently 'invoiced'

      if (requestUpdateError) {
        console.error('Error reverting request status:', requestUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice cancelled successfully',
    });

  } catch (error) {
    console.error('Cancel invoice error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
