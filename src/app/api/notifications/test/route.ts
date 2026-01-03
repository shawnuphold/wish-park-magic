/**
 * Test Notification API
 *
 * Sends a test notification using a template with sample data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { sendTestNotification } from '@/lib/notifications/service';

// Admin-only endpoint for testing notifications
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const { templateId, recipient } = await request.json();

    if (!templateId || !recipient) {
      return NextResponse.json(
        { success: false, error: 'Template ID and recipient required' },
        { status: 400 }
      );
    }

    const result = await sendTestNotification(templateId, recipient);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
