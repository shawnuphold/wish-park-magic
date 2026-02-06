/**
 * Date formatting utilities
 *
 * All dates from Supabase are in UTC. These helpers ensure consistent
 * display in the US Eastern timezone (where the business operates).
 */

const TIMEZONE = 'America/New_York';

/** Format a date string as "Jan 15, 2026" */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format a date string as "Jan 15, 2026, 3:45 PM" */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Format a date string as "January 15, 2026" */
export function formatDateLong(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    timeZone: TIMEZONE,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format a date string as "1/15/2026" */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    timeZone: TIMEZONE,
  });
}
