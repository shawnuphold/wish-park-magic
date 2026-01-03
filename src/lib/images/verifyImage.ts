// Type checking enabled
/**
 * AI Image Verification
 * Uses Claude to verify an image matches a product before saving
 */

import Anthropic from '@anthropic-ai/sdk';

let anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

/**
 * Download image and convert to base64
 * Skips images larger than 4MB to avoid API limits
 */
async function imageToBase64(url: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnchantedParkPickups/1.0)',
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();

    // Skip images larger than 4MB (API limit is 5MB)
    if (arrayBuffer.byteLength > 4 * 1024 * 1024) {
      console.log(`    (skipping - image too large: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);
      return null;
    }

    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Map content type to Anthropic's expected format
    let mediaType = 'image/jpeg';
    if (contentType.includes('png')) mediaType = 'image/png';
    else if (contentType.includes('gif')) mediaType = 'image/gif';
    else if (contentType.includes('webp')) mediaType = 'image/webp';

    return { base64, mediaType };
  } catch (error) {
    console.error('Failed to download image for verification:', error);
    return null;
  }
}

/**
 * Use AI to verify an image matches a product name
 * Returns true if the image appears to show the product, false otherwise
 */
export async function verifyImageMatchesProduct(
  imageUrl: string,
  productName: string,
  productCategory?: string
): Promise<{ matches: boolean; confidence: string; reason: string }> {
  const imageData = await imageToBase64(imageUrl);

  if (!imageData) {
    return { matches: false, confidence: 'none', reason: 'Could not download image' };
  }

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageData.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageData.base64,
            },
          },
          {
            type: 'text',
            text: `Does this image show the following Disney/Universal theme park merchandise product?

Product Name: ${productName}
${productCategory ? `Category: ${productCategory}` : ''}

Respond with ONLY a JSON object in this exact format:
{
  "matches": true/false,
  "confidence": "high"/"medium"/"low",
  "reason": "brief explanation"
}

Be strict - the image should clearly show this specific product. If it's a generic image, header image, logo, or different product, say matches: false.`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        matches: result.matches === true,
        confidence: result.confidence || 'unknown',
        reason: result.reason || 'No reason provided',
      };
    }

    return { matches: false, confidence: 'none', reason: 'Could not parse AI response' };
  } catch (error) {
    console.error('AI image verification failed:', error);
    return { matches: false, confidence: 'none', reason: 'AI verification error' };
  }
}

/**
 * Find the best matching image from a list of URLs for a given product
 */
export async function findBestImageForProduct(
  imageUrls: string[],
  productName: string,
  productCategory?: string
): Promise<string | null> {
  // Try up to 10 images to find a match (some may be skipped due to size)
  const candidates = imageUrls.slice(0, 10);

  for (const url of candidates) {
    console.log(`  Checking image: ${url.slice(-60)}...`);
    const result = await verifyImageMatchesProduct(url, productName, productCategory);

    if (result.matches && (result.confidence === 'high' || result.confidence === 'medium')) {
      console.log(`    ✓ Match found (${result.confidence}): ${result.reason}`);
      return url;
    } else {
      console.log(`    ✗ No match: ${result.reason}`);
    }
  }

  return null;
}
