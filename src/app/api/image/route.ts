import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { getPresignedReadUrl, S3_BUCKET, S3_REGION } from '@/lib/s3';
import { createLogger } from '@/lib/logger';
import { smartFetch } from '@/lib/scraper/proxyFetch';

const log = createLogger('ImageProxy');

// SSRF Protection: Only allow proxying from trusted image sources
const ALLOWED_PROXY_DOMAINS = [
  // Our S3 bucket
  `${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`,
  `${S3_BUCKET}.s3.amazonaws.com`,
  // Trusted blog/news image sources
  'wdwnt.com',
  'www.wdwnt.com',
  'blogmickey.com',
  'www.blogmickey.com',
  'laughingplace.com',
  'www.laughingplace.com',
  'touringplans.com',
  'cdn.touringplans.com',
  'themeparkuniversity.com',
  'insidethemagic.net',
  'www.insidethemagic.net',
  'allears.net',
  'www.allears.net',
  'orlandoparksnews.com',
  'www.orlandoparksnews.com',
  // CDN domains commonly used
  'i0.wp.com',
  'i1.wp.com',
  'i2.wp.com',
  'secure.gravatar.com',
];

function isAllowedProxyUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Block non-HTTPS (except localhost for dev)
    if (url.protocol !== 'https:') {
      return false;
    }

    // Block internal/private IPs
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname === '169.254.169.254' || // AWS metadata
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Check against allowlist
    return ALLOWED_PROXY_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// Image proxy/signing endpoint - requires auth to prevent abuse
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  const url = request.nextUrl.searchParams.get('url');
  const proxy = request.nextUrl.searchParams.get('proxy') === 'true';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // If proxy mode, fetch the image and return it directly (for CORS-free canvas access)
    if (proxy) {
      // SSRF Protection: Only allow proxying from trusted domains
      if (!isAllowedProxyUrl(url)) {
        log.warn('SSRF: Blocked proxy request for untrusted URL', { url });
        return NextResponse.json(
          { error: 'URL not in allowed proxy list' },
          { status: 403 }
        );
      }

      // Use smartFetch which routes blocked domains through ScraperAPI
      const response = await smartFetch(url);

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Extract the key from the S3 URL
    const s3UrlPrefix = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;

    if (!url.startsWith(s3UrlPrefix)) {
      // If it's not our S3 bucket, just return the original URL
      return NextResponse.json({ signedUrl: url });
    }

    const key = url.replace(s3UrlPrefix, '');
    const signedUrl = await getPresignedReadUrl(key);

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }
}
