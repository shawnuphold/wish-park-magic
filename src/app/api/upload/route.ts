import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { getPresignedUploadUrl, getPresignedReleaseUploadUrl, ImageFolder } from '@/lib/s3';
import { validateRequestBody, uploadRequestSchema } from '@/lib/validations';
import { v4 as uuidv4 } from 'uuid';

// POST requires authentication - no anonymous uploads
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  // Validate request body
  const validation = await validateRequestBody(request, uploadRequestSchema);
  if (!validation.success) return validation.response;

  const { fileName, contentType, folder, releaseId } = validation.data;

  try {
    // Generate unique filename
    const extension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `${uuidv4()}.${extension}`;

    // If releaseId is provided, use the releases/{releaseId}/ path structure
    if (releaseId) {
      const { uploadUrl, fileUrl } = await getPresignedReleaseUploadUrl(
        releaseId,
        uniqueFileName,
        contentType
      );

      return NextResponse.json({
        uploadUrl,
        fileUrl,
        fileName: uniqueFileName,
      });
    }

    // Use folder-based path (already validated by schema)
    const { uploadUrl, fileUrl } = await getPresignedUploadUrl(
      folder as ImageFolder,
      uniqueFileName,
      contentType
    );

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      fileName: uniqueFileName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
