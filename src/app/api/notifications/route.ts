// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { sendNotifications, findNewReleasesToNotify, getEligibleCustomers } from '@/lib/ai/notifications';

// GET /api/notifications - Preview pending notifications
export async function GET() {
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

// POST /api/notifications - Send pending notifications
export async function POST(request: NextRequest) {
  // Optional: Check for API key or auth
  const apiKey = request.headers.get('x-api-key');
  const isValidApiKey = apiKey === process.env.CRON_API_KEY;

  if (process.env.NODE_ENV === 'production' && !isValidApiKey) {
    // Add proper auth check here
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
