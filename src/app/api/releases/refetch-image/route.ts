import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractImagesFromHtml } from '@/lib/images/releaseImages';
import * as cheerio from 'cheerio';
import { requireAdminAuth } from '@/lib/auth/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fetch article HTML with proper headers to avoid 403
async function fetchArticleHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: HTTP ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

// Extract images from HTML using cheerio (same approach as scrapeArticle)
function extractImagesFromPage(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const images: string[] = [];
  const seenImages = new Set<string>();

  $('img').each((_, el) => {
    // Get src from various attributes
    let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');

    // Also check srcset for higher quality images
    const srcset = $(el).attr('srcset') || $(el).attr('data-srcset');
    if (srcset) {
      const srcsetParts = srcset.split(',').map(s => s.trim().split(' ')[0]);
      if (srcsetParts.length > 0) {
        src = srcsetParts[srcsetParts.length - 1] || src;
      }
    }

    if (src && !src.includes('avatar') && !src.includes('logo') && !src.includes('icon') && !src.includes('subscribe')) {
      try {
        // Clean up the URL
        let cleanUrl = src.split('?')[0];

        // Make absolute URL if relative
        if (cleanUrl.startsWith('//')) {
          cleanUrl = 'https:' + cleanUrl;
        } else if (cleanUrl.startsWith('/')) {
          const urlObj = new URL(baseUrl);
          cleanUrl = urlObj.origin + cleanUrl;
        } else if (!cleanUrl.startsWith('http')) {
          const urlObj = new URL(baseUrl);
          cleanUrl = urlObj.origin + '/' + cleanUrl;
        }

        // Skip tiny images (likely icons)
        const width = $(el).attr('width');
        const height = $(el).attr('height');
        if (width && height) {
          const w = parseInt(width);
          const h = parseInt(height);
          if (w < 100 || h < 100) return;
        }

        if (!seenImages.has(cleanUrl)) {
          seenImages.add(cleanUrl);
          images.push(cleanUrl);
        }
      } catch (e) {
        // Skip invalid URLs
      }
    }
  });

  return images;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const { releaseId, sourceUrl } = await request.json();

    if (!releaseId) {
      return NextResponse.json({ error: 'Release ID is required' }, { status: 400 });
    }

    // Get the release's raw_content from the database
    const { data: release, error } = await supabase
      .from('new_releases')
      .select('raw_content, source_url')
      .eq('id', releaseId)
      .single();

    if (error || !release) {
      return NextResponse.json(
        { error: 'Release not found' },
        { status: 404 }
      );
    }

    let imageUrls: string[] = [];
    const articleUrl = release.source_url || sourceUrl;

    // First try to extract from stored raw_content
    if (release.raw_content) {
      imageUrls = extractImagesFromHtml(release.raw_content, articleUrl || '');
    }

    // If no images from raw_content and we have a source URL, try fetching the page
    if (imageUrls.length === 0 && articleUrl) {
      console.log(`No raw_content images, fetching from: ${articleUrl}`);
      const html = await fetchArticleHtml(articleUrl);
      if (html) {
        imageUrls = extractImagesFromPage(html, articleUrl);
      }
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'No images found. The source may be blocking access or the page has no suitable images.' },
        { status: 404 }
      );
    }

    // Return the first 10 images
    const limitedUrls = imageUrls.slice(0, 10);

    return NextResponse.json({
      imageUrls: limitedUrls,
      total: imageUrls.length,
    });
  } catch (error) {
    console.error('Error fetching images from source:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch images from source';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
