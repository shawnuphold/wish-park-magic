import { createClient } from '@supabase/supabase-js';

interface DiscountTier {
  min_order: number;
  discount_percent: number;
}

interface PricingSettings {
  pickup_fee_standard: number;
  pickup_fee_specialty_percent: number;
  florida_tax_rate: number;
  cc_processing_fee_percent: number;
  cc_fixed_transaction_fee: number;
  markup_percent: number;
  shipping_markup_percent: number;
  discount_tiers: DiscountTier[];
}

const defaultPricingSettings: PricingSettings = {
  pickup_fee_standard: 6.00,
  pickup_fee_specialty_percent: 0.10,
  florida_tax_rate: 0.065,
  cc_processing_fee_percent: 0.029,
  cc_fixed_transaction_fee: 0.30,
  markup_percent: 0.15,
  shipping_markup_percent: 0,
  discount_tiers: [],
};

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  is_specialty?: boolean;
}

export interface PricingBreakdown {
  items_subtotal: number;
  pickup_fees: number;
  markup_amount: number;
  subtotal_before_discount: number;
  discount_percent: number;
  discount_amount: number;
  subtotal_after_discount: number;
  tax_rate: number;
  tax_amount: number;
  shipping_base: number;
  shipping_markup: number;
  shipping_total: number;
  cc_fee_percent: number;
  cc_fee_amount: number;
  cc_fixed_fee: number;
  grand_total: number;
}

export async function getPricingSettings(): Promise<PricingSettings> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return defaultPricingSettings;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error) throw error;

    const settings: Partial<PricingSettings> = {};
    data?.forEach((s) => {
      const value = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
      (settings as Record<string, unknown>)[s.key] = value;
    });

    return { ...defaultPricingSettings, ...settings };
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    return defaultPricingSettings;
  }
}

export function calculatePricing(
  items: LineItem[],
  shippingBase: number,
  settings: PricingSettings,
  includePaymentFees: boolean = true
): PricingBreakdown {
  // Calculate items subtotal
  const items_subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  // Calculate pickup fees
  let pickup_fees = 0;
  items.forEach(item => {
    if (item.is_specialty) {
      // Specialty items: percentage of item price
      pickup_fees += item.quantity * item.unit_price * settings.pickup_fee_specialty_percent;
    } else {
      // Standard items: flat fee per item
      pickup_fees += item.quantity * settings.pickup_fee_standard;
    }
  });

  // Apply markup
  const markup_amount = items_subtotal * settings.markup_percent;

  // Subtotal before discount
  const subtotal_before_discount = items_subtotal + pickup_fees + markup_amount;

  // Find applicable discount tier
  const sortedTiers = [...settings.discount_tiers].sort(
    (a, b) => b.min_order - a.min_order
  );
  const applicableTier = sortedTiers.find(
    tier => subtotal_before_discount >= tier.min_order
  );
  const discount_percent = applicableTier?.discount_percent || 0;
  const discount_amount = subtotal_before_discount * discount_percent;

  // Subtotal after discount
  const subtotal_after_discount = subtotal_before_discount - discount_amount;

  // Tax
  const tax_rate = settings.florida_tax_rate;
  const tax_amount = subtotal_after_discount * tax_rate;

  // Shipping with markup
  const shipping_markup = shippingBase * settings.shipping_markup_percent;
  const shipping_total = shippingBase + shipping_markup;

  // Subtotal with shipping and tax
  const subtotal_with_shipping_tax = subtotal_after_discount + tax_amount + shipping_total;

  // Payment processing fees
  let cc_fee_amount = 0;
  let cc_fixed_fee = 0;
  if (includePaymentFees) {
    cc_fee_amount = subtotal_with_shipping_tax * settings.cc_processing_fee_percent;
    cc_fixed_fee = settings.cc_fixed_transaction_fee;
  }

  // Grand total
  const grand_total = subtotal_with_shipping_tax + cc_fee_amount + cc_fixed_fee;

  return {
    items_subtotal,
    pickup_fees,
    markup_amount,
    subtotal_before_discount,
    discount_percent,
    discount_amount,
    subtotal_after_discount,
    tax_rate,
    tax_amount,
    shipping_base: shippingBase,
    shipping_markup,
    shipping_total,
    cc_fee_percent: settings.cc_processing_fee_percent,
    cc_fee_amount,
    cc_fixed_fee,
    grand_total,
  };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
