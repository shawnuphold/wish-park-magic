/**
 * Stripe Webhook Handler
 *
 * Receives payment notifications from Stripe and updates invoice status.
 *
 * Webhook URL to register in Stripe Dashboard:
 *   https://enchantedparkpickups.com/api/payments/stripe/webhook
 *
 * Events to subscribe:
 *   - checkout.session.completed
 *   - payment_intent.succeeded
 *   - payment_intent.payment_failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createLogger } from '@/lib/logger';

const log = createLogger('Stripe');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}) : null;

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event: Stripe.Event;

    // Verify webhook signature
    if (STRIPE_WEBHOOK_SECRET && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        log.error('Signature verification failed', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      // No webhook secret - parse event directly (not recommended for production)
      log.warn('STRIPE_WEBHOOK_SECRET not set - skipping signature verification');
      event = JSON.parse(body) as Stripe.Event;
    }

    log.info('Webhook received', { eventType: event.type });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoice_id;

        if (invoiceId) {
          // Get invoice to find request_id
          const { data: invoice } = await supabase
            .from('invoices')
            .select('id, request_id')
            .eq('id', invoiceId)
            .single();

          // Update invoice status
          const { error: invoiceUpdateError } = await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              payment_method: 'stripe',
              payment_reference: session.payment_intent as string,
              stripe_session_id: session.id,
            })
            .eq('id', invoiceId);

          if (invoiceUpdateError) {
            log.error('Failed to update invoice status', invoiceUpdateError, { invoiceId });
          }

          // Update request status
          if (invoice?.request_id) {
            const { error: requestUpdateError } = await supabase
              .from('requests')
              .update({ status: 'paid' })
              .eq('id', invoice.request_id);

            if (requestUpdateError) {
              log.error('Failed to update request status', requestUpdateError, { requestId: invoice.request_id });
            }
          }

          log.info('Invoice marked as paid', { invoiceId });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        log.info('Payment succeeded', { paymentIntentId: paymentIntent.id });
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        log.warn('Payment failed', { paymentIntentId: paymentIntent.id });
        break;
      }

      default:
        log.debug('Unhandled event type', { eventType: event.type });
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    log.error('Webhook processing failed', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
