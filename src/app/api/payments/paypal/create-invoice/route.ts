/**
 * PayPal Invoice Creation API
 *
 * Creates a PayPal invoice for a given invoice ID and returns the payment URL.
 *
 * DISABLED BY DEFAULT - Set PAYPAL_CLIENT_ID and PAYPAL_SECRET to enable.
 * Use sandbox credentials for testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PayPal Configuration
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

const isEnabled = !!(PAYPAL_CLIENT_ID && PAYPAL_SECRET);

/**
 * Get PayPal access token
 */
async function getAccessToken(): Promise<string> {
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
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Create PayPal invoice
 */
async function createPayPalInvoice(accessToken: string, invoiceData: {
  invoiceNumber: string;
  customerEmail: string;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}): Promise<{ invoiceId: string; invoiceUrl: string }> {
  // Create invoice draft
  const invoice = {
    detail: {
      invoice_number: invoiceData.invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      currency_code: 'USD',
      payment_term: {
        term_type: 'DUE_ON_RECEIPT',
      },
    },
    invoicer: {
      name: {
        business_name: 'Enchanted Park Pickups',
      },
      email_address: 'hello@enchantedparkpickups.com',
      website: 'https://enchantedparkpickups.com',
    },
    primary_recipients: [{
      billing_info: {
        name: {
          given_name: invoiceData.customerName.split(' ')[0],
          surname: invoiceData.customerName.split(' ').slice(1).join(' ') || '-',
        },
        email_address: invoiceData.customerEmail,
      },
    }],
    items: invoiceData.items.map((item, idx) => ({
      name: item.name,
      quantity: item.quantity.toString(),
      unit_amount: {
        currency_code: 'USD',
        value: item.price.toFixed(2),
      },
      unit_of_measure: 'QUANTITY',
    })),
    configuration: {
      tax_calculated_after_discount: true,
      tax_inclusive: false,
    },
    amount: {
      breakdown: {
        item_total: {
          currency_code: 'USD',
          value: invoiceData.subtotal.toFixed(2),
        },
        tax_total: {
          currency_code: 'USD',
          value: invoiceData.tax.toFixed(2),
        },
        shipping: {
          amount: {
            currency_code: 'USD',
            value: invoiceData.shipping.toFixed(2),
          },
        },
      },
    },
  };

  // Create draft
  const createResponse = await fetch(`${PAYPAL_BASE_URL}/v2/invoicing/invoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoice),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    console.error('PayPal create invoice error:', error);
    throw new Error('Failed to create PayPal invoice');
  }

  const createdInvoice = await createResponse.json();
  const invoiceId = createdInvoice.id;

  // Send invoice (generates payment link)
  const sendResponse = await fetch(`${PAYPAL_BASE_URL}/v2/invoicing/invoices/${invoiceId}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      send_to_invoicer: false,
      send_to_recipient: true,
    }),
  });

  if (!sendResponse.ok) {
    console.error('Failed to send PayPal invoice');
  }

  // Get invoice details for payment link
  const detailsResponse = await fetch(`${PAYPAL_BASE_URL}/v2/invoicing/invoices/${invoiceId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const details = await detailsResponse.json();
  const paymentLink = details.detail?.metadata?.recipient_view_url ||
    `https://www.${PAYPAL_MODE === 'live' ? '' : 'sandbox.'}paypal.com/invoice/p/#${invoiceId}`;

  return {
    invoiceId,
    invoiceUrl: paymentLink,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'PayPal integration not configured. Set PAYPAL_CLIENT_ID and PAYPAL_SECRET.',
          disabled: true,
        },
        { status: 503 }
      );
    }

    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID required' },
        { status: 400 }
      );
    }

    // Get invoice from database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        request:requests!invoices_request_id_fkey(
          id,
          customer:customers(name, email),
          items:request_items(name, quantity, actual_price, pickup_fee)
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.paypal_invoice_id) {
      return NextResponse.json({
        success: true,
        paypalInvoiceId: invoice.paypal_invoice_id,
        message: 'PayPal invoice already exists',
      });
    }

    // Get access token
    const accessToken = await getAccessToken();

    // Prepare items
    const request_data = invoice.request as any;
    const items = (request_data?.items || []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity || 1,
      price: (item.actual_price || 0) + (item.pickup_fee || 0),
    }));

    // Create PayPal invoice
    const result = await createPayPalInvoice(accessToken, {
      invoiceNumber: invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`,
      customerEmail: request_data?.customer?.email || '',
      customerName: request_data?.customer?.name || 'Customer',
      items,
      subtotal: invoice.subtotal,
      tax: invoice.tax_amount,
      shipping: invoice.shipping_amount,
      total: invoice.total,
    });

    // Update database with PayPal invoice ID
    await supabase
      .from('invoices')
      .update({
        paypal_invoice_id: result.invoiceId,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    return NextResponse.json({
      success: true,
      paypalInvoiceId: result.invoiceId,
      paymentUrl: result.invoiceUrl,
    });

  } catch (error) {
    console.error('PayPal invoice creation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
