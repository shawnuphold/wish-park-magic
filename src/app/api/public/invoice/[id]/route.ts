/**
 * Public Invoice API
 *
 * Fetches invoice data for customer-facing invoice view.
 * Uses service role to bypass RLS since customers access via magic link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID required' },
        { status: 400 }
      );
    }

    // Fetch invoice with customer info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        subtotal,
        tax_amount,
        shipping_amount,
        total,
        status,
        created_at,
        paid_at,
        due_date,
        notes,
        cc_fee_enabled,
        cc_fee_percentage,
        cc_fee_amount,
        paypal_invoice_id,
        request:requests!invoices_request_id_fkey(
          id,
          customer:customers(name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Fetch invoice items (use invoice_items table first, fall back to request_items)
    const { data: invoiceItems } = await supabase
      .from('invoice_items')
      .select('id, name, description, quantity, unit_price, tax_amount, pickup_fee, shipping_fee, custom_fee_label, custom_fee_amount')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true });

    let items = invoiceItems || [];

    // If no invoice_items, fall back to request_items (legacy invoices)
    if (items.length === 0 && invoice.request) {
      const requestData = invoice.request as { id: string };
      const { data: requestItems } = await supabase
        .from('request_items')
        .select('id, name, quantity, actual_price, pickup_fee')
        .eq('request_id', requestData.id);

      if (requestItems) {
        items = requestItems.map(item => ({
          id: item.id,
          name: item.name,
          description: null,
          quantity: item.quantity || 1,
          unit_price: item.actual_price || 0,
          tax_amount: 0,
          pickup_fee: item.pickup_fee || 0,
          shipping_fee: 0,
          custom_fee_label: null,
          custom_fee_amount: 0,
        }));
      }
    }

    return NextResponse.json({
      invoice: {
        ...invoice,
        items,
      },
    });

  } catch (error) {
    console.error('Public invoice fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}
