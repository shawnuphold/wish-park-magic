/**
 * Web Push Notifications
 *
 * Infrastructure for sending push notifications to customers.
 *
 * DISABLED BY DEFAULT - Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable.
 *
 * Generate VAPID keys: npx web-push generate-vapid-keys
 */

import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'hello@enchantedparkpickups.com';

const isEnabled = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isEnabled) {
  webpush.setVapidDetails(
    `mailto:${VAPID_EMAIL}`,
    VAPID_PUBLIC_KEY!,
    VAPID_PRIVATE_KEY!
  );
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  notification: PushNotification
): Promise<boolean> {
  if (!isEnabled) {
    console.log('[Push] Would send notification (VAPID not configured):', notification.title);
    return false;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-192.png',
        badge: notification.badge || '/icon-192.png',
        url: notification.url,
        actions: notification.actions,
      })
    );
    return true;
  } catch (error: any) {
    if (error.statusCode === 410) {
      // Subscription has expired or been unsubscribed
      console.log('[Push] Subscription expired:', subscription.endpoint);
    } else {
      console.error('[Push] Failed to send notification:', error);
    }
    return false;
  }
}

/**
 * Send push notifications to multiple subscriptions
 */
export async function sendPushNotifications(
  subscriptions: PushSubscription[],
  notification: PushNotification
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const success = await sendPushNotification(subscription, notification);
    if (success) {
      sent++;
    } else {
      failed++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return { sent, failed };
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

/**
 * Check if push notifications are enabled
 */
export function isPushEnabled(): boolean {
  return isEnabled;
}
