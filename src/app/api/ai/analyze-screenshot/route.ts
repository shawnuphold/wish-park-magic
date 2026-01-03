import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '@/lib/auth/api-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface ProductLocation {
  park: string;
  land: string | null;
  store: string | null;
  confidence: 'confirmed' | 'likely' | 'possible';
}

export interface AnalyzedItem {
  item_name: string;
  category: string;
  description: string;
  estimated_price: number | null;
  confidence: 'high' | 'medium' | 'low';
  possible_locations: ProductLocation[];
  tags: string[];
  notes: string | null;
  is_theme_park_merchandise: boolean;
}

export interface AnalyzeScreenshotResponse {
  success: boolean;
  data?: AnalyzedItem;
  error?: string;
  raw?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeScreenshotResponse>> {
  // Require admin auth to prevent API cost abuse
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response as NextResponse<AnalyzeScreenshotResponse>;

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY not configured'
      }, { status: 500 });
    }

    // Handle both JSON (base64) and FormData (file upload)
    const contentType = request.headers.get('content-type') || '';
    let imageBase64: string;
    let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/png';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({
          success: false,
          error: 'No image file provided'
        }, { status: 400 });
      }

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageBase64 = buffer.toString('base64');

      // Detect media type
      const type = file.type;
      if (type === 'image/jpeg' || type === 'image/jpg') {
        mediaType = 'image/jpeg';
      } else if (type === 'image/gif') {
        mediaType = 'image/gif';
      } else if (type === 'image/webp') {
        mediaType = 'image/webp';
      }
    } else {
      // JSON body with base64 image
      const body = await request.json();
      if (!body.image) {
        return NextResponse.json({
          success: false,
          error: 'No image provided'
        }, { status: 400 });
      }

      // Remove data URL prefix if present
      imageBase64 = body.image.replace(/^data:image\/\w+;base64,/, '');

      // Try to detect media type from data URL
      const match = body.image.match(/^data:(image\/\w+);base64,/);
      if (match) {
        const detectedType = match[1];
        if (detectedType === 'image/jpeg' || detectedType === 'image/jpg') {
          mediaType = 'image/jpeg';
        } else if (detectedType === 'image/gif') {
          mediaType = 'image/gif';
        } else if (detectedType === 'image/webp') {
          mediaType = 'image/webp';
        }
      }
    }

    // Get list of known stores for context
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: stores } = await supabase
      .from('park_stores')
      .select('park, land, store_name')
      .eq('is_active', true)
      .order('park')
      .order('land')
      .order('store_name');

    const storeContext = stores?.map(s =>
      `${s.park} > ${s.land || 'General'} > ${s.store_name}`
    ).join('\n') || '';

    // Call Claude Vision API
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64
            }
          },
          {
            type: 'text',
            text: `You are a Disney/Universal/SeaWorld merchandise expert. Analyze this screenshot and identify the item.

Return ONLY valid JSON (no markdown, no code blocks, just the JSON object):
{
  "item_name": "Full product name",
  "category": "loungefly|ears|spirit_jersey|popcorn_bucket|pins|plush|apparel|drinkware|collectible|home_decor|toys|jewelry|other",
  "description": "Brief description of the item including colors, characters, and notable features",
  "estimated_price": 45.99,
  "confidence": "high|medium|low",
  "possible_locations": [
    {
      "park": "EPCOT",
      "land": "World Showcase - Japan",
      "store": "Mitsukoshi",
      "confidence": "confirmed|likely|possible"
    }
  ],
  "tags": ["limited edition", "character name", "collection name"],
  "notes": "Any additional info like 'released Dec 2024' or 'part of X collection'",
  "is_theme_park_merchandise": true
}

CATEGORY PRICE GUIDELINES:
- loungefly: $75-95
- ears: $35-45
- spirit_jersey: $75-85
- popcorn_bucket: $25-35
- pins: $10-20
- plush: $20-40
- apparel: $30-60
- drinkware: $20-35
- collectible: $50-200+
- home_decor: $25-100
- toys: $15-40
- jewelry: $50-150

LOCATION IDENTIFICATION:
- If the item mentions or shows a specific park logo/theme, identify the park
- If it shows World Showcase Japan items, likely at Mitsukoshi
- Galaxy's Edge items are at Batuu Marketplace or Docking Bay 7 Gift Shop
- Wizarding World items are at specific stores like Ollivanders, Honeydukes
- General Disney items often at Emporium (MK), Creations Shop (EPCOT), etc.

Known stores for reference (use these exact names):
${storeContext}

If you can't identify the item, return your best guess with low confidence.
If it's not theme park merchandise, set is_theme_park_merchandise to false.`
          }
        ]
      }]
    });

    // Parse AI response
    const content = response.content[0];
    if (content.type === 'text') {
      try {
        // Clean up response - remove any markdown code blocks
        let jsonText = content.text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const result: AnalyzedItem = JSON.parse(jsonText);
        return NextResponse.json({ success: true, data: result });
      } catch (parseError) {
        console.error('Failed to parse AI response:', content.text);
        return NextResponse.json({
          success: false,
          error: 'Failed to parse AI response',
          raw: content.text
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Unexpected response format from AI'
    }, { status: 500 });

  } catch (error) {
    console.error('AI analyze-screenshot error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - API documentation
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/ai/analyze-screenshot',
    method: 'POST',
    description: 'Analyze a merchandise screenshot using Claude Vision AI',
    accepts: ['multipart/form-data (file field)', 'application/json (image field with base64)'],
    returns: {
      success: 'boolean',
      data: {
        item_name: 'string',
        category: 'loungefly|ears|spirit_jersey|...',
        description: 'string',
        estimated_price: 'number|null',
        confidence: 'high|medium|low',
        possible_locations: '[{ park, land, store, confidence }]',
        tags: 'string[]',
        notes: 'string|null',
        is_theme_park_merchandise: 'boolean'
      },
      error: 'string (on failure)'
    }
  });
}
