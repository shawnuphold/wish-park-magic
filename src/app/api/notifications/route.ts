import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { sendNotifications, findNewReleasesToNotify, getEligibleCustomers } from '@/lib/ai/notifications';
import { timingSafeEqual } from 'crypto';

/**
 * Timing-safe API key comparison to prevent timing attacks.
 * Returns true only if both keys exist and match.
 */
function isValidCronApiKey(providedKey: string | null): boolean {
  const expectedKey = process.env.CRON_API_KEY;

  // Both must be present
  if (!providedKey || !expectedKey) {
    return false;
  }

  // Keys must be the same length for timingSafeEqual
  if (providedKey.length !== expectedKey.length) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedKey);
  const expectedBuffer = Buffer.from(expectedKey);

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

// GET /api/notifications - Preview pending notifications (admin only)
export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const releases = await findNewReleasesToNotify(24);
    const customers = await getEligibleCustomers();

    return NextResponse.json({
      pendingReleases: releases.length,
      eligibleCustomers: customers.length,
      releases: releases.map(r => ({
        id: r.id,
        title: r.title,
        park: r.park,
        category: r.category,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to prepare notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Send pending notifications (admin or cron with API key)
export async function POST(request: NextRequest) {
  // Check for cron API key first (timing-safe comparison)
  const apiKey = request.headers.get('x-api-key');
  const isValidApiKey = isValidCronApiKey(apiKey);

  // If no valid API key, require admin auth
  if (!isValidApiKey) {
    const auth = await requireAdminAuth();
    if (!auth.success) return auth.response;
  }

  try {
    const result = await sendNotifications();

    return NextResponse.json({
      success: true,
      sent: result.sent,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
