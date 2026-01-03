// Type checking enabled
/**
 * Customer Notification System
 *
 * Sends email notifications about new releases to customers
 * based on their preferences.
 */

import { createLogger } from '@/lib/logger';
import { sendEmail } from '../email/mailer';
import {
  generateSubject,
  generateEmailHtml,
  generateEmailText,
} from '../email/templates/releaseNotification';
import { getPrimaryImageUrl } from '../images/releaseImages';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type {
  Park,
  ItemCategory,
  NotificationPreferences,
  ReleaseImage,
} from '@/lib/database.types';

const log = createLogger('Notifications');

interface Release {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  images: ReleaseImage[];
  park: Park;
  category: ItemCategory;
  price_estimate: number | null;
  is_limited_edition: boolean;
  park_exclusive: boolean;
  created_at: string;
}

interface Customer {
  id: string;
  email: string;
  name: string;
  notification_preferences: NotificationPreferences | null;
}

/**
 * Check if a release matches customer's notification preferences
 */
function releaseMatchesPreferences(
  release: { park: Park; category: ItemCategory; park_exclusive: boolean },
  prefs: NotificationPreferences
): boolean {
  // Must have notifications enabled
  if (!prefs.enabled) return false;

  // If park_exclusives_only is true, skip online-available items
  if (prefs.park_exclusives_only && !release.park_exclusive) {
    return false;
  }

  // Check if park matches (empty array means all parks)
  if (prefs.parks.length > 0 && !prefs.parks.includes(release.park)) {
    return false;
  }

  // Check if category matches (empty array means all categories)
  if (prefs.categories.length > 0 && !prefs.categories.includes(release.category)) {
    return false;
  }

  return true;
}

/**
 * Get releases from the last N hours that haven't had notifications sent
 */
export async function findNewReleasesToNotify(hoursBack: number = 24): Promise<Release[]> {
  const supabase = getSupabaseAdmin();

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursBack);

  const { data: releases, error } = await supabase
    .from('new_releases')
    .select('*')
    .is('merged_into_id', null)
    .eq('status', 'available')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Error fetching new releases', error);
    return [];
  }

  return (releases || []).map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    image_url: r.image_url,
    images: (r.images as ReleaseImage[]) || [],
    park: r.park,
    category: r.category,
    price_estimate: r.price_estimate,
    is_limited_edition: r.is_limited_edition,
    park_exclusive: r.park_exclusive ?? true,
    created_at: r.created_at,
  }));
}

/**
 * Get customers who want to receive notifications
 */
export async function getEligibleCustomers(): Promise<Customer[]> {
  const supabase = getSupabaseAdmin();

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, email, name, notification_preferences');

  if (error) {
    log.error('Error fetching customers', error);
    return [];
  }

  // Filter to only customers with notifications enabled
  return (customers || [])
    .map(c => ({
      id: c.id,
      email: c.email,
      name: c.name,
      notification_preferences: c.notification_preferences as NotificationPreferences | null,
    }))
    .filter(c => c.notification_preferences?.enabled);
}

/**
 * Batch load all sent notifications for given releases and customers.
 * Returns a Set of "releaseId:customerId" keys for O(1) lookup.
 * This avoids the N+1 query problem when checking many release/customer pairs.
 */
async function getSentNotifications(
  releaseIds: string[],
  customerIds: string[]
): Promise<Set<string>> {
  if (releaseIds.length === 0 || customerIds.length === 0) {
    return new Set();
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('release_notifications')
    .select('release_id, customer_id')
    .in('release_id', releaseIds)
    .in('customer_id', customerIds);

  if (error) {
    log.error('Error fetching sent notifications', error);
    return new Set();
  }

  // Create a Set of "releaseId:customerId" keys for O(1) lookup
  const sentSet = new Set<string>();
  for (const row of data || []) {
    sentSet.add(`${row.release_id}:${row.customer_id}`);
  }

  return sentSet;
}

/**
 * Check if a notification key exists in the pre-loaded set
 */
function wasNotificationSentToCustomer(
  sentNotifications: Set<string>,
  releaseId: string,
  customerId: string
): boolean {
  return sentNotifications.has(`${releaseId}:${customerId}`);
}

/**
 * Check if a notification was already sent (single query version)
 * Used by notifyForRelease() for single-release notifications.
 */
async function wasNotificationSent(
  releaseId: string,
  customerId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('release_notifications')
    .select('id')
    .eq('release_id', releaseId)
    .eq('customer_id', customerId)
    .maybeSingle();
  return !!data;
}

/**
 * Record that a notification was sent
 */
async function recordNotification(
  releaseId: string,
  customerId: string,
  subject: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase.from('release_notifications').insert({
    release_id: releaseId,
    customer_id: customerId,
    email_subject: subject,
  });
}

/**
 * Send notifications to all eligible customers
 */
export async function sendNotifications(hoursBack: number = 24): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const releases = await findNewReleasesToNotify(hoursBack);
  const customers = await getEligibleCustomers();

  log.info('Processing notifications', { releaseCount: releases.length, customerCount: customers.length });

  if (releases.length === 0 || customers.length === 0) {
    return { sent: 0, skipped: 0, errors: [] };
  }

  // Batch load all sent notifications in ONE query (fixes N+1 problem)
  const releaseIds = releases.map(r => r.id);
  const customerIds = customers.map(c => c.id);
  const sentNotifications = await getSentNotifications(releaseIds, customerIds);
  log.debug('Pre-loaded existing notifications', { count: sentNotifications.size });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const customer of customers) {
    const prefs = customer.notification_preferences;
    if (!prefs) continue;

    // Find releases that match this customer's preferences
    const matchingReleases: typeof releases = [];

    for (const release of releases) {
      // Check if already notified (O(1) Set lookup instead of DB query)
      if (wasNotificationSentToCustomer(sentNotifications, release.id, customer.id)) {
        skipped++;
        continue;
      }

      // Check if matches preferences
      if (releaseMatchesPreferences(release, prefs)) {
        matchingReleases.push(release);
      }
    }

    if (matchingReleases.length === 0) {
      continue;
    }

    // Format releases for email
    const releaseData = matchingReleases.slice(0, 5).map(release => ({
      id: release.id,
      title: release.title,
      description: release.description,
      image_url: getPrimaryImageUrl(release.images, release.image_url, true),
      park: release.park,
      category: release.category,
      price_estimate: release.price_estimate,
      is_limited_edition: release.is_limited_edition,
      park_exclusive: release.park_exclusive,
    }));

    try {
      const subject = generateSubject(releaseData);
      const html = generateEmailHtml({
        customerName: customer.name.split(' ')[0],
        releases: releaseData,
      });
      const text = generateEmailText({
        customerName: customer.name.split(' ')[0],
        releases: releaseData,
      });

      // Send email via SMTP
      await sendEmail({
        to: customer.email,
        subject,
        html,
        text,
      });

      // Record notifications
      for (const release of matchingReleases) {
        await recordNotification(release.id, customer.id, subject);
      }

      sent++;
      log.info('Notification sent', { email: customer.email, releaseCount: matchingReleases.length });
    } catch (error) {
      const message = `Failed to notify ${customer.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(message);
      log.error(message);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, skipped, errors };
}

/**
 * Send notification for a single specific release (called after manual add)
 */
export async function notifyForRelease(releaseId: string): Promise<{
  sent: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();

  const { data: release, error } = await supabase
    .from('new_releases')
    .select('*')
    .eq('id', releaseId)
    .is('merged_into_id', null)
    .single();

  if (error || !release) {
    return { sent: 0, errors: ['Release not found'] };
  }

  const customers = await getEligibleCustomers();
  let sent = 0;
  const errors: string[] = [];

  const releaseData = {
    id: release.id,
    title: release.title,
    description: release.description,
    image_url: getPrimaryImageUrl(
      (release.images as ReleaseImage[]) || [],
      release.image_url,
      true
    ),
    park: release.park,
    category: release.category,
    price_estimate: release.price_estimate,
    is_limited_edition: release.is_limited_edition,
    park_exclusive: release.park_exclusive ?? true,
  };

  for (const customer of customers) {
    const prefs = customer.notification_preferences;
    if (!prefs) continue;

    // Check if already notified
    if (await wasNotificationSent(releaseId, customer.id)) {
      continue;
    }

    // Check if matches preferences
    if (!releaseMatchesPreferences(releaseData, prefs)) {
      continue;
    }

    try {
      const subject = generateSubject([releaseData]);
      const html = generateEmailHtml({
        customerName: customer.name.split(' ')[0],
        releases: [releaseData],
      });
      const text = generateEmailText({
        customerName: customer.name.split(' ')[0],
        releases: [releaseData],
      });

      await sendEmail({
        to: customer.email,
        subject,
        html,
        text,
      });

      await recordNotification(releaseId, customer.id, subject);
      sent++;
      log.info('Notification sent', { email: customer.email, release: release.title });
    } catch (error) {
      errors.push(`Failed to notify ${customer.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, errors };
}
