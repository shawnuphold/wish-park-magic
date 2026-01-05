import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const S3_BUCKET = process.env.AWS_S3_BUCKET!;
export const S3_REGION = process.env.AWS_S3_REGION!;

export type ImageFolder = 'reference-images' | 'found-images' | 'receipts' | 'release-images' | 'temp-lookup';

export async function getPresignedUploadUrl(
  folder: ImageFolder,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; fileUrl: string }> {
  const key = `${folder}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    // ACL removed - bucket uses "Bucket owner enforced" ownership
    // Public access is controlled via bucket policy
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const fileUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl };
}

// Generate a presigned URL for reading (fallback if public access doesn't work)
export async function getPresignedReadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export function getS3Url(key: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

// Generate a presigned URL for uploading to releases/{releaseId}/ path (publicly accessible)
export async function getPresignedReleaseUploadUrl(
  releaseId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; fileUrl: string }> {
  const key = `releases/${releaseId}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const fileUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl };
}

/**
 * Upload a buffer directly to S3 in the specified folder
 * Returns the public S3 URL
 */
export async function uploadBufferToFolder(
  buffer: Buffer,
  folder: ImageFolder,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const extension = contentType.split('/')[1] === 'jpeg' ? 'jpg' : (contentType.split('/')[1] || 'jpg');
  const fileName = `${uuidv4()}.${extension}`;
  const key = `${folder}/${fileName}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

/**
 * Upload a buffer to S3 and return a presigned read URL
 * Use this for external services like Google Lens that need accessible URLs
 */
export async function uploadBufferForExternalAccess(
  buffer: Buffer,
  folder: ImageFolder,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const extension = contentType.split('/')[1] === 'jpeg' ? 'jpg' : (contentType.split('/')[1] || 'jpg');
  const fileName = `${uuidv4()}.${extension}`;
  const key = `${folder}/${fileName}`;

  // Upload the file
  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  // Return a presigned URL that external services can access (1 hour expiry)
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
