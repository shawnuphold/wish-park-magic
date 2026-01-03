import { z } from 'zod';
import {
  uuidSchema,
  parkSchema,
  itemCategorySchema,
  keywordsArraySchema,
  emailSchema,
  phoneSchema,
} from './common';

// POST /api/customer-interests - Create customer interest
export const createCustomerInterestSchema = z.object({
  customer_id: uuidSchema,
  category: itemCategorySchema.optional().nullable(),
  park: parkSchema.or(z.literal('all')).optional().nullable(),
  keywords: keywordsArraySchema.optional().default([]),
  notify_new_releases: z.boolean().default(true),
});

export type CreateCustomerInterestInput = z.infer<typeof createCustomerInterestSchema>;

// PATCH /api/customer-interests/[id] - Update customer interest
export const updateCustomerInterestSchema = z.object({
  category: itemCategorySchema.optional().nullable(),
  park: parkSchema.or(z.literal('all')).optional().nullable(),
  keywords: keywordsArraySchema.optional(),
  notify_new_releases: z.boolean().optional(),
});

export type UpdateCustomerInterestInput = z.infer<typeof updateCustomerInterestSchema>;

// Customer notification preferences (embedded in customer record)
export const notificationPreferencesSchema = z.object({
  enabled: z.boolean().default(true),
  parks: z.array(parkSchema).default([]),
  categories: z.array(itemCategorySchema).default([]),
  park_exclusives_only: z.boolean().default(false),
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

// Customer create/update
export const customerSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Name is required').max(200),
  phone: phoneSchema,
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().length(2).default('US'),
  notes: z.string().max(2000).optional().nullable(),
  notification_preferences: notificationPreferencesSchema.optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
