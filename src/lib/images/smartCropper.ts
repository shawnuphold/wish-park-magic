// @ts-nocheck
/**
 * Smart Image Cropper
 * Uses Claude to identify individual products in composite images and crop them
 */

import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';

let anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

interface ProductRegion {
  productName: string;
  description: string;
  x: number;      // percentage from left (0-100)
  y: number;      // percentage from top (0-100)
  width: number;  // percentage of total width (0-100)
  height: number; // percentage of total height (0-100)
}

interface AnalysisResult {
  isComposite: boolean;
  products: ProductRegion[];
}

/**
 * Download image and convert to base64
 */
async function imageToBase64(url: string): Promise<{ base64: string; mediaType: string; buffer: Buffer } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnchantedParkPickups/1.0)',
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Skip images larger than 4MB
    if (buffer.byteLength > 4 * 1024 * 1024) {
      return null;
    }

    const base64 = buffer.toString('base64');

    let mediaType = 'image/jpeg';
    if (contentType.includes('png')) mediaType = 'image/png';
    else if (contentType.includes('gif')) mediaType = 'image/gif';
    else if (contentType.includes('webp')) mediaType = 'image/webp';

    return { base64, mediaType, buffer };
  } catch (error) {
    console.error('Failed to download image:', error);
    return null;
  }
}

/**
 * Analyze an image to identify if it contains multiple products and their locations
 */
export async function analyzeCompositeImage(
  imageUrl: string,
  productNames: string[]
): Promise<AnalysisResult> {
  const imageData = await imageToBase64(imageUrl);

  if (!imageData) {
    return { isComposite: false, products: [] };
  }

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
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
            text: `Analyze this image of Disney/theme park merchandise.

I'm looking for these specific products:
${productNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Does this image show MULTIPLE distinct products that could be cropped into separate images?

If YES, for each visible product that matches one of the names above, provide the approximate bounding box as percentages of the image dimensions (0-100).

Respond ONLY with valid JSON:
{
  "isComposite": true/false,
  "products": [
    {
      "productName": "exact product name from the list above",
      "description": "brief description of what's shown",
      "x": 0-100,
      "y": 0-100,
      "width": 0-100,
      "height": 0-100
    }
  ]
}

Notes:
- x,y is the top-left corner of the product region as percentage
- width,height are the size as percentage of total image
- Only include products that are clearly visible and can be meaningfully cropped
- If products overlap significantly or can't be cleanly separated, set isComposite to false`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        isComposite: result.isComposite === true,
        products: result.products || [],
      };
    }

    return { isComposite: false, products: [] };
  } catch (error) {
    console.error('AI composite analysis failed:', error);
    return { isComposite: false, products: [] };
  }
}

/**
 * Crop a region from an image
 */
export async function cropImageRegion(
  imageUrl: string,
  region: ProductRegion
): Promise<Buffer | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnchantedParkPickups/1.0)',
      },
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get image dimensions
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) return null;

    // Calculate pixel coordinates from percentages
    const x = Math.round((region.x / 100) * metadata.width);
    const y = Math.round((region.y / 100) * metadata.height);
    const width = Math.round((region.width / 100) * metadata.width);
    const height = Math.round((region.height / 100) * metadata.height);

    // Ensure we don't exceed image bounds
    const safeX = Math.max(0, Math.min(x, metadata.width - 1));
    const safeY = Math.max(0, Math.min(y, metadata.height - 1));
    const safeWidth = Math.min(width, metadata.width - safeX);
    const safeHeight = Math.min(height, metadata.height - safeY);

    if (safeWidth < 50 || safeHeight < 50) {
      console.log('Region too small to crop');
      return null;
    }

    // Crop the region
    const croppedBuffer = await sharp(buffer)
      .extract({ left: safeX, top: safeY, width: safeWidth, height: safeHeight })
      .jpeg({ quality: 90 })
      .toBuffer();

    return croppedBuffer;
  } catch (error) {
    console.error('Failed to crop image:', error);
    return null;
  }
}

/**
 * Process a composite image: analyze, crop, and return individual product images
 */
export async function processCompositeImage(
  imageUrl: string,
  productNames: string[]
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>();

  console.log(`  📐 Analyzing image for ${productNames.length} products...`);
  const analysis = await analyzeCompositeImage(imageUrl, productNames);

  if (!analysis.isComposite || analysis.products.length === 0) {
    console.log('  📷 Image is not a composite or products not identified');
    return results;
  }

  console.log(`  ✂️ Found ${analysis.products.length} products to crop`);

  for (const product of analysis.products) {
    console.log(`    Cropping: ${product.productName} (${product.x}%, ${product.y}%, ${product.width}%x${product.height}%)`);
    const croppedBuffer = await cropImageRegion(imageUrl, product);

    if (croppedBuffer) {
      results.set(product.productName, croppedBuffer);
      console.log(`    ✓ Cropped successfully`);
    } else {
      console.log(`    ✗ Failed to crop`);
    }
  }

  return results;
}
