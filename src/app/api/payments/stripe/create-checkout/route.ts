/**
 * Stripe Checkout Session API
 *
 * Creates a Stripe checkout session for invoice payment.
 *
 * DISABLED BY DEFAULT - Set STRIPE_SECRET_KEY to enable.
 * Use test keys (sk_test_...) for development.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const isEnabled = !!STRIPE_SECRET_KEY;

const stripe = isEnabled ? new Stripe(STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
}) : null;

export async function POST(request: NextRequest) {
  try {
    if (!isEnabled || !stripe) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stripe integration not configured. Set STRIPE_SECRET_KEY.',
          disabled: true,
        },
        { status: 503 }
      );
    }

    const { invoiceId, successUrl, cancelUrl } = await request.json();

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
          customer:customers(id, name, email),
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

    if (invoice.stripe_session_id) {
      // Retrieve existing session
      const session = await stripe.checkout.sessions.retrieve(invoice.stripe_session_id);
      if (session.status === 'open') {
        return NextResponse.json({
          success: true,
          sessionId: session.id,
          url: session.url,
        });
      }
    }

    const request_data = invoice.request as any;
    const customer = request_data?.customer;
    const items = request_data?.items || [];

    // Create line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(((item.actual_price || 0) + (item.pickup_fee || 0)) * 100),
      },
      quantity: item.quantity || 1,
    }));

    // Add tax as line item
    if (invoice.tax_amount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Florida Sales Tax (6.5%)',
          },
          unit_amount: Math.round(invoice.tax_amount * 100),
        },
        quantity: 1,
      });
    }

    // Add shipping as line item
    if (invoice.shipping_amount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping',
          },
          unit_amount: Math.round(invoice.shipping_amount * 100),
        },
        quantity: 1,
      });
    }

    // Create or get Stripe customer
    let stripeCustomerId = customer?.stripe_customer_id;
    if (!stripeCustomerId && customer?.email) {
      const customers = await stripe.customers.list({
        email: customer.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: customer.email,
          name: customer.name,
          metadata: {
            supabase_id: customer.id,
          },
        });
        stripeCustomerId = newCustomer.id;
      }

      // Save Stripe customer ID
      if (customer?.id) {
        await supabase
          .from('customers')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', customer.id);
      }
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://enchantedparkpickups.com';
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : customer?.email,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl || `${baseUrl}/invoice/${invoiceId}?paid=true`,
      cancel_url: cancelUrl || `${baseUrl}/invoice/${invoiceId}?cancelled=true`,
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
      },
    });

    // Save session ID to invoice
    await supabase
      .from('invoices')
      .update({ stripe_session_id: session.id })
      .eq('id', invoiceId);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
