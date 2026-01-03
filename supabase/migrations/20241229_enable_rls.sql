-- =============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- Run this migration in Supabase Dashboard > SQL Editor
-- Created: December 29, 2024
-- =============================================

-- =============================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shopping_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.unclaimed_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.new_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.park_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.processed_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.release_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: SERVICE ROLE BYPASS POLICIES
-- These allow the API (using service_role key) full access
-- =============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "service_role_bypass" ON public.customers;
DROP POLICY IF EXISTS "service_role_bypass" ON public.admin_users;
DROP POLICY IF EXISTS "service_role_bypass" ON public.requests;
DROP POLICY IF EXISTS "service_role_bypass" ON public.request_items;
DROP POLICY IF EXISTS "service_role_bypass" ON public.invoices;
DROP POLICY IF EXISTS "service_role_bypass" ON public.shipments;
DROP POLICY IF EXISTS "service_role_bypass" ON public.shopping_trips;
DROP POLICY IF EXISTS "service_role_bypass" ON public.settings;
DROP POLICY IF EXISTS "service_role_bypass" ON public.unclaimed_inventory;
DROP POLICY IF EXISTS "service_role_bypass" ON public.new_releases;
DROP POLICY IF EXISTS "service_role_bypass" ON public.feed_sources;
DROP POLICY IF EXISTS "service_role_bypass" ON public.park_stores;
DROP POLICY IF EXISTS "service_role_bypass" ON public.notification_templates;
DROP POLICY IF EXISTS "service_role_bypass" ON public.notification_settings;
DROP POLICY IF EXISTS "service_role_bypass" ON public.notification_log;
DROP POLICY IF EXISTS "service_role_bypass" ON public.processed_articles;
DROP POLICY IF EXISTS "service_role_bypass" ON public.customer_interests;
DROP POLICY IF EXISTS "service_role_bypass" ON public.release_notifications;
DROP POLICY IF EXISTS "service_role_bypass" ON public.pricing_settings;
DROP POLICY IF EXISTS "service_role_bypass" ON public.push_subscriptions;

-- Create service_role bypass policies
CREATE POLICY "service_role_bypass" ON public.customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.admin_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.request_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.shipments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.shopping_trips FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.unclaimed_inventory FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.new_releases FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.feed_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.park_stores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.notification_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.notification_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.notification_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.processed_articles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.customer_interests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.release_notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.pricing_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_bypass" ON public.push_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================
-- STEP 3: PUBLIC READ POLICIES
-- Allow anonymous users to read specific public data
-- =============================================

DROP POLICY IF EXISTS "public_read_approved_releases" ON public.new_releases;
DROP POLICY IF EXISTS "public_read_available_inventory" ON public.unclaimed_inventory;
DROP POLICY IF EXISTS "public_read_park_stores" ON public.park_stores;
DROP POLICY IF EXISTS "public_read_settings" ON public.settings;

-- Public can read approved releases (for /new-releases page)
CREATE POLICY "public_read_approved_releases" ON public.new_releases
  FOR SELECT TO anon
  USING (status = 'approved');

-- Public can read available inventory (for /shop page)
CREATE POLICY "public_read_available_inventory" ON public.unclaimed_inventory
  FOR SELECT TO anon
  USING (status = 'available');

-- Public can read active park stores (for location picker)
CREATE POLICY "public_read_park_stores" ON public.park_stores
  FOR SELECT TO anon
  USING (is_active = true);

-- Public can read non-sensitive settings (like Epic Universe toggle)
CREATE POLICY "public_read_settings" ON public.settings
  FOR SELECT TO anon
  USING (key IN ('epic_universe_enabled', 'tax_rate'));

-- =============================================
-- STEP 4: FIX FUNCTION SEARCH PATHS
-- Prevents search_path injection attacks
-- =============================================

-- Fix generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Fix update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_park_stores_timestamp function
CREATE OR REPLACE FUNCTION public.update_park_stores_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================
-- VERIFICATION QUERIES
-- Run these after migration to verify RLS is enabled
-- =============================================

-- Check RLS status on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies:
-- SELECT tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public';
