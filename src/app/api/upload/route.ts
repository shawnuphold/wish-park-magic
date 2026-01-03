// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl, ImageFolder } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, contentType, folder } = body as {
      fileName: string;
      contentType: string;
      folder: ImageFolder;
    };

    // Validate content type
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: jpg, jpeg, png, webp, gif' },
        { status: 400 }
      );
    }

    // Validate folder
    const validFolders: ImageFolder[] = ['reference-images', 'found-images', 'receipts'];
    if (!validFolders.includes(folder)) {
      return NextResponse.json(
        { error: 'Invalid folder' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const extension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `${uuidv4()}.${extension}`;

    const { uploadUrl, fileUrl } = await getPresignedUploadUrl(
      folder,
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
