/**
 * Email Send API
 *
 * Sends emails for various triggers (invoice, shipping, etc.)
 *
 * DISABLED BY DEFAULT - Set SMTP_HOST to enable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/mailer';
import {
  generateInvoiceSubject,
  generateInvoiceEmailHtml,
  generateInvoiceEmailText,
} from '@/lib/email/templates/invoiceEmail';
import {
  generateShippingSubject,
  generateShippingEmailHtml,
  generateShippingEmailText,
  generateDeliverySubject,
  generateDeliveryEmailHtml,
  generateDeliveryEmailText,
} from '@/lib/email/templates/shippingEmail';

const isEnabled = !!process.env.SMTP_HOST;

// Admin-only endpoint
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const supabase = createSupabaseAdminClient();

  try {
    const { type, id } = await request.json();

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: 'Type and ID required' },
        { status: 400 }
      );
    }

    if (!isEnabled) {
      console.log(`[Email] Would send ${type} email for ${id} (SMTP not configured)`);
      return NextResponse.json({
        success: true,
        sent: false,
        message: 'Email not sent (SMTP not configured)',
        dryRun: true,
      });
    }

    switch (type) {
      case 'invoice': {
        // Get invoice with customer info
        const { data: invoice, error } = await supabase
          .from('invoices')
          .select(`
            *,
            request:requests!invoices_request_id_fkey(
              customer:customers(name, email),
              items:request_items(name, quantity, actual_price, pickup_fee)
            )
          `)
          .eq('id', id)
          .single();

        if (error || !invoice) {
          return NextResponse.json(
            { success: false, error: 'Invoice not found' },
            { status: 404 }
          );
        }

        const request_data = invoice.request as { customer: { name: string; email: string }; items: Array<{ name: string; quantity: number; actual_price: number; pickup_fee: number }> } | null;
        const customer = request_data?.customer;
        const items = request_data?.items || [];

        if (!customer?.email) {
          return NextResponse.json(
            { success: false, error: 'Customer email not found' },
            { status: 400 }
          );
        }

        const invoiceUrl = `https://enchantedparkpickups.com/invoice/${id}`;

        await sendEmail({
          to: customer.email,
          subject: generateInvoiceSubject(invoice.invoice_number || 'Invoice'),
          html: generateInvoiceEmailHtml({
            customerName: customer.name.split(' ')[0],
            invoiceNumber: invoice.invoice_number || `INV-${id.slice(0, 8)}`,
            total: invoice.total,
            invoiceUrl,
            items: items.map((item) => ({
              name: item.name,
              quantity: item.quantity || 1,
              price: (item.actual_price || 0) + (item.pickup_fee || 0),
            })),
          }),
          text: generateInvoiceEmailText({
            customerName: customer.name.split(' ')[0],
            invoiceNumber: invoice.invoice_number || `INV-${id.slice(0, 8)}`,
            total: invoice.total,
            invoiceUrl,
            items: items.map((item) => ({
              name: item.name,
              quantity: item.quantity || 1,
              price: (item.actual_price || 0) + (item.pickup_fee || 0),
            })),
          }),
        });

        // Update invoice sent_at
        await supabase
          .from('invoices')
          .update({ sent_at: new Date().toISOString(), status: 'sent' })
          .eq('id', id);

        return NextResponse.json({ success: true, sent: true, to: customer.email });
      }

      case 'shipping': {
        // Get shipment with customer info
        const { data: shipment, error } = await supabase
          .from('shipments')
          .select(`
            *,
            request:requests(
              customer:customers(name, email),
              items:request_items(name)
            ),
            customer:customers(name, email)
          `)
          .eq('id', id)
          .single();

        if (error || !shipment) {
          return NextResponse.json(
            { success: false, error: 'Shipment not found' },
            { status: 404 }
          );
        }

        const request_data = shipment.request as { customer: { name: string; email: string }; items: Array<{ name: string }> } | null;
        const directCustomer = shipment.customer as { name: string; email: string } | null;
        const customer = request_data?.customer || directCustomer;

        if (!customer?.email) {
          return NextResponse.json(
            { success: false, error: 'Customer email not found' },
            { status: 400 }
          );
        }

        const items = request_data?.items?.map((i) => i.name) || [];

        await sendEmail({
          to: customer.email,
          subject: generateShippingSubject(shipment.carrier, shipment.tracking_number || ''),
          html: generateShippingEmailHtml({
            customerName: customer.name.split(' ')[0],
            trackingNumber: shipment.tracking_number || '',
            carrier: shipment.carrier,
            trackingUrl: shipment.tracking_url || '#',
            items,
          }),
          text: generateShippingEmailText({
            customerName: customer.name.split(' ')[0],
            trackingNumber: shipment.tracking_number || '',
            carrier: shipment.carrier,
            trackingUrl: shipment.tracking_url || '#',
            items,
          }),
        });

        return NextResponse.json({ success: true, sent: true, to: customer.email });
      }

      case 'delivery': {
        // Get shipment with customer info
        const { data: shipment, error } = await supabase
          .from('shipments')
          .select(`
            *,
            request:requests(customer:customers(name, email)),
            customer:customers(name, email)
          `)
          .eq('id', id)
          .single();

        if (error || !shipment) {
          return NextResponse.json(
            { success: false, error: 'Shipment not found' },
            { status: 404 }
          );
        }

        const request_data = shipment.request as { customer: { name: string; email: string } } | null;
        const directCustomer = shipment.customer as { name: string; email: string } | null;
        const customer = request_data?.customer || directCustomer;

        if (!customer?.email) {
          return NextResponse.json(
            { success: false, error: 'Customer email not found' },
            { status: 400 }
          );
        }

        await sendEmail({
          to: customer.email,
          subject: generateDeliverySubject(),
          html: generateDeliveryEmailHtml({ customerName: customer.name.split(' ')[0] }),
          text: generateDeliveryEmailText({ customerName: customer.name.split(' ')[0] }),
        });

        return NextResponse.json({ success: true, sent: true, to: customer.email });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown email type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
