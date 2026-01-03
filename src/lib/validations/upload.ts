import { z } from 'zod';
import { uuidSchema } from './common';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const VALID_FOLDERS = [
  'reference-images',
  'found-images',
  'receipts',
  'release-images',
] as const;

// POST /api/upload - Get presigned upload URL
export const uploadRequestSchema = z.object({
  fileName: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name too long'),
  contentType: z.enum(ALLOWED_TYPES, {
    errorMap: () => ({ message: 'Invalid file type. Allowed: jpg, jpeg, png, webp, gif' })
  }),
  folder: z.enum(VALID_FOLDERS).optional(),
  releaseId: uuidSchema.optional(),
}).refine(
  data => data.folder || data.releaseId,
  { message: 'Either folder or releaseId must be provided' }
);

export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;

// Image folder type
export type ImageFolder = typeof VALID_FOLDERS[number];
