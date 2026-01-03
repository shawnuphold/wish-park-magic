/**
 * Test Push Notification API
 *
 * Sends a test push notification to all registered subscriptions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotifications, isPushEnabled, PushSubscription } from '@/lib/notifications/push';
import { requireAdminAuth } from '@/lib/auth/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Require admin auth
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    if (!isPushEnabled()) {
      return NextResponse.json(
        { success: false, error: 'Push notifications not configured' },
        { status: 503 }
      );
    }

    const { title, body, url } = await request.json();

    // Get all subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys');

    if (error || !subscriptions?.length) {
      return NextResponse.json(
        { success: false, error: 'No subscriptions found' },
        { status: 404 }
      );
    }

    // Send to all subscriptions
    const result = await sendPushNotifications(
      subscriptions as PushSubscription[],
      {
        title: title || 'Test Notification',
        body: body || 'This is a test push notification!',
        url: url || '/admin',
      }
    );

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Test push error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
