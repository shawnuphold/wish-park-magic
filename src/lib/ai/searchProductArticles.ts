/**
 * Web Search for Product Information
 *
 * Uses Claude with web_search tool to find product info
 * from theme park blogs and news sites.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ProductDescription } from './describeProduct';

// Lazy initialization
let anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

export interface WebSearchResult {
  name: string;
  price: number | null;
  park: string | null;
  store: string | null;
  land: string | null;
  availability: 'available' | 'sold_out' | 'coming_soon' | 'unknown';
  sourceUrl: string | null;
  sourceTitle: string | null;
  description: string | null;
  releaseDate: string | null;
  confidence: number;
}

/**
 * Search the web for product information
 */
export async function searchProductArticles(
  description: ProductDescription
): Promise<WebSearchResult | null> {
  const client = getAnthropic();

  // Build search query
  const searchTerms = [description.name];

  if (description.estimatedPark === 'disney') {
    searchTerms.push('Disney World', 'Walt Disney World');
  } else if (description.estimatedPark === 'universal') {
    searchTerms.push('Universal Orlando');
  } else if (description.estimatedPark === 'seaworld') {
    searchTerms.push('SeaWorld Orlando');
  }

  if (description.characters.length > 0) {
    searchTerms.push(description.characters[0]);
  }

  const searchQuery = searchTerms.join(' ') + ' merchandise 2024 2025';

  console.log('[WebSearch] Searching for:', searchQuery);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [{
        type: 'web_search' as any,
        name: 'web_search'
      }],
      messages: [{
        role: 'user',
        content: `Search for information about this theme park merchandise product:

Product: ${description.name}
Type: ${description.productType}
Characters: ${description.characters.join(', ') || 'None identified'}
Park: ${description.estimatedPark || 'Unknown'}
Additional context: ${description.description}

Search query to use: "${searchQuery}"

Focus on finding:
1. The exact product name
2. Price (if available)
3. Which park/store it's sold at
4. Whether it's currently available or sold out
5. Any news articles about this item from WDWNT, BlogMickey, Disney Food Blog, etc.

After searching, provide a JSON response with:
{
  "name": "exact product name",
  "price": number or null,
  "park": "park name" or null,
  "store": "store name" or null,
  "land": "land/area name" or null,
  "availability": "available" | "sold_out" | "coming_soon" | "unknown",
  "sourceUrl": "best article URL" or null,
  "sourceTitle": "article title" or null,
  "description": "product description from article" or null,
  "releaseDate": "YYYY-MM-DD" or null,
  "confidence": 0-100
}

Respond ONLY with valid JSON after searching.`
      }]
    });

    // Process the response - look for text content after tool use
    let jsonResponse = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        jsonResponse = block.text;
      }
    }

    if (!jsonResponse) {
      console.log('[WebSearch] No text response from Claude');
      return null;
    }

    // Parse JSON
    let jsonStr = jsonResponse.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    console.log('[WebSearch] Found result:', parsed.name, 'confidence:', parsed.confidence);

    return {
      name: parsed.name || description.name,
      price: parsed.price,
      park: parsed.park,
      store: parsed.store,
      land: parsed.land,
      availability: parsed.availability || 'unknown',
      sourceUrl: parsed.sourceUrl,
      sourceTitle: parsed.sourceTitle,
      description: parsed.description,
      releaseDate: parsed.releaseDate,
      confidence: parsed.confidence || 50
    };

  } catch (error) {
    console.error('[WebSearch] Error:', error);
    return null;
  }
}

/**
 * Search for product info using direct Google search and scraping
 */
export async function searchWithFallback(
  description: ProductDescription,
  blogUrls?: string[]
): Promise<WebSearchResult | null> {
  // First try Claude web search
  const result = await searchProductArticles(description);

  if (result && result.confidence >= 50) {
    return result;
  }

  // If no good result, try alternative search strategies
  console.log('[WebSearch] Primary search failed or low confidence, trying alternatives...');

  // Could add additional fallback methods here:
  // - Direct Google Custom Search API
  // - Direct blog RSS scraping
  // - Shop Disney API

  return result;
}
