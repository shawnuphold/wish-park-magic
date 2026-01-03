import Anthropic from '@anthropic-ai/sdk';
import type { ItemCategory, ParkLocation, ReleaseStatus } from '@/lib/database.types';
import { generateCanonicalName } from './deduplication';

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

export interface ProductLocation {
  park: ParkLocation;
  land?: string;       // e.g., "Fantasyland", "Adventureland", "Diagon Alley"
  store?: string;      // e.g., "Emporium", "Creations Shop", "World of Disney"
  is_confirmed: boolean; // true if explicitly mentioned in article, false if inferred
}

export interface ParsedProduct {
  name: string;
  canonical_name: string;  // Normalized slug for deduplication
  description: string;
  category: ItemCategory;
  park: ParkLocation;
  locations: ProductLocation[];  // Specific stores/lands where item is available
  // Direct store location fields (from first/primary location)
  store_name: string | null;  // e.g., "Creations Shop", "Emporium"
  store_area: string | null;  // e.g., "World Showcase", "Main Street USA"
  estimated_price: number | null;
  is_limited_edition: boolean;
  is_online_only: boolean;  // true if ONLY available online (shopDisney), not in parks
  tags: string[];
  demand_score: number;
  image_url: string | null;
  release_status: ReleaseStatus;  // rumored, announced, coming_soon, available
  projected_date: string | null;  // YYYY-MM-DD if mentioned
}

export interface ParseResult {
  products: ParsedProduct[];
  articleSummary: string;
  isMerchandiseRelated: boolean;
}

export async function parseArticleForProducts(
  articleContent: string,
  articleUrl: string,
  sourceName: string
): Promise<ParseResult> {
  const response = await getAnthropic().messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a Disney/Universal/SeaWorld merchandise expert. Analyze this article and extract ALL merchandise items mentioned.

CRITICAL - STORE LOCATION EXTRACTION:
Look carefully for WHERE each item was found. Articles often mention:
- Store names: "found at Creations Shop", "spotted at Emporium", "available at World of Disney"
- Park names: "at EPCOT", "in Magic Kingdom", "Hollywood Studios"
- Land/area: "in Galaxy's Edge", "Pandora", "World Showcase", "Main Street USA"

Search for phrases like: "found at", "spotted at", "available at", "selling at", "located in", "on display at"
Check photo captions - they often mention the store location.
Check the article intro/first paragraph for location mentions.

For each product, provide:
- name: Product name (be specific, not just "new shirt" but "Mickey Mouse Holiday Spirit Jersey")
- canonical_name: Simplified slug for matching (e.g., "mickey-holiday-spirit-jersey"). Lowercase, hyphens, no special chars
- description: 2-3 sentence compelling description for shoppers
- category: One of: loungefly, ears, spirit_jersey, popcorn_bucket, pins, plush, apparel, drinkware, collectible, home_decor, toys, jewelry, other
- park: disney_mk, disney_epcot, disney_hs, disney_ak, disney_springs, universal_usf, universal_ioa, universal_citywalk, universal_epic, seaworld, multiple
  NOTE: ORLANDO ONLY. Skip Disneyland (CA), Disney California Adventure, Universal Hollywood.
  Park codes: disney_mk=Magic Kingdom, disney_epcot=EPCOT, disney_hs=Hollywood Studios, disney_ak=Animal Kingdom, disney_springs=Disney Springs
- store_name: EXACT store name if mentioned (e.g., "Creations Shop", "Emporium", "World of Disney", "Celebrity 5 & 10"). null if not mentioned.
- store_area: Land or themed area if mentioned (e.g., "World Showcase", "Galaxy's Edge", "Main Street USA", "Future World"). null if not mentioned.
- locations: Array of all locations mentioned:
  - park: Same values as above
  - land: The themed land/area
  - store: The specific store name
  - is_confirmed: true if explicitly mentioned in article
- estimated_price: Price in USD if mentioned, otherwise best guess (null if unknown)
- is_limited_edition: true/false
- is_online_only: true if ONLY available on shopDisney, not in parks
- tags: Array of relevant tags (character names, collections, themes)
- demand_score: 1-10 (10=limited popcorn buckets, 8-9=Loungefly/spirit jerseys, 5-7=pins, 3-5=generic)
- image_url: Extract image URL from article if found
- release_status: "available" (in stores now), "coming_soon" (date mentioned), "announced" (confirmed, no date), "rumored" (hints/leaks)
- projected_date: YYYY-MM-DD if mentioned, null otherwise

Common store names to look for:
- Disney: "Emporium", "Creations Shop", "Celebrity 5 & 10", "Island Mercantile", "World of Disney", "Mouse Gear", "Ye Olde Christmas Shoppe"
- Universal: "Universal Studios Store", "Weasleys' Wizard Wheezes", "Honeydukes", "Dervish and Banges"

Also provide:
- articleSummary: 1-2 sentence summary
- isMerchandiseRelated: true if contains merchandise news

Article from ${sourceName}:
URL: ${articleUrl}

Content:
${articleContent.slice(0, 15000)}

Return ONLY valid JSON:
{
  "products": [{
    "name": "...",
    "canonical_name": "...",
    "description": "...",
    "category": "...",
    "park": "...",
    "store_name": "Creations Shop",
    "store_area": "Future World",
    "locations": [...],
    "estimated_price": 79.99,
    "is_limited_edition": false,
    "is_online_only": false,
    "tags": [...],
    "demand_score": 7,
    "image_url": "...",
    "release_status": "available",
    "projected_date": null
  }],
  "articleSummary": "...",
  "isMerchandiseRelated": true
}`
    }]
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return { products: [], articleSummary: '', isMerchandiseRelated: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Ensure all fields are set for all products (fallback to defaults if AI missed them)
    if (parsed.products) {
      parsed.products = parsed.products.map((p: ParsedProduct) => {
        // Extract store info from locations if not directly provided
        const primaryLocation = p.locations?.[0];
        return {
          ...p,
          canonical_name: p.canonical_name || generateCanonicalName(p.name),
          release_status: p.release_status || 'announced',
          projected_date: p.projected_date || null,
          is_online_only: p.is_online_only || false,
          locations: p.locations || [],
          // Use direct store fields if provided, otherwise extract from locations
          store_name: p.store_name || primaryLocation?.store || null,
          store_area: p.store_area || primaryLocation?.land || null,
        };
      });
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return { products: [], articleSummary: '', isMerchandiseRelated: false };
  }
}

export async function generateProductDescription(
  productName: string,
  category: string,
  park: string,
  existingDescription?: string
): Promise<string> {
  const response = await getAnthropic().messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Write a compelling 2-3 sentence product description for theme park personal shoppers to share with customers.

Product: ${productName}
Category: ${category}
Park: ${park}
${existingDescription ? `Original description: ${existingDescription}` : ''}

Make it exciting and highlight collectibility, exclusivity, or special features. Keep it conversational but professional.

Return ONLY the description text, no quotes or formatting.`
    }]
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

export async function findSimilarProducts(
  productName: string,
  tags: string[],
  existingProducts: { id: string; title: string; ai_tags: string[] | null }[]
): Promise<string[]> {
  if (existingProducts.length === 0) return [];

  const response = await getAnthropic().messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Given this new product and existing products, find similar items.

New Product: ${productName}
Tags: ${tags.join(', ')}

Existing Products:
${existingProducts.map(p => `- ID: ${p.id} | ${p.title} | Tags: ${(p.ai_tags || []).join(', ')}`).join('\n')}

Return a JSON array of IDs for products that are similar (same character, collection, or theme).
Only include truly related items. Max 5 items.

Return ONLY valid JSON array like: ["id1", "id2"]`
    }]
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return [];
  }
}
