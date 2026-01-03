// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getPresignedReadUrl, S3_BUCKET, S3_REGION } from '@/lib/s3';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
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
