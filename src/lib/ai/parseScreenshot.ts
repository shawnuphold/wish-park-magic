import Anthropic from '@anthropic-ai/sdk';
import type { ParkLocation, ItemCategory } from '@/lib/database.types';

// Lazy initialization to ensure env vars are loaded
let anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

export interface ParsedRequestItem {
  item_name: string;
  quantity: number;
  estimated_price: number | null;
  category: ItemCategory | null;
  notes: string | null;
}

export interface ParsedCustomerRequest {
  items: ParsedRequestItem[];
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  park_preference: ParkLocation | null;
  location_hints: string[];
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  budget_notes: string | null;
  shipping_notes: string | null;
  general_notes: string | null;
  confidence_score: number; // 0-100 how confident we are in the extraction
}

// Multi-customer result - when screenshot has multiple people
export interface MultiCustomerRequest {
  customer_name: string;
  customer_identifier: string | null; // username, phone, email visible
  items: ParsedRequestItem[];
  park_preference: ParkLocation | null;
  location_hints: string[];
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  notes: string | null;
}

export interface MultiCustomerParseResult {
  success: boolean;
  is_multi_customer: boolean;
  customers: MultiCustomerRequest[];
  raw_text: string | null;
  error: string | null;
}

export interface ScreenshotParseResult {
  success: boolean;
  request: ParsedCustomerRequest | null;
  raw_text: string | null;
  error: string | null;
}

const SYSTEM_PROMPT = `You are an AI assistant helping a personal shopper service that picks up theme park merchandise for customers.
Your task is to analyze screenshots of customer messages (from text messages, Instagram DMs, Facebook Messenger, emails, etc.) and extract their shopping request details.

Be thorough in extracting ALL items mentioned, even if they're listed casually or referenced implicitly.
Pay attention to context clues about urgency, budget, and preferences.`;

export async function parseScreenshotForRequest(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<ScreenshotParseResult> {
  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Analyze this screenshot of a customer message and extract their shopping request.

Extract the following information:

1. **Items Requested**: List ALL items the customer wants. For each item:
   - item_name: What they want (be specific - include character names, colors, themes if mentioned)
   - quantity: How many (default to 1 if not specified)
   - estimated_price: Your estimate in USD if you know typical park merchandise prices (null if unknown)
   - category: One of: loungefly, ears, spirit_jersey, popcorn_bucket, pins, plush, apparel, drinkware, collectible, home_decor, toys, jewelry, other (null if unclear)
   - notes: Any specific details about this item (size, color, version, etc.)

2. **Customer Info** (if visible):
   - customer_name: Their name if mentioned
   - customer_email: Email if shown
   - customer_phone: Phone if shown

3. **Park Preference**: Which park(s) they prefer:
   - disney_mk, disney_epcot, disney_hs, disney_ak, disney_springs
   - universal_usf, universal_ioa, universal_citywalk
   - seaworld
   - multiple (if multiple parks mentioned)
   - null if not specified

4. **Location Hints**: Any store names, lands, or specific locations mentioned (array of strings)

5. **Urgency**: Based on their message tone/content:
   - urgent: Need ASAP, uses words like "urgent", "emergency", specific deadline
   - high: Time-sensitive, mentions dates or travel plans
   - normal: Standard request
   - low: "No rush", "whenever you can"

6. **Budget Notes**: Any mentions of budget, price limits, or spending preferences

7. **Shipping Notes**: Any shipping preferences, address hints, or delivery timing

8. **General Notes**: Any other relevant info that doesn't fit above

9. **Confidence Score**: 0-100 rating of how confident you are in your extraction
   - 90-100: Clear, well-formatted request
   - 70-89: Most details clear, some interpretation needed
   - 50-69: Partial info, significant interpretation
   - 0-49: Very unclear, mostly guessing

Also provide the raw text content you can read from the screenshot.

IMPORTANT:
- Capture EVERYTHING the customer mentions wanting, even casual mentions
- If they reference a previous conversation, note that
- Look for implicit preferences (e.g., if they say "I love Stitch" - tag items as Stitch-related)
- If the image doesn't contain a customer request (like a product photo), indicate that

Return ONLY valid JSON in this exact format:
{
  "success": true,
  "request": {
    "items": [...],
    "customer_name": "...",
    "customer_email": "...",
    "customer_phone": "...",
    "park_preference": "...",
    "location_hints": [...],
    "urgency": "normal",
    "budget_notes": "...",
    "shipping_notes": "...",
    "general_notes": "...",
    "confidence_score": 85
  },
  "raw_text": "The actual text content from the screenshot...",
  "error": null
}

If the image is not a customer request, return:
{
  "success": false,
  "request": null,
  "raw_text": null,
  "error": "This image does not appear to contain a customer shopping request. It shows: [brief description]"
}`
          }
        ]
      }],
      system: SYSTEM_PROMPT
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        request: null,
        raw_text: null,
        error: 'Could not parse AI response'
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as ScreenshotParseResult;

    // Ensure required fields have defaults
    if (parsed.request) {
      parsed.request = {
        ...parsed.request,
        items: parsed.request.items || [],
        location_hints: parsed.request.location_hints || [],
        urgency: parsed.request.urgency || 'normal',
        confidence_score: parsed.request.confidence_score ?? 50,
      };
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing screenshot:', error);
    return {
      success: false,
      request: null,
      raw_text: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Parse multiple screenshots and combine results
 */
export async function parseMultipleScreenshots(
  images: Array<{ base64: string; mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }>
): Promise<ScreenshotParseResult> {
  if (images.length === 0) {
    return {
      success: false,
      request: null,
      raw_text: null,
      error: 'No images provided'
    };
  }

  // Parse each image
  const results = await Promise.all(
    images.map(img => parseScreenshotForRequest(img.base64, img.mimeType))
  );

  // Combine successful results
  const successfulResults = results.filter(r => r.success && r.request);

  if (successfulResults.length === 0) {
    // Return first error
    const firstError = results.find(r => r.error);
    return {
      success: false,
      request: null,
      raw_text: results.map(r => r.raw_text).filter(Boolean).join('\n---\n') || null,
      error: firstError?.error || 'No valid requests found in images'
    };
  }

  // Merge all items and take best customer info
  const combinedItems: ParsedRequestItem[] = [];
  let bestRequest = successfulResults[0].request!;
  const rawTexts: string[] = [];

  for (const result of successfulResults) {
    if (result.request) {
      combinedItems.push(...result.request.items);

      // Take customer info from most confident result
      if (result.request.confidence_score > bestRequest.confidence_score) {
        bestRequest = result.request;
      }

      // Merge location hints
      if (result.request.location_hints) {
        bestRequest.location_hints = [
          ...new Set([...bestRequest.location_hints, ...result.request.location_hints])
        ];
      }
    }
    if (result.raw_text) {
      rawTexts.push(result.raw_text);
    }
  }

  return {
    success: true,
    request: {
      ...bestRequest,
      items: combinedItems,
    },
    raw_text: rawTexts.join('\n---\n'),
    error: null
  };
}

/**
 * Parse a screenshot that may contain multiple customers/conversations
 * Returns separate requests for each customer detected
 */
export async function parseMultiCustomerScreenshot(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<MultiCustomerParseResult> {
  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Analyze this screenshot of customer messages. This may contain messages from MULTIPLE different customers asking for theme park merchandise.

IMPORTANT: Look for multiple different people/conversations. These could be:
- A collage of multiple DM screenshots
- A group chat with different people
- Multiple text conversations stitched together
- Different customer names visible in the messages

For EACH customer you identify, extract their request separately.

For each customer, extract:
1. **customer_name**: The name or username visible (VERY IMPORTANT - get this from the chat header, sender name, or how they sign off)
2. **customer_identifier**: Any visible phone number, email, or social media handle
3. **items**: Array of items they want:
   - item_name: What they want (be specific)
   - quantity: How many (default 1)
   - estimated_price: Your estimate in USD if you know park prices
   - category: loungefly|ears|spirit_jersey|popcorn_bucket|pins|plush|apparel|drinkware|collectible|home_decor|toys|jewelry|other
   - notes: Size, color, specific version
4. **park_preference**: disney_mk|disney_epcot|disney_hs|disney_ak|disney_springs|universal_usf|universal_ioa|universal_citywalk|seaworld|multiple (or null)
5. **location_hints**: Any store names or areas mentioned
6. **urgency**: low|normal|high|urgent
7. **notes**: Any other relevant info for this customer

Return ONLY valid JSON:
{
  "success": true,
  "is_multi_customer": true,
  "customers": [
    {
      "customer_name": "Sarah Johnson",
      "customer_identifier": "@sarah.j.disney",
      "items": [
        {
          "item_name": "Figment Spirit Jersey",
          "quantity": 1,
          "estimated_price": 79.99,
          "category": "spirit_jersey",
          "notes": "Size Large"
        }
      ],
      "park_preference": "disney_epcot",
      "location_hints": ["Creations Shop"],
      "urgency": "normal",
      "notes": "First time customer"
    },
    {
      "customer_name": "Mike Thompson",
      "customer_identifier": "mike.t@email.com",
      "items": [...],
      ...
    }
  ],
  "raw_text": "Full text extracted from the screenshot...",
  "error": null
}

If there's only ONE customer, still return in this format with is_multi_customer: false and a single customer in the array.

If this is NOT a customer request (like a product photo), return:
{
  "success": false,
  "is_multi_customer": false,
  "customers": [],
  "raw_text": null,
  "error": "This image does not appear to contain customer messages. It shows: [brief description]"
}`
          }
        ]
      }],
      system: SYSTEM_PROMPT
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        is_multi_customer: false,
        customers: [],
        raw_text: null,
        error: 'Could not parse AI response'
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as MultiCustomerParseResult;

    // Ensure required fields have defaults
    return {
      success: parsed.success ?? false,
      is_multi_customer: parsed.is_multi_customer ?? false,
      customers: (parsed.customers || []).map(c => ({
        ...c,
        items: c.items || [],
        location_hints: c.location_hints || [],
        urgency: c.urgency || 'normal',
      })),
      raw_text: parsed.raw_text || null,
      error: parsed.error || null
    };
  } catch (error) {
    console.error('Error parsing multi-customer screenshot:', error);
    return {
      success: false,
      is_multi_customer: false,
      customers: [],
      raw_text: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
