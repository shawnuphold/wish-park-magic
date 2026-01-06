export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type RequestStatus =
  | 'pending'
  | 'quoted'
  | 'approved'
  | 'scheduled'
  | 'shopping'
  | 'found'
  | 'invoiced'
  | 'paid'
  | 'shipped'
  | 'delivered'

export type Park = 'disney' | 'universal' | 'seaworld'

export type ParkLocation =
  | 'disney_mk'
  | 'disney_epcot'
  | 'disney_hs'
  | 'disney_ak'
  | 'disney_springs'
  | 'universal_usf'
  | 'universal_ioa'
  | 'universal_citywalk'
  | 'universal_epic'  // Epic Universe - Opening 2025
  | 'seaworld'
  | 'multiple'

export type ItemCategory =
  | 'loungefly'
  | 'ears'
  | 'spirit_jersey'
  | 'popcorn_bucket'
  | 'pins'
  | 'plush'
  | 'apparel'
  | 'drinkware'
  | 'collectible'
  | 'home_decor'
  | 'toys'
  | 'jewelry'
  | 'other'

export type ReleaseSourceType = 'rss' | 'scrape' | 'api' | 'manual'
export type ReleaseStatus = 'rumored' | 'announced' | 'coming_soon' | 'available' | 'sold_out'
export type ImageSource = 'manual' | 'blog' | 'shopdisney'

// Status progression order (can only move forward)
export const RELEASE_STATUS_ORDER: ReleaseStatus[] = [
  'rumored', 'announced', 'coming_soon', 'available', 'sold_out'
]

// Image stored with source for filtering (manual/blog = public, shopdisney = admin only)
export interface ReleaseImage {
  url: string
  source: ImageSource
  caption?: string
  uploaded_at: string
}

// Customer notification preferences
export interface NotificationPreferences {
  enabled: boolean
  parks: Park[]
  categories: ItemCategory[]
  park_exclusives_only: boolean
}

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'manager' | 'shopper'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
      }
      customers: {
        Row: {
          id: string
          email: string | null
          name: string
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string
          notes: string | null
          notification_preferences: NotificationPreferences
          // Telegram bot fields
          facebook_name: string | null
          facebook_profile_url: string | null
          telegram_username: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      customer_aliases: {
        Row: {
          id: string
          customer_id: string
          alias_type: 'facebook' | 'instagram' | 'email' | 'phone' | 'other'
          alias_value: string
          is_primary: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['customer_aliases']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['customer_aliases']['Insert']>
      }
      requests: {
        Row: {
          id: string
          customer_id: string
          status: RequestStatus
          notes: string | null
          quoted_total: number | null
          approved_at: string | null
          shopping_trip_id: string | null
          invoice_id: string | null
          shipment_id: string | null
          // Telegram bot fields
          telegram_message_id: string | null
          source: 'manual' | 'telegram' | 'facebook' | 'website' | 'email'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['requests']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['requests']['Insert']>
      }
      request_items: {
        Row: {
          id: string
          request_id: string
          name: string
          description: string | null
          category: ItemCategory
          park: Park
          store_name: string | null
          land_name: string | null
          reference_url: string | null
          reference_image_url: string | null
          quantity: number
          estimated_price: number | null
          actual_price: number | null
          pickup_fee: number | null
          is_specialty: boolean
          status: 'pending' | 'found' | 'not_found' | 'substituted'
          found_image_url: string | null
          notes: string | null
          matched_release_id: string | null
          // Shopping trip fields
          shopping_trip_id: string | null
          trip_status: 'pending' | 'assigned' | 'shopping' | 'found' | 'not_found' | 'out_of_stock' | null
          trip_notes: string | null
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['request_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['request_items']['Insert']>
      }
      shopping_trips: {
        Row: {
          id: string
          name: string | null
          date: string
          trip_date: string | null
          park: string | null  // Granular park code (disney_mk, disney_epcot, etc.)
          parks: Park[]  // Legacy - array of general parks
          shopper_id: string | null
          status: 'planning' | 'active' | 'completed' | 'cancelled'
          notes: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['shopping_trips']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['shopping_trips']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string | null
          request_id: string
          paypal_invoice_id: string | null
          stripe_invoice_id: string | null
          subtotal: number
          tax_amount: number
          shipping_amount: number
          total: number
          status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'refunded'
          paid_at: string | null
          payment_method: 'paypal' | 'stripe' | 'manual' | null
          payment_reference: string | null
          paypal_transaction_id: string | null
          notes: string | null
          due_date: string | null
          sent_at: string | null
          // CC Processing Fee fields
          cc_fee_enabled: boolean
          cc_fee_percentage: number
          cc_fee_manual_amount: number | null
          cc_fee_amount: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          name: string
          description: string | null
          quantity: number
          unit_price: number
          tax_amount: number
          pickup_fee: number
          shipping_fee: number
          custom_fee_label: string | null
          custom_fee_amount: number
          notes: string | null
          request_item_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>
      }
      shipments: {
        Row: {
          id: string
          request_id: string | null
          customer_id: string | null
          carrier: 'usps' | 'ups' | 'fedex'
          service: string
          shippo_shipment_id: string | null
          shippo_transaction_id: string | null
          tracking_number: string | null
          tracking_url: string | null
          label_url: string | null
          label_zpl: string | null
          rate_amount: number | null
          status: 'pending' | 'label_created' | 'in_transit' | 'delivered' | 'exception'
          shipped_at: string | null
          delivered_at: string | null
          to_name: string | null
          to_street1: string | null
          to_city: string | null
          to_state: string | null
          to_zip: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['shipments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['shipments']['Insert']>
      }
      new_releases: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string
          source_url: string
          source: string
          park: Park
          category: ItemCategory
          price_estimate: number | null
          release_date: string
          is_limited_edition: boolean
          is_featured: boolean
          ai_description: string | null
          ai_tags: string[] | null
          ai_demand_score: number | null
          ai_similar_to: string[] | null
          raw_content: string | null
          status: ReleaseStatus
          source_id: string | null
          article_url: string | null
          location: string | null
          // Store location fields
          store_name: string | null  // e.g., "Creations Shop", "Emporium"
          store_area: string | null  // e.g., "World Showcase", "Main Street USA"
          // Lifecycle fields
          projected_release_date: string | null
          actual_release_date: string | null
          sold_out_date: string | null
          // Deduplication fields
          canonical_name: string | null
          merged_into_id: string | null
          // Online availability (internal intel)
          available_online: boolean
          online_price: number | null
          online_url: string | null
          online_checked_at: string | null
          online_sku: string | null
          park_exclusive: boolean
          // Image gallery with source tracking
          images: ReleaseImage[]
          // Original full-size image before AI cropping (for manual re-crop)
          original_image_url: string | null
          // Data retention
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['new_releases']['Row'], 'id' | 'created_at' | 'updated_at' | 'park_exclusive' | 'expires_at'>
        Update: Partial<Database['public']['Tables']['new_releases']['Insert']>
      }
      // Article sources that mention a product (many-to-one)
      release_article_sources: {
        Row: {
          id: string
          release_id: string
          source_url: string
          source_name: string | null
          article_title: string | null
          discovered_at: string
          snippet: string | null
        }
        Insert: Omit<Database['public']['Tables']['release_article_sources']['Row'], 'id' | 'discovered_at'>
        Update: Partial<Database['public']['Tables']['release_article_sources']['Insert']>
      }
      // RSS feed sources (renamed from release_sources)
      feed_sources: {
        Row: {
          id: string
          name: string
          url: string
          type: ReleaseSourceType
          park: Park | 'all'
          last_checked: string | null
          last_error: string | null
          is_active: boolean
          check_frequency_hours: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['feed_sources']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['feed_sources']['Insert']>
      }
      processed_articles: {
        Row: {
          id: string
          source_id: string
          url: string
          title: string | null
          processed_at: string
          items_found: number
          error: string | null
        }
        Insert: Omit<Database['public']['Tables']['processed_articles']['Row'], 'id' | 'processed_at'>
        Update: Partial<Database['public']['Tables']['processed_articles']['Insert']>
      }
      customer_interests: {
        Row: {
          id: string
          customer_id: string
          category: string | null
          park: Park | 'all' | null
          keywords: string[] | null
          notify_new_releases: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customer_interests']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['customer_interests']['Insert']>
      }
      release_notifications: {
        Row: {
          id: string
          release_id: string
          customer_id: string
          sent_at: string
          email_subject: string | null
          clicked_at: string | null
          converted_to_request_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['release_notifications']['Row'], 'id' | 'sent_at'>
        Update: Partial<Database['public']['Tables']['release_notifications']['Insert']>
      }
      shopdisney_products: {
        Row: {
          id: string
          sku: string
          name: string
          canonical_name: string
          price: number | null
          url: string
          image_url: string | null
          availability_status: 'in_stock' | 'out_of_stock' | 'pre_order' | null
          matched_release_id: string | null
          first_seen_at: string
          last_checked_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['shopdisney_products']['Row'], 'id' | 'created_at' | 'updated_at' | 'first_seen_at' | 'last_checked_at'>
        Update: Partial<Database['public']['Tables']['shopdisney_products']['Insert']>
      }
      unclaimed_inventory: {
        Row: {
          id: string
          name: string
          description: string | null
          category: ItemCategory
          park: Park
          original_price: number
          selling_price: number
          quantity: number
          image_url: string | null
          status: 'available' | 'reserved' | 'sold'
          original_request_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['unclaimed_inventory']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['unclaimed_inventory']['Insert']>
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['settings']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['settings']['Insert']>
      }
    }
  }
}

// Business constants
export const PICKUP_FEE_STANDARD = 6.00
export const PICKUP_FEE_SPECIALTY_PERCENT = 0.10
export const FLORIDA_TAX_RATE = 0.065

export const SPECIALTY_CATEGORIES: ItemCategory[] = ['loungefly', 'popcorn_bucket']

export function calculatePickupFee(category: ItemCategory, price: number): number {
  if (SPECIALTY_CATEGORIES.includes(category)) {
    return price * PICKUP_FEE_SPECIALTY_PERCENT
  }
  return PICKUP_FEE_STANDARD
}

export function calculateTax(subtotal: number): number {
  return subtotal * FLORIDA_TAX_RATE
}
