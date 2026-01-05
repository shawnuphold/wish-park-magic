/**
 * Claude-powered Product Description
 *
 * Uses Claude's vision capabilities to generate detailed
 * product descriptions and search terms from images.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { VisionAnalysisResult } from './googleVision';

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

export interface ProductDescription {
  name: string;
  description: string;
  characters: string[];
  themes: string[];
  colors: string[];
  productType: string;
  estimatedCategory: 'merchandise' | 'apparel' | 'accessories' | 'collectibles' | 'home_decor' | 'toys' | 'food' | 'other';
  estimatedPark: 'disney' | 'universal' | 'seaworld' | null;
  searchTerms: string[];
  confidence: number;
}

/**
 * Generate a detailed product description using Claude
 *
 * @param imageBase64 - Base64 encoded image
 * @param visionContext - Optional context from Google Vision analysis
 */
export async function describeProduct(
  imageBase64: string,
  visionContext?: VisionAnalysisResult
): Promise<ProductDescription> {
  const client = getAnthropic();

  // Build context from Vision analysis if available
  let contextHints = '';
  if (visionContext) {
    const hints: string[] = [];
    if (visionContext.labels.length > 0) {
      hints.push(`Labels: ${visionContext.labels.slice(0, 10).map(l => l.description).join(', ')}`);
    }
    if (visionContext.webEntities.length > 0) {
      hints.push(`Web entities: ${visionContext.webEntities.slice(0, 5).map(e => e.description).join(', ')}`);
    }
    if (visionContext.fullText) {
      hints.push(`Text in image: ${visionContext.fullText.slice(0, 200)}`);
    }
    if (visionContext.logos.length > 0) {
      hints.push(`Logos: ${visionContext.logos.map(l => l.description).join(', ')}`);
    }
    if (hints.length > 0) {
      contextHints = `\n\nContext from image analysis:\n${hints.join('\n')}`;
    }
  }

  // Clean base64
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // Determine media type
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
  if (imageBase64.includes('data:image/png')) {
    mediaType = 'image/png';
  } else if (imageBase64.includes('data:image/gif')) {
    mediaType = 'image/gif';
  } else if (imageBase64.includes('data:image/webp')) {
    mediaType = 'image/webp';
  }

  try {
    const response = await client.messages.create({
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
              data: cleanBase64
            }
          },
          {
            type: 'text',
            text: `You are analyzing a theme park merchandise product image. This is likely from Disney, Universal, or SeaWorld Orlando.

Analyze this product image and provide a JSON response with:

1. **name**: The product name (be specific, e.g., "Figment Purple Dragon Popcorn Bucket" not just "Popcorn Bucket")
2. **description**: A detailed 2-3 sentence description
3. **characters**: Array of Disney/Universal/SeaWorld characters featured (e.g., ["Mickey Mouse", "Minnie Mouse"])
4. **themes**: Array of themes (e.g., ["50th Anniversary", "Halloween", "Haunted Mansion"])
5. **colors**: Array of main colors
6. **productType**: The type of product (e.g., "popcorn_bucket", "spirit_jersey", "ears", "loungefly", "plush", "pin", "mug", "magicband", "apparel", "ornament", "toy", "sipper", "bag", "other")
7. **estimatedCategory**: One of: merchandise, apparel, accessories, collectibles, home_decor, toys, food, other
8. **estimatedPark**: Which park this is from: "disney", "universal", "seaworld", or null if unclear
9. **searchTerms**: Array of 5-10 search terms someone might use to find this product online
10. **confidence**: 0-100 how confident you are in this identification
${contextHints}

Respond ONLY with valid JSON, no markdown or explanation.`
          }
        ]
      }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    let jsonStr = textContent.text.trim();
    // Handle potential markdown code blocks
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    console.log('[DescribeProduct] Generated description:', parsed.name);

    return {
      name: parsed.name || 'Unknown Product',
      description: parsed.description || '',
      characters: parsed.characters || [],
      themes: parsed.themes || [],
      colors: parsed.colors || [],
      productType: parsed.productType || 'other',
      estimatedCategory: parsed.estimatedCategory || 'other',
      estimatedPark: parsed.estimatedPark || null,
      searchTerms: parsed.searchTerms || [],
      confidence: parsed.confidence || 50
    };

  } catch (error) {
    console.error('[DescribeProduct] Error:', error);

    // Return a basic result based on vision context
    return {
      name: visionContext?.webEntities[0]?.description || 'Unknown Product',
      description: '',
      characters: [],
      themes: [],
      colors: [],
      productType: 'other',
      estimatedCategory: 'other',
      estimatedPark: null,
      searchTerms: visionContext?.labels.slice(0, 5).map(l => l.description) || [],
      confidence: 10
    };
  }
}

/**
 * Generate search queries for finding this product online
 */
export function generateSearchQueries(description: ProductDescription): string[] {
  const queries: string[] = [];

  // Primary query with full name
  if (description.estimatedPark) {
    queries.push(`${description.name} ${description.estimatedPark}`);
  } else {
    queries.push(description.name);
  }

  // Add character-specific queries
  for (const character of description.characters.slice(0, 2)) {
    queries.push(`${character} ${description.productType} theme park merchandise`);
  }

  // Add theme-specific queries
  for (const theme of description.themes.slice(0, 2)) {
    queries.push(`${theme} ${description.productType} merchandise`);
  }

  // Add blog-specific queries
  const blogSites = ['WDWNT', 'BlogMickey', 'Disney Food Blog'];
  if (description.estimatedPark === 'disney') {
    queries.push(`${description.name} site:wdwnt.com OR site:blogmickey.com`);
  }

  return queries;
}
