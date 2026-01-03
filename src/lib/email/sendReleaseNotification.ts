// Type checking enabled
/**
 * Release Notification System
 *
 * Sends email notifications to customers about new releases
 * that match their preferences.
 */

import { sendEmail } from './mailer';
import {
  generateSubject,
  generateEmailHtml,
  generateEmailText,
} from './templates/releaseNotification';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type {
  Park,
  ItemCategory,
  NotificationPreferences,
  ReleaseImage,
} from '@/lib/database.types';
import { getPrimaryImageUrl } from '@/lib/images/releaseImages';

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
}

interface Customer {
  id: string;
  name: string;
  email: string;
  notification_preferences: NotificationPreferences;
}

/**
 * Check if a release matches customer's preferences
 */
function releaseMatchesPreferences(
  release: Release,
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
 * Send notification emails for a single release
 */
export async function notifyCustomersAboutRelease(releaseId: string): Promise<{
  sent: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();

  // Get the release
  const { data: release, error: releaseError } = await supabase
    .from('new_releases')
    .select('*')
    .eq('id', releaseId)
    .is('merged_into_id', null)
    .single();

  if (releaseError || !release) {
    return { sent: 0, errors: ['Release not found'] };
  }

  // Get all customers with notification preferences enabled
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, name, email, notification_preferences');

  if (customersError || !customers) {
    return { sent: 0, errors: ['Failed to fetch customers'] };
  }

  let sent = 0;
  const errors: string[] = [];

  // Get public image URL for email
  const imageUrl = getPrimaryImageUrl(
    (release.images as ReleaseImage[]) || [],
    release.image_url,
    true // forPublic
  );

  const releaseData = {
    id: release.id,
    title: release.title,
    description: release.description,
    image_url: imageUrl,
    park: release.park,
    category: release.category,
    price_estimate: release.price_estimate,
    is_limited_edition: release.is_limited_edition,
    park_exclusive: release.park_exclusive ?? true,
  };

  for (const customer of customers) {
    const prefs = customer.notification_preferences as NotificationPreferences | null;
    if (!prefs || !prefs.enabled) continue;

    // Check if release matches preferences
    if (!releaseMatchesPreferences(releaseData, prefs)) {
      continue;
    }

    // Check if we already sent notification for this release
    const { data: existing } = await supabase
      .from('release_notifications')
      .select('id')
      .eq('release_id', releaseId)
      .eq('customer_id', customer.id)
      .single();

    if (existing) {
      continue; // Already notified
    }

    try {
      // Send email
      const subject = generateSubject([releaseData]);
      const html = generateEmailHtml({
        customerName: customer.name.split(' ')[0], // First name
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

      // Record that we sent the notification
      await supabase.from('release_notifications').insert({
        release_id: releaseId,
        customer_id: customer.id,
        email_subject: subject,
      });

      sent++;
      console.log(`Sent notification to ${customer.email} for ${release.title}`);
    } catch (error) {
      const message = `Failed to send to ${customer.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(message);
      console.error(message);
    }
  }

  return { sent, errors };
}

/**
 * Send notifications for all new releases in the past N hours
 * that haven't been notified yet
 */
export async function notifyAllPendingReleases(hoursBack: number = 24): Promise<{
  releasesProcessed: number;
  totalSent: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursBack);

  // Get recent releases that are 'available' status
  const { data: releases, error } = await supabase
    .from('new_releases')
    .select('id')
    .is('merged_into_id', null)
    .eq('status', 'available')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });

  if (error || !releases) {
    return { releasesProcessed: 0, totalSent: 0, errors: [error?.message || 'No releases found'] };
  }

  let releasesProcessed = 0;
  let totalSent = 0;
  const allErrors: string[] = [];

  for (const release of releases) {
    const result = await notifyCustomersAboutRelease(release.id);
    releasesProcessed++;
    totalSent += result.sent;
    allErrors.push(...result.errors);

    // Rate limiting - don't hammer the email API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { releasesProcessed, totalSent, errors: allErrors };
}

/**
 * Send a digest email with multiple releases (for batch notifications)
 */
export async function sendReleaseDigest(
  customerId: string,
  releaseIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  // Get customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, name, email, notification_preferences')
    .eq('id', customerId)
    .single();

  if (customerError || !customer) {
    return { success: false, error: 'Customer not found' };
  }

  const prefs = customer.notification_preferences as NotificationPreferences | null;
  if (!prefs?.enabled) {
    return { success: false, error: 'Notifications disabled' };
  }

  // Get releases
  const { data: releases, error: releasesError } = await supabase
    .from('new_releases')
    .select('*')
    .in('id', releaseIds)
    .is('merged_into_id', null);

  if (releasesError || !releases || releases.length === 0) {
    return { success: false, error: 'No releases found' };
  }

  // Filter releases by preferences and format for email
  const matchingReleases = releases
    .map(release => ({
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
    }))
    .filter(release => releaseMatchesPreferences(release, prefs));

  if (matchingReleases.length === 0) {
    return { success: false, error: 'No matching releases' };
  }

  try {
    const subject = generateSubject(matchingReleases);
    const html = generateEmailHtml({
      customerName: customer.name.split(' ')[0],
      releases: matchingReleases,
    });
    const text = generateEmailText({
      customerName: customer.name.split(' ')[0],
      releases: matchingReleases,
    });

    await sendEmail({
      to: customer.email,
      subject,
      html,
      text,
    });

    // Record notifications
    for (const release of matchingReleases) {
      await supabase.from('release_notifications').insert({
        release_id: release.id,
        customer_id: customer.id,
        email_subject: subject,
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
