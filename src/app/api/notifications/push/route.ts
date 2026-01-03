/**
 * Push Notification API
 *
 * Handles push subscription management and notification sending.
 *
 * DISABLED BY DEFAULT - Set VAPID keys to enable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification, getVapidPublicKey, isPushEnabled } from '@/lib/notifications/push';
import { requireAdminAuth } from '@/lib/auth/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get VAPID public key for subscription
export async function GET() {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return NextResponse.json({
      enabled: false,
      error: 'Push notifications not configured',
    });
  }

  return NextResponse.json({
    enabled: true,
    publicKey,
  });
}

// POST - Subscribe to push notifications (admin only)
export async function POST(request: NextRequest) {
  // Require admin auth to prevent unauthorized subscription manipulation
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    if (!isPushEnabled()) {
      return NextResponse.json(
        { success: false, error: 'Push notifications not configured' },
        { status: 503 }
      );
    }

    const { customerId, subscription } = await request.json();

    if (!customerId || !subscription) {
      return NextResponse.json(
        { success: false, error: 'Customer ID and subscription required' },
        { status: 400 }
      );
    }

    // Store subscription in database
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        customer_id: customerId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'customer_id,endpoint',
      });

    if (error) {
      console.error('Error storing push subscription:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to store subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

// DELETE - Unsubscribe from push notifications (admin only)
export async function DELETE(request: NextRequest) {
  // Require admin auth to prevent unauthorized subscription deletion
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const { customerId, endpoint } = await request.json();

    if (!customerId || !endpoint) {
      return NextResponse.json(
        { success: false, error: 'Customer ID and endpoint required' },
        { status: 400 }
      );
    }

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('customer_id', customerId)
      .eq('endpoint', endpoint);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
