/**
 * Telegram Webhook API Route
 *
 * Receives webhook updates from Telegram and processes them with the bot.
 * Set up the webhook with:
 *   curl -F "url=https://yoursite.com/api/telegram/webhook" \
 *        https://api.telegram.org/bot<TOKEN>/setWebhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBot } from '@/lib/telegram/bot';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get the bot instance
    const bot = getTelegramBot();

    // Process the update
    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({
    status: 'Telegram webhook endpoint',
    ready: !!process.env.TELEGRAM_BOT_TOKEN
  });
}
