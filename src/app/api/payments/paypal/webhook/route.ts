/**
 * PayPal Webhook Handler
 *
 * Receives payment notifications from PayPal and updates invoice status.
 *
 * Webhook URL to register in PayPal:
 *   https://enchantedparkpickups.com/api/payments/paypal/webhook
 *
 * Events to subscribe:
 *   - INVOICING.INVOICE.PAID
 *   - INVOICING.INVOICE.CANCELLED
 *   - PAYMENT.CAPTURE.COMPLETED
 *
 * Required environment variables:
 *   - PAYPAL_CLIENT_ID
 *   - PAYPAL_CLIENT_SECRET
 *   - PAYPAL_WEBHOOK_ID (from PayPal Developer Dashboard)
 *   - PAYPAL_MODE ('sandbox' or 'live')
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('PayPal');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/**
 * Get PayPal OAuth access token
 */
async function getPayPalAccessToken(): Promise<string | null> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    log.error('PayPal credentials not configured');
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
      log.error('Failed to get PayPal access token', null, { status: response.status });
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    log.error('Error getting PayPal access token', error);
    return null;
  }
}

/**
 * Verify webhook signature using PayPal's verify-webhook-signature API
 *
 * IMPORTANT: The webhook_event must be sent exactly as received.
 * Re-serializing JSON can cause verification to fail.
 *
 * @see https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
 */
async function verifyWebhook(
  headers: Headers,
  rawBody: string
): Promise<{ valid: boolean; error?: string }> {
  // Check required configuration
  if (!PAYPAL_WEBHOOK_ID) {
    // In development without webhook ID, log warning but allow
    if (process.env.NODE_ENV === 'development') {
      log.warn('PAYPAL_WEBHOOK_ID not set - skipping verification in development');
      return { valid: true };
    }
    return { valid: false, error: 'PAYPAL_WEBHOOK_ID not configured' };
  }

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    return { valid: false, error: 'PayPal credentials not configured' };
  }

  // Extract required headers from PayPal webhook request
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const transmissionSig = headers.get('paypal-transmission-sig');
  const certUrl = headers.get('paypal-cert-url');
  const authAlgo = headers.get('paypal-auth-algo');

  // Validate all required headers are present
  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    log.error('Missing PayPal webhook headers', null, {
      hasTransmissionId: !!transmissionId,
      hasTransmissionTime: !!transmissionTime,
      hasTransmissionSig: !!transmissionSig,
      hasCertUrl: !!certUrl,
      hasAuthAlgo: !!authAlgo,
    });
    return { valid: false, error: 'Missing required PayPal headers' };
  }

  // Get access token
  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    return { valid: false, error: 'Failed to authenticate with PayPal' };
  }

  try {
    // Parse the raw body to get the webhook event object
    // CRITICAL: We parse here but PayPal needs the exact object structure
    const webhookEvent = JSON.parse(rawBody);

    // Call PayPal's verify-webhook-signature endpoint
    const verifyResponse = await fetch(
      `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          transmission_sig: transmissionSig,
          cert_url: certUrl,
          auth_algo: authAlgo,
          webhook_id: PAYPAL_WEBHOOK_ID,
          webhook_event: webhookEvent,
        }),
      }
    );

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      log.error('PayPal verification request failed', null, { status: verifyResponse.status, body: errorText });
      return { valid: false, error: `Verification request failed: ${verifyResponse.status}` };
    }

    const verifyResult = await verifyResponse.json();

    if (verifyResult.verification_status === 'SUCCESS') {
      return { valid: true };
    } else {
      log.error('PayPal signature verification failed', null, { status: verifyResult.verification_status });
      return { valid: false, error: 'Signature verification failed' };
    }
  } catch (error) {
    log.error('Error verifying PayPal webhook', error);
    return { valid: false, error: 'Verification error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = JSON.parse(body);

    // Log webhook event
    log.info('Webhook received', { eventType: event.event_type });

    // Verify webhook signature (REQUIRED in production)
    const verification = await verifyWebhook(request.headers, body);
    if (!verification.valid) {
      log.error('Invalid webhook signature', null, { error: verification.error });
      return NextResponse.json(
        { error: 'Invalid signature', details: verification.error },
        { status: 401 }
      );
    }

    const eventType = event.event_type;
    const resource = event.resource;

    switch (eventType) {
      case 'INVOICING.INVOICE.PAID': {
        const paypalInvoiceId = resource.id;

        // Find invoice in database
        const { data: invoice } = await supabase
          .from('invoices')
          .select('id, request_id')
          .eq('paypal_invoice_id', paypalInvoiceId)
          .single();

        if (invoice) {
          // Update invoice status
          const { error: invoiceUpdateError } = await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              payment_method: 'paypal',
              payment_reference: resource.payments?.transactions?.[0]?.payment_id || paypalInvoiceId,
            })
            .eq('id', invoice.id);

          if (invoiceUpdateError) {
            log.error('Failed to update invoice status', invoiceUpdateError, { invoiceId: invoice.id });
          }

          // Update request status
          if (invoice.request_id) {
            const { error: requestUpdateError } = await supabase
              .from('requests')
              .update({ status: 'paid' })
              .eq('id', invoice.request_id);

            if (requestUpdateError) {
              log.error('Failed to update request status', requestUpdateError, { requestId: invoice.request_id });
            }
          }

          log.info('Invoice marked as paid', { invoiceId: invoice.id });
        }
        break;
      }

      case 'INVOICING.INVOICE.CANCELLED': {
        const paypalInvoiceId = resource.id;

        const { error: cancelError } = await supabase
          .from('invoices')
          .update({ status: 'cancelled' })
          .eq('paypal_invoice_id', paypalInvoiceId);

        if (cancelError) {
          log.error('Failed to cancel invoice', cancelError, { paypalInvoiceId });
        }

        log.info('Invoice cancelled', { paypalInvoiceId });
        break;
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        // Handle direct PayPal payments (from shop checkout)
        const captureId = resource.id;
        const orderId = resource.supplementary_data?.related_ids?.order_id;

        log.info('Payment captured', { captureId, orderId });
        // Additional handling for shop orders if needed
        break;
      }

      default:
        log.debug('Unhandled event type', { eventType });
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
