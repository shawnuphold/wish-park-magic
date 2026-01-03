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
    model: 'claude-haiku-3-5-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a Disney/Universal/SeaWorld merchandise expert. Analyze this article and extract ALL merchandise items mentioned.

For each product, provide:
- name: Product name (be specific, not just "new shirt" but "Mickey Mouse Holiday Spirit Jersey")
- canonical_name: Simplified slug for matching (e.g., "mickey-holiday-spirit-jersey"). Lowercase, hyphens, no special chars, remove words like "disney", "world", "parks", "anniversary", "edition", "limited", "exclusive"
- description: 2-3 sentence compelling description for shoppers
- category: One of: loungefly, ears, spirit_jersey, popcorn_bucket, pins, plush, apparel, drinkware, collectible, home_decor, toys, jewelry, other
- park: One of: disney_mk, disney_epcot, disney_hs, disney_ak, disney_springs, universal_usf, universal_ioa, universal_citywalk, universal_epic, seaworld, multiple
  NOTE: This is an ORLANDO-ONLY service. Only include Walt Disney World (Florida), Universal Orlando, and SeaWorld Orlando merchandise.
  SKIP any products from: Disneyland (California), Disney California Adventure, Universal Studios Hollywood, or any non-Orlando location.
  Park codes: disney_mk=Magic Kingdom, disney_epcot=EPCOT, disney_hs=Hollywood Studios, disney_ak=Animal Kingdom, disney_springs=Disney Springs
  Universal codes: universal_usf=Universal Studios Florida, universal_ioa=Islands of Adventure, universal_citywalk=CityWalk, universal_epic=Epic Universe
- locations: Array of specific locations where item is available. Each location has:
  - park: Same values as above
  - land: The themed land/area (e.g., "Fantasyland", "Adventureland", "Tomorrowland", "World Showcase", "Diagon Alley", "The Wizarding World", "Hogsmeade")
  - store: The specific store name (e.g., "Emporium", "Creations Shop", "World of Disney", "Star Trader", "Dino-Rama", "Wiseacre's Wizarding Equipment")
  - is_confirmed: true if the article explicitly mentions this location, false if inferred from park/context
  Common Disney stores: "Emporium" (MK), "Creations Shop" (EPCOT), "Celebrity 5 & 10" (HS), "Island Mercantile" (AK), "World of Disney" (Springs)
  Common Universal stores: "Weasleys' Wizard Wheezes" (Diagon Alley), "Honeydukes" (Hogsmeade), "Universal Studios Store"
- estimated_price: Best guess in USD (null if unknown)
- is_limited_edition: true/false
- is_online_only: true if this item is ONLY available online (shopDisney.com) and NOT available in the theme parks. false if it's available in parks (even if also online)
- tags: Array of relevant tags like character names, collections, themes (e.g., ["mickey", "halloween", "50th anniversary"])
- demand_score: 1-10 rating of likely customer demand (10 = extremely hot item like limited popcorn buckets, 1 = generic souvenir)
- image_url: Extract image URL if found in article
- release_status: One of "rumored" (just hints/leaks), "announced" (officially confirmed), "coming_soon" (with date), "available" (in stores now)
- projected_date: If a release date is mentioned, format as YYYY-MM-DD (null if not mentioned)

Also provide:
- articleSummary: 1-2 sentence summary of what the article is about
- isMerchandiseRelated: true if article contains merchandise news, false otherwise

IMPORTANT:
- Only include ACTUAL products, not general article content
- Be specific with names (not just "new shirt" but "Mickey Mouse Holiday Spirit Jersey")
- CAPTURE ALL PRODUCTS even if named after characters rather than the main franchise. For example, in a "Robin Hood" collection article, include items like "Sir John T-Shirt" or "Prince John Cardigan" even though they don't contain "Robin Hood" in the name. Look for ALL apparel, accessories, and collectibles mentioned.
- For release_status: "available" if article says "now available", "in stores", "spotted at". "coming_soon" if specific date mentioned. "announced" if official but no date. "rumored" if just hints/leaks.
- Demand score: limited editions (8-10), Loungefly (8-9), popcorn buckets (9-10), spirit jerseys (7-9), pins/collectibles (5-7), generic (3-5)

Article from ${sourceName}:
URL: ${articleUrl}

Content:
${articleContent.slice(0, 15000)}

Return ONLY valid JSON in this exact format:
{
  "products": [...],
  "articleSummary": "...",
  "isMerchandiseRelated": true/false
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
      parsed.products = parsed.products.map((p: ParsedProduct) => ({
        ...p,
        canonical_name: p.canonical_name || generateCanonicalName(p.name),
        release_status: p.release_status || 'announced',
        projected_date: p.projected_date || null,
        is_online_only: p.is_online_only || false,
        locations: p.locations || [],  // Default to empty array if not provided
      }));
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
    model: 'claude-haiku-3-5-20241022',
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
    model: 'claude-haiku-3-5-20241022',
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
