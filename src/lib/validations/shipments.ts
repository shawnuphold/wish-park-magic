import { z } from 'zod';
import { emailSchema } from './common';

// Address schema for Shippo
export const addressSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  street1: z.string().min(1, 'Street address is required').max(200),
  street2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(50),
  zip: z.string().min(5, 'ZIP code is required').max(20),
  country: z.string().length(2).default('US'),
  phone: z.string().max(20).optional(),
  email: emailSchema.optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

// Parcel dimensions
export const parcelSchema = z.object({
  length: z.number().positive('Length must be positive'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  weight: z.number().positive('Weight must be positive'),
});

export type ParcelInput = z.infer<typeof parcelSchema>;

// POST /api/shippo/rates - Get shipping rates
export const getShippingRatesSchema = z.object({
  addressTo: addressSchema,
  parcel: parcelSchema,
});

export type GetShippingRatesInput = z.infer<typeof getShippingRatesSchema>;

// POST /api/shippo/purchase - Purchase shipping label
export const purchaseLabelSchema = z.object({
  rateId: z.string().min(1, 'Rate ID is required'),
  labelFormat: z.enum(['PDF', 'PNG', 'ZPL']).default('PDF'),
});

export type PurchaseLabelInput = z.infer<typeof purchaseLabelSchema>;
