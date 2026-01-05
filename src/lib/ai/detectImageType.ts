/**
 * Image Type Detection and Product Region Extraction
 *
 * Uses Claude Vision to analyze screenshots and identify:
 * - Image type (FB screenshot vs product photo)
 * - Bounding boxes of embedded product images
 * - Customer name if visible
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export type ImageType = 'fb_screenshot' | 'messenger_screenshot' | 'product_photo' | 'other';

export interface BoundingBox {
  x: number;      // percentage from left (0-100)
  y: number;      // percentage from top (0-100)
  width: number;  // percentage of image width
  height: number; // percentage of image height
}

export interface ImageRegion {
  description: string;
  boundingBox: BoundingBox;
  isProduct: boolean;
}

export interface ImageAnalysis {
  type: ImageType;
  productRegions: ImageRegion[];
  customerName?: string;
  hasEmbeddedImages: boolean;
}

/**
 * Analyze a screenshot to detect image type and locate product images
 */
export async function analyzeScreenshot(imageBase64: string): Promise<ImageAnalysis> {
  console.log('[DetectImageType] Analyzing screenshot...');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
            }
          },
          {
            type: 'text',
            text: `Analyze this image and identify:

1. IMAGE TYPE: Is this a Facebook/Messenger screenshot, or a standalone product photo?
   - 'fb_screenshot' = Facebook post with comments/reactions
   - 'messenger_screenshot' = Facebook Messenger conversation with chat bubbles
   - 'product_photo' = Just a product image (no social media UI)
   - 'other' = Something else

2. EMBEDDED PRODUCT IMAGES: If this is a screenshot, locate EACH INDIVIDUAL product image.
   IMPORTANT: Create a SEPARATE bounding box for EACH product, even if they appear close together.

   For EACH product image found, provide the bounding box as percentages:
   - x: distance from left edge (0-100%)
   - y: distance from top edge (0-100%)
   - width: width of the region (0-100%)
   - height: height of the region (0-100%)

   RULES:
   - ONE product per bounding box (never combine multiple products)
   - Be PRECISE - these coordinates will be used to crop the image
   - Only include actual product photos (not icons, profile pics, or UI elements)
   - If products are stacked vertically, create separate boxes for each
   - Add a few pixels of padding around each product

3. CUSTOMER NAME: If visible in the screenshot (e.g., at top of Messenger chat), extract it.

Return JSON only, no other text:
{
  "type": "messenger_screenshot",
  "hasEmbeddedImages": true,
  "customerName": "Nicole Bishop",
  "productRegions": [
    {
      "description": "Pink spirit jersey",
      "boundingBox": { "x": 10, "y": 20, "width": 80, "height": 25 },
      "isProduct": true
    },
    {
      "description": "Gray sherpa fleece jacket",
      "boundingBox": { "x": 10, "y": 50, "width": 80, "height": 25 },
      "isProduct": true
    }
  ]
}

CRITICAL RULES:
- Create ONE entry per product (NEVER combine "Pink jersey and gray fleece" into one entry)
- Each productRegion should contain exactly ONE product
- If you see 2 products, return 2 separate productRegions with different bounding boxes
- Be accurate with bounding boxes - include a few pixels of padding
- If there are no product images, return empty productRegions array`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[DetectImageType] Raw response:', text.substring(0, 500));

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]) as ImageAnalysis;
      console.log(`[DetectImageType] Type: ${analysis.type}, Regions: ${analysis.productRegions?.length || 0}`);
      return analysis;
    }

    console.log('[DetectImageType] Could not parse JSON from response');
    return {
      type: 'other',
      productRegions: [],
      hasEmbeddedImages: false
    };

  } catch (error) {
    console.error('[DetectImageType] Error:', error);
    return {
      type: 'other',
      productRegions: [],
      hasEmbeddedImages: false
    };
  }
}
