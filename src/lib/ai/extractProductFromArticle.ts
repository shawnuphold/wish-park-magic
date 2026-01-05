/**
 * Extract Product Information from Disney Blog Articles
 *
 * Uses ScraperAPI to fetch article HTML from blocked sites like WDWNT,
 * then uses Claude to extract product details from the article content.
 */

import Anthropic from '@anthropic-ai/sdk';
import { smartFetchText } from '@/lib/scraper/proxyFetch';

const anthropic = new Anthropic();

export interface ExtractedProductInfo {
  productName: string;
  price?: number;
  location?: string;
  category?: string;
  isLimitedEdition?: boolean;
  releaseDate?: string;
  description?: string;
}

export interface ArticleExtractionResult {
  success: boolean;
  product?: ExtractedProductInfo;
  error?: string;
  sourceUrl: string;
}

/**
 * Fetch article HTML and extract product information using Claude
 * @param articleUrl - URL of the Disney blog article
 * @param productHint - Optional hint from Lens match (e.g. "Disney Parks 2025 WDW Sherpa Zip Up Jacket")
 */
export async function extractProductFromArticle(
  articleUrl: string,
  productHint?: string
): Promise<ArticleExtractionResult> {
  console.log(`[ArticleExtract] Fetching article: ${articleUrl}`);
  if (productHint) {
    console.log(`[ArticleExtract] Product hint: ${productHint}`);
  }

  try {
    // Fetch article HTML via ScraperAPI (for blocked domains)
    const html = await smartFetchText(articleUrl);
    console.log(`[ArticleExtract] Fetched ${html.length} bytes`);

    // Extract text content - strip HTML tags but keep structure
    const textContent = extractTextFromHtml(html);
    console.log(`[ArticleExtract] Extracted ${textContent.length} chars of text`);

    // Build prompt - with or without product hint
    const prompt = productHint
      ? `Extract product information from this Disney merchandise article.

We're specifically looking for a product matching: "${productHint}"

ARTICLE TEXT:
${textContent.substring(0, 10000)}

Find the product that best matches "${productHint}" and return as JSON only:
{
  "productName": "Full product name as it would appear on a price tag",
  "price": 69.99,
  "location": "Store or park location where available",
  "category": "spirit_jersey|popcorn_bucket|ears|apparel|other",
  "description": "Brief description of the product"
}

RULES:
- Find the product matching the hint (look for keywords: sherpa, fleece, puffer, jacket, etc.)
- productName should be the official product name from the article
- price should be a number (no $ symbol)
- category must be one of: spirit_jersey, popcorn_bucket, ears, apparel, other
- If info is not found, omit that field
- Return ONLY valid JSON, no other text`
      : `Extract product information from this Disney blog article. The article is about a Disney park product (merchandise, spirit jersey, ears, etc.).

ARTICLE TEXT:
${textContent.substring(0, 8000)}

Extract the following information and return as JSON only:
{
  "productName": "Full product name as it would appear on a price tag",
  "price": 69.99,
  "location": "Store or park location where available",
  "category": "spirit_jersey|popcorn_bucket|ears|apparel|other",
  "isLimitedEdition": true,
  "releaseDate": "2024-12-15",
  "description": "Brief description of the product"
}

RULES:
- productName should be the official product name (e.g., "Walt Disney World Spirit Jersey - Pearl Pink")
- price should be a number (no $ symbol)
- category must be one of: spirit_jersey, popcorn_bucket, ears, apparel, other
- If info is not found, omit that field
- Return ONLY valid JSON, no other text`;

    // Use Claude to extract product info
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[ArticleExtract] Claude response:', text.substring(0, 300));

    // Strip markdown code blocks if present
    let jsonStr = text;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\s*/g, '');
    }

    // Parse JSON from response - match first complete JSON object
    const jsonMatch = jsonStr.match(/\{[^{}]*\}/);
    if (jsonMatch) {
      try {
        const product = JSON.parse(jsonMatch[0]) as ExtractedProductInfo;
        console.log(`[ArticleExtract] Extracted product: ${product.productName}`);
        return {
          success: true,
          product,
          sourceUrl: articleUrl
        };
      } catch (parseError) {
        console.error('[ArticleExtract] JSON parse error:', parseError, 'Raw:', jsonMatch[0].substring(0, 200));
      }
    }

    console.log('[ArticleExtract] Could not parse JSON from response');
    return {
      success: false,
      error: 'Could not parse product info from article',
      sourceUrl: articleUrl
    };

  } catch (error) {
    console.error('[ArticleExtract] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      sourceUrl: articleUrl
    };
  }
}

/**
 * Extract readable text from HTML
 * Removes scripts, styles, and HTML tags while preserving structure
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags and their contents
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

  // Convert common elements to text with spacing
  text = text
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return text;
}
