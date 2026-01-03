import { z } from 'zod';

// UUID validation (matches Supabase IDs)
export const uuidSchema = z.string().uuid('Invalid ID format');

// Email with normalization
export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email too long')
  .transform(v => v.toLowerCase().trim());

// Phone (optional, permissive format)
export const phoneSchema = z.string()
  .max(20, 'Phone number too long')
  .optional()
  .nullable();

// URL validation
export const urlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL too long');

// Optional URL that allows empty string
export const optionalUrlSchema = urlSchema.optional().or(z.literal(''));

// Date strings (ISO format)
export const dateStringSchema = z.string()
  .datetime({ message: 'Invalid date format' })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'));

// Enums matching database.types.ts
export const parkSchema = z.enum(['disney', 'universal', 'seaworld']);

export const parkLocationSchema = z.enum([
  'disney_mk',
  'disney_epcot',
  'disney_hs',
  'disney_ak',
  'disney_springs',
  'universal_usf',
  'universal_ioa',
  'universal_citywalk',
  'universal_epic',
  'seaworld',
  'multiple',
]);

export const itemCategorySchema = z.enum([
  'loungefly',
  'ears',
  'spirit_jersey',
  'popcorn_bucket',
  'pins',
  'plush',
  'apparel',
  'drinkware',
  'collectible',
  'home_decor',
  'toys',
  'jewelry',
  'other',
]);

export const releaseStatusSchema = z.enum([
  'rumored',
  'announced',
  'coming_soon',
  'available',
  'sold_out',
]);

export const requestStatusSchema = z.enum([
  'pending',
  'quoted',
  'approved',
  'scheduled',
  'shopping',
  'found',
  'invoiced',
  'paid',
  'shipped',
  'delivered',
]);

export const releaseSourceTypeSchema = z.enum(['rss', 'scrape', 'api', 'manual']);

// Price validation (positive number, reasonable max)
export const priceSchema = z.number()
  .min(0, 'Price cannot be negative')
  .max(10000, 'Price seems too high');

// Quantity validation
export const quantitySchema = z.number()
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(100, 'Quantity too high');

// Demand score (1-10)
export const demandScoreSchema = z.number()
  .min(1, 'Demand score must be at least 1')
  .max(10, 'Demand score must be at most 10');

// Tags array
export const tagsArraySchema = z.array(z.string().max(50)).max(20, 'Too many tags');

// Keywords array
export const keywordsArraySchema = z.array(z.string().max(100).trim()).max(20, 'Maximum 20 keywords allowed');
