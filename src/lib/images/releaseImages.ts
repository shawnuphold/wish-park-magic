// Type checking enabled
/**
 * Release Image Management
 *
 * Image sources with priority order:
 * 1. manual - Tracy's own photos (highest trust, public)
 * 2. blog - Article images (public, cite the blog)
 * 3. shopdisney - Admin reference only (NEVER public)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import type { ReleaseImage, ImageSource } from '../database.types';
import { createLogger } from '@/lib/logger';

const log = createLogger('Images');

// Lazy initialization for S3 client (env vars may not be loaded at module init)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_S3_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

function getS3Bucket(): string {
  return process.env.AWS_S3_BUCKET!;
}

function getS3Region(): string {
  return process.env.AWS_S3_REGION!;
}

/**
 * Download an image from a URL
 */
async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnchantedParkPickups/1.0)',
      },
    });

    if (!response.ok) {
      log.error(`Failed to download image`, null, { status: response.status });
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate it's an image
    if (!contentType.startsWith('image/')) {
      log.error(`Not an image`, null, { contentType });
      return null;
    }

    // Check file size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      log.error('Image too large (>10MB)');
      return null;
    }

    return { buffer, contentType };
  } catch (error) {
    log.error('Failed to download image', error);
    return null;
  }
}

/**
 * Get file extension from content type
 */
function getExtension(contentType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return extensions[contentType] || 'jpg';
}

/**
 * Upload a buffer to S3
 */
async function uploadToS3(
  buffer: Buffer,
  contentType: string,
  releaseId: string
): Promise<string> {
  const extension = getExtension(contentType);
  const fileName = `${uuidv4()}.${extension}`;
  const key = `releases/${releaseId}/${fileName}`;
  const bucket = getS3Bucket();
  const region = getS3Region();

  await getS3Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // ACL removed - bucket uses "Bucket owner enforced" ownership
    // Public access is controlled via bucket policy
  }));

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Upload a buffer directly to S3 (for cropped images)
 * Returns the S3 URL if successful
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  releaseId: string,
  contentType: string = 'image/jpeg'
): Promise<string | null> {
  try {
    const s3Url = await uploadToS3(buffer, contentType, releaseId);
    log.debug(`Stored cropped image`, { url: s3Url });
    return s3Url;
  } catch (error) {
    log.error('Failed to upload buffer to S3', error);
    return null;
  }
}

/**
 * Store original full-size image to S3 (before cropping)
 * Uses 'originals' subfolder to distinguish from cropped versions
 */
export async function storeOriginalImage(
  imageUrl: string,
  releaseId: string
): Promise<string | null> {
  try {
    const imageData = await downloadImage(imageUrl);
    if (!imageData) {
      return null;
    }

    const extension = getExtension(imageData.contentType);
    const fileName = `original-${uuidv4()}.${extension}`;
    const key = `releases/${releaseId}/originals/${fileName}`;
    const bucket = getS3Bucket();
    const region = getS3Region();

    await getS3Client().send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: imageData.buffer,
      ContentType: imageData.contentType,
    }));

    const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    log.debug(`Stored original image`, { url: s3Url });
    return s3Url;
  } catch (error) {
    log.error('Failed to store original image', error);
    return null;
  }
}

/**
 * Download an image from URL and store in S3
 * Returns the S3 URL if successful
 */
export async function downloadAndStoreImage(
  imageUrl: string,
  releaseId: string,
  source: ImageSource
): Promise<string | null> {
  // Download the image
  const imageData = await downloadImage(imageUrl);
  if (!imageData) {
    return null;
  }

  try {
    // Upload to S3
    const s3Url = await uploadToS3(imageData.buffer, imageData.contentType, releaseId);
    log.debug(`Stored image`, { source, url: s3Url });
    return s3Url;
  } catch (error) {
    log.error('Failed to upload to S3', error);
    return null;
  }
}

/**
 * Create a ReleaseImage object
 */
export function createReleaseImage(
  url: string,
  source: ImageSource,
  caption?: string
): ReleaseImage {
  return {
    url,
    source,
    caption: caption || '',
    uploaded_at: new Date().toISOString(),
  };
}

/**
 * Add an image to a release's image array
 */
export function addImageToRelease(
  currentImages: ReleaseImage[],
  newImage: ReleaseImage
): ReleaseImage[] {
  // Check if URL already exists
  if (currentImages.some(img => img.url === newImage.url)) {
    return currentImages;
  }

  // Add new image and sort by source priority
  const updated = [...currentImages, newImage];
  return sortImagesByPriority(updated);
}

/**
 * Sort images by source priority: manual > blog > shopdisney
 */
export function sortImagesByPriority(images: ReleaseImage[]): ReleaseImage[] {
  const priority: Record<ImageSource, number> = {
    manual: 0,
    blog: 1,
    shopdisney: 2,
  };

  return [...images].sort((a, b) => {
    const priorityDiff = priority[a.source] - priority[b.source];
    if (priorityDiff !== 0) return priorityDiff;
    // For same source, sort by date (newest first)
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  });
}

/**
 * Get only public images (manual and blog sources)
 * NEVER include shopDisney images in public views
 */
export function getPublicImages(images: ReleaseImage[]): ReleaseImage[] {
  return images.filter(img => img.source === 'manual' || img.source === 'blog');
}

/**
 * Get all images including admin-only sources
 */
export function getAdminImages(images: ReleaseImage[]): ReleaseImage[] {
  return sortImagesByPriority(images);
}

/**
 * Get the primary image for display
 * Returns the highest priority image, or null if none available
 */
export function getPrimaryImage(images: ReleaseImage[], forPublic: boolean = true): ReleaseImage | null {
  const filtered = forPublic ? getPublicImages(images) : getAdminImages(images);
  return filtered.length > 0 ? filtered[0] : null;
}

/**
 * Get the primary image URL for display
 * Falls back to the legacy image_url field if needed
 */
export function getPrimaryImageUrl(
  images: ReleaseImage[],
  legacyImageUrl: string | null,
  forPublic: boolean = true
): string | null {
  const primary = getPrimaryImage(images, forPublic);
  if (primary) return primary.url;

  // If forPublic and no public images, don't show the legacy image either
  // (it might be from shopDisney)
  if (forPublic && images.length > 0 && images.every(img => img.source === 'shopdisney')) {
    return null;
  }

  return legacyImageUrl || null;
}

/**
 * Extract image URLs from HTML content
 */
export function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const images: string[] = [];

  // Match img tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (isValidImageUrl(src)) {
      images.push(resolveUrl(src, baseUrl));
    }
  }

  // Match data-src attributes (lazy loading)
  const dataSrcRegex = /data-src=["']([^"']+)["']/gi;
  while ((match = dataSrcRegex.exec(html)) !== null) {
    const src = match[1];
    if (isValidImageUrl(src)) {
      images.push(resolveUrl(src, baseUrl));
    }
  }

  // Match og:image meta tags
  const ogRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  while ((match = ogRegex.exec(html)) !== null) {
    const src = match[1];
    if (isValidImageUrl(src)) {
      images.push(resolveUrl(src, baseUrl));
    }
  }

  // Deduplicate and filter
  return [...new Set(images)].filter(url => !isExcludedImage(url));
}

/**
 * Check if URL is a valid image URL
 */
function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  if (url.startsWith('data:')) return false;

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const lowered = url.toLowerCase();

  // Check extension
  const hasImageExtension = imageExtensions.some(ext => lowered.includes(ext));

  // Or check if it's a CDN/image service URL
  const isCdnUrl = lowered.includes('cloudinary') ||
                   lowered.includes('imgix') ||
                   lowered.includes('amazonaws') ||
                   lowered.includes('cdn');

  return hasImageExtension || isCdnUrl;
}

/**
 * Check if image should be excluded (icons, avatars, logos, etc.)
 */
function isExcludedImage(url: string): boolean {
  const lowered = url.toLowerCase();
  const excludePatterns = [
    'avatar',
    'logo',
    'icon',
    'favicon',
    'sprite',
    'badge',
    'button',
    'arrow',
    'social',
    'twitter',
    'facebook',
    'instagram',
    'pinterest',
    'email',
    'share',
    'ad-',
    'ads/',
    'advertisement',
    'banner-ad',
    'placeholder',
    '1x1',
    'pixel',
    'tracking',
  ];

  return excludePatterns.some(pattern => lowered.includes(pattern));
}

/**
 * Resolve relative URLs
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}
