/**
 * Telegram Bot Setup API
 *
 * Endpoints for setting up and managing the Telegram bot webhook.
 * Protected - requires admin authentication in production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';

const TELEGRAM_API = 'https://api.telegram.org/bot';

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN not configured' },
      { status: 500 }
    );
  }

  try {
    const { action, webhookUrl } = await request.json();

    if (action === 'setWebhook') {
      // Set the webhook URL
      const url = webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;

      const response = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true
        })
      });

      const result = await response.json();
      return NextResponse.json(result);
    }

    if (action === 'deleteWebhook') {
      const response = await fetch(`${TELEGRAM_API}${token}/deleteWebhook`, {
        method: 'POST'
      });

      const result = await response.json();
      return NextResponse.json(result);
    }

    if (action === 'getWebhookInfo') {
      const response = await fetch(`${TELEGRAM_API}${token}/getWebhookInfo`);
      const result = await response.json();
      return NextResponse.json(result);
    }

    if (action === 'getMe') {
      const response = await fetch(`${TELEGRAM_API}${token}/getMe`);
      const result = await response.json();
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: setWebhook, deleteWebhook, getWebhookInfo, getMe' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Telegram setup error:', error);
    return NextResponse.json(
      { error: 'Failed to execute action' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json({
      configured: false,
      error: 'TELEGRAM_BOT_TOKEN not set'
    });
  }

  try {
    // Get bot info
    const meResponse = await fetch(`${TELEGRAM_API}${token}/getMe`);
    const me = await meResponse.json();

    // Get webhook info
    const webhookResponse = await fetch(`${TELEGRAM_API}${token}/getWebhookInfo`);
    const webhook = await webhookResponse.json();

    return NextResponse.json({
      configured: true,
      bot: me.result,
      webhook: webhook.result,
      adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || 'not set'
    });

  } catch (error) {
    return NextResponse.json({
      configured: false,
      error: 'Failed to fetch bot info'
    });
  }
}
