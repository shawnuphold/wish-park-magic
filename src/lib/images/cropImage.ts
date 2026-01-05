/**
 * Image Cropping Utilities
 *
 * Extract regions from images using bounding box coordinates.
 * Used to extract product images from FB/Messenger screenshots.
 */

import sharp from 'sharp';
import type { BoundingBox } from '../ai/detectImageType';

/**
 * Crop a region from an image buffer using percentage-based coordinates
 */
export async function cropImageRegion(
  imageBuffer: Buffer,
  boundingBox: BoundingBox
): Promise<Buffer> {
  // Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width || 1000;
  const imgHeight = metadata.height || 1000;

  // Convert percentages to pixels
  const left = Math.round((boundingBox.x / 100) * imgWidth);
  const top = Math.round((boundingBox.y / 100) * imgHeight);
  const width = Math.round((boundingBox.width / 100) * imgWidth);
  const height = Math.round((boundingBox.height / 100) * imgHeight);

  // Ensure bounds are valid
  const safeLeft = Math.max(0, Math.min(left, imgWidth - 1));
  const safeTop = Math.max(0, Math.min(top, imgHeight - 1));
  const safeWidth = Math.min(width, imgWidth - safeLeft);
  const safeHeight = Math.min(height, imgHeight - safeTop);

  // Minimum size check
  if (safeWidth < 50 || safeHeight < 50) {
    console.warn(`[Crop] Region too small: ${safeWidth}x${safeHeight}, using minimum`);
  }

  const finalWidth = Math.max(50, safeWidth);
  const finalHeight = Math.max(50, safeHeight);

  console.log(`[Crop] Image: ${imgWidth}x${imgHeight}, extracting: ${safeLeft},${safeTop} ${finalWidth}x${finalHeight}`);

  return sharp(imageBuffer)
    .extract({
      left: safeLeft,
      top: safeTop,
      width: Math.min(finalWidth, imgWidth - safeLeft),
      height: Math.min(finalHeight, imgHeight - safeTop)
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Crop multiple regions from an image
 */
export async function cropMultipleRegions(
  imageBuffer: Buffer,
  regions: BoundingBox[]
): Promise<Buffer[]> {
  const croppedImages: Buffer[] = [];

  for (let i = 0; i < regions.length; i++) {
    try {
      console.log(`[Crop] Processing region ${i + 1}/${regions.length}`);
      const cropped = await cropImageRegion(imageBuffer, regions[i]);
      croppedImages.push(cropped);
    } catch (error) {
      console.error(`[Crop] Failed to crop region ${i + 1}:`, error);
    }
  }

  return croppedImages;
}
