import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSerpApiUsageThisMonth, resetMonthlyUsage } from '@/lib/ai/googleLens';

const PRODUCT_LOOKUP_SETTINGS = [
  'product_lookup_provider',
  'serpapi_monthly_limit',
  'serpapi_usage_count',
  'google_vision_enabled',
  'claude_fallback_enabled'
];

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get settings
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', PRODUCT_LOOKUP_SETTINGS);

    // Get SerpApi usage
    const serpApiUsage = await getSerpApiUsageThisMonth();

    // Parse settings into object
    const settingsObj: Record<string, any> = {};
    for (const setting of settings || []) {
      try {
        // Try to parse as JSON, fall back to raw value
        settingsObj[setting.key] = JSON.parse(setting.value);
      } catch {
        settingsObj[setting.key] = setting.value;
      }
    }

    return NextResponse.json({
      settings: settingsObj,
      usage: {
        serpapi: serpApiUsage,
        google_vision: { used: 0 } // We don't track Vision usage yet
      }
    });
  } catch (error) {
    console.error('[Settings API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    // Update each setting
    for (const [key, value] of Object.entries(body)) {
      if (!PRODUCT_LOOKUP_SETTINGS.includes(key)) {
        continue; // Skip unknown settings
      }

      const { error } = await supabase
        .from('settings')
        .upsert({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) {
        console.error(`[Settings API] Failed to update ${key}:`, error);
      }
    }

    // Handle special actions
    if (body.action === 'reset_serpapi_usage') {
      await resetMonthlyUsage();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Settings API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
