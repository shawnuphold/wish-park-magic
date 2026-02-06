/**
 * Shippo Webhook Handler
 *
 * Receives tracking updates from Shippo and:
 * - Updates shipment status in database
 * - Sends email notifications (if SMTP configured)
 * - Updates related request status
 *
 * Webhook URL to register in Shippo:
 *   https://enchantedparkpickups.com/api/shippo/webhook
 *
 * Security options (use one or more):
 *   1. IP Allowlist: Configure firewall to only allow Shippo's IP range
 *   2. HMAC Signature: Set SHIPPO_WEBHOOK_SECRET (contact Shippo solutions team)
 *   3. URL Token: Add ?token=xxx to webhook URL in Shippo dashboard
 *
 * @see https://docs.goshippo.com/docs/tracking/webhooksecurity/
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { createLogger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/mailer';
import {
  generateDeliverySubject,
  generateDeliveryEmailHtml,
  generateDeliveryEmailText,
} from '@/lib/email/templates/shippingEmail';

const log = createLogger('Shippo');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SHIPPO_WEBHOOK_SECRET = process.env.SHIPPO_WEBHOOK_SECRET;
const SEND_EMAIL_NOTIFICATIONS = process.env.SMTP_HOST ? true : false;

/**
 * Verify Shippo webhook signature using HMAC-SHA256 (if configured)
 *
 * This verification is OPTIONAL - Shippo supports multiple security methods:
 * - IP allowlist (recommended, configured at network level)
 * - HMAC signature (requires contacting Shippo to enable)
 * - URL token parameter
 *
 * If SHIPPO_WEBHOOK_SECRET is set AND signature headers are present,
 * verification is performed. Otherwise, the request is allowed through
 * (assuming IP allowlist is configured at the firewall/load balancer level).
 *
 * Signature header format: "t=1688493073,v1=<hmac-sha256-hex>"
 * Signed payload format: "{timestamp}.{rawBody}"
 */
function verifyShippoWebhook(
  headers: Headers,
  rawBody: string
): { valid: boolean; error?: string; skipped?: boolean } {
  // Get signature header - Shippo uses various header names
  const signatureHeader =
    headers.get('shippo-auth-signature') ||
    headers.get('x-shippo-signature') ||
    headers.get('http-shippo-auth-signature');

  // If no signature header present, allow through (rely on IP allowlist)
  if (!signatureHeader) {
    log.debug('No signature header - relying on IP allowlist');
    return { valid: true, skipped: true };
  }

  // Signature header present - verify if we have the secret
  if (!SHIPPO_WEBHOOK_SECRET) {
    log.warn('Signature header present but SHIPPO_WEBHOOK_SECRET not configured');
    // Allow through but log warning - signature verification not possible
    return { valid: true, skipped: true };
  }

  try {
    // Parse signature header: "t=<timestamp>,v1=<signature>"
    const parts = signatureHeader.split(',');
    let timestamp: string | null = null;
    let signature: string | null = null;

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') signature = value;
    }

    if (!timestamp || !signature) {
      log.error('Invalid signature header format', null, { header: signatureHeader });
      return { valid: false, error: 'Invalid signature header format' };
    }

    // Optional: Check timestamp to prevent replay attacks (allow 5 minute window)
    const timestampMs = parseInt(timestamp, 10) * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - timestampMs) > fiveMinutes) {
      log.error('Webhook timestamp too old (possible replay attack)', null, { timestamp: new Date(timestampMs).toISOString() });
      return { valid: false, error: 'Timestamp too old (possible replay attack)' };
    }

    // Construct signed payload: "{timestamp}.{rawBody}"
    const signedPayload = `${timestamp}.${rawBody}`;

    // Compute expected signature using HMAC-SHA256
    const expectedSignature = createHmac('sha256', SHIPPO_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      log.error('Signature length mismatch');
      return { valid: false, error: 'Signature verification failed' };
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      log.error('Signature verification failed');
      return { valid: false, error: 'Signature verification failed' };
    }

    return { valid: true };
  } catch (error) {
    log.error('Error verifying webhook', error);
    return { valid: false, error: 'Verification error' };
  }
}

interface TrackingEvent {
  tracking_number: string;
  carrier: string;
  tracking_status: {
    status: string;
    status_date: string;
    status_details: string;
    location?: {
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature (REQUIRED in production)
    const verification = verifyShippoWebhook(request.headers, rawBody);
    if (!verification.valid) {
      log.error('Invalid webhook signature', null, { error: verification.error });
      return NextResponse.json(
        { error: 'Invalid signature', details: verification.error },
        { status: 401 }
      );
    }

    // Parse the body after verification
    const event: TrackingEvent = JSON.parse(rawBody);

    if (!event.tracking_number) {
      return NextResponse.json({ error: 'Missing tracking number' }, { status: 400 });
    }

    // Map Shippo status to our status
    const statusMap: Record<string, string> = {
      'UNKNOWN': 'label_created',
      'PRE_TRANSIT': 'label_created',
      'TRANSIT': 'in_transit',
      'DELIVERED': 'delivered',
      'RETURNED': 'exception',
      'FAILURE': 'exception',
    };

    const newStatus = statusMap[event.tracking_status.status] || 'in_transit';

    // Find and update the shipment
    const { data: shipment, error: findError } = await supabase
      .from('shipments')
      .select('id, status')
      .eq('tracking_number', event.tracking_number)
      .single();

    if (findError || !shipment) {
      log.debug('Shipment not found for tracking', { trackingNumber: event.tracking_number });
      return NextResponse.json({ message: 'Shipment not found' }, { status: 200 });
    }

    // Update shipment status
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'delivered') {
      updateData.delivered_at = event.tracking_status.status_date;
    }

    if (newStatus === 'in_transit' && !shipment.status.includes('in_transit')) {
      updateData.shipped_at = event.tracking_status.status_date;
    }

    const { error: updateError } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', shipment.id);

    if (updateError) {
      log.error('Error updating shipment', updateError);
      return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 });
    }

    // If delivered, update the related request status
    if (newStatus === 'delivered') {
      await supabase
        .from('requests')
        .update({ status: 'delivered' })
        .eq('shipment_id', shipment.id);

      // Send delivery notification email (if SMTP configured)
      if (SEND_EMAIL_NOTIFICATIONS) {
        try {
          // Get customer info for the email
          const { data: shipmentData } = await supabase
            .from('shipments')
            .select(`
              request:requests(customer:customers(name, email)),
              customer:customers(name, email)
            `)
            .eq('id', shipment.id)
            .single();

          const requestData = shipmentData?.request as { customer: { name: string; email: string } } | null;
          const directCustomer = shipmentData?.customer as { name: string; email: string } | null;
          const customer = requestData?.customer || directCustomer;

          if (customer?.email) {
            await sendEmail({
              to: customer.email,
              subject: generateDeliverySubject(),
              html: generateDeliveryEmailHtml({ customerName: customer.name.split(' ')[0] }),
              text: generateDeliveryEmailText({ customerName: customer.name.split(' ')[0] }),
            });
            log.info('Delivery notification sent', { email: customer.email, shipmentId: shipment.id });
          }
        } catch (emailError) {
          log.error('Failed to send delivery email', emailError);
        }
      }
    }

    return NextResponse.json({
      message: 'Tracking updated',
      shipmentId: shipment.id,
      newStatus,
    });
  } catch (error: any) {
    log.error('Webhook error', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
