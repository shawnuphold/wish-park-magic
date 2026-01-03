import { z } from 'zod';
import {
  parkSchema,
  itemCategorySchema,
  releaseStatusSchema,
  optionalUrlSchema,
  priceSchema,
  demandScoreSchema,
  tagsArraySchema,
} from './common';

// POST /api/releases - Create new release
export const createReleaseSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters')
    .trim(),
  description: z.string()
    .max(5000, 'Description too long')
    .optional()
    .nullable(),
  image_url: optionalUrlSchema,
  source_url: optionalUrlSchema,
  source: z.string().max(100).default('Manual'),
  park: parkSchema,
  category: itemCategorySchema,
  price_estimate: priceSchema.optional().nullable(),
  release_date: z.string().optional(),
  is_limited_edition: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  ai_tags: tagsArraySchema.optional(),
  ai_demand_score: demandScoreSchema.default(5),
  location: z.string().max(200).optional().nullable(),
});

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;

// PATCH /api/releases/[id] - Update release
export const updateReleaseSchema = z.object({
  status: releaseStatusSchema.optional(),
  title: z.string().min(1).max(500).trim().optional(),
  description: z.string().max(5000).optional().nullable(),
  image_url: optionalUrlSchema,
  park: parkSchema.optional(),
  category: itemCategorySchema.optional(),
  price_estimate: priceSchema.optional().nullable(),
  is_limited_edition: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  ai_tags: tagsArraySchema.optional(),
  ai_demand_score: demandScoreSchema.optional(),
  location: z.string().max(200).optional().nullable(),
}).refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;

// POST /api/releases/process - Process feeds
export const processFeedsSchema = z.object({
  sourceId: z.string().uuid().optional(),
});

export type ProcessFeedsInput = z.infer<typeof processFeedsSchema>;
