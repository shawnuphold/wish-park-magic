-- =============================================
-- PHASE 1 AUDIT FIXES - Combined Migration
-- Date: February 5, 2026
--
-- This migration combines:
-- 1. 20260125_admin_rls_policies.sql (authenticated write access for admin tables)
-- 2. 20260126_add_specific_park.sql (specific park column on request_items)
-- 3. NEW: admin_users authenticated policy (was missing from #1)
-- 4. NEW: invoice_items service_role_bypass policy
-- =============================================

-- =============================================
-- PART 1: AUTHENTICATED ADMIN POLICIES
-- From 20260125_admin_rls_policies.sql
-- =============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "authenticated_full_access" ON public.new_releases;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.feed_sources;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.customers;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.requests;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.request_items;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.invoices;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.invoice_items;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.shipments;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.shopping_trips;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.settings;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.unclaimed_inventory;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.park_stores;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.notification_templates;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.notification_settings;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.notification_log;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.processed_articles;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.customer_interests;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.release_notifications;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.pricing_settings;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.admin_users;

-- Create authenticated user policies for all admin-managed tables
CREATE POLICY "authenticated_full_access" ON public.new_releases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.feed_sources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.request_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.shipments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.shopping_trips
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.unclaimed_inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.park_stores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.notification_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.notification_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.notification_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.customer_interests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.release_notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tables that may or may not exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_items') THEN
    EXECUTE 'CREATE POLICY "authenticated_full_access" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'processed_articles') THEN
    EXECUTE 'CREATE POLICY "authenticated_full_access" ON public.processed_articles FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pricing_settings') THEN
    EXECUTE 'CREATE POLICY "authenticated_full_access" ON public.pricing_settings FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- PART 2: admin_users AUTHENTICATED POLICY (NEW - was missing)
-- This fixes C-03: Admin user management silently fails
-- =============================================

CREATE POLICY "authenticated_full_access" ON public.admin_users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PART 3: invoice_items SERVICE ROLE BYPASS (NEW)
-- This fixes H-11: Missing service_role_bypass
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_bypass" ON public.invoice_items';
    EXECUTE 'CREATE POLICY "service_role_bypass" ON public.invoice_items FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- PART 4: SPECIFIC PARK COLUMN
-- From 20260126_add_specific_park.sql
-- =============================================

-- Add specific_park column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'request_items' AND column_name = 'specific_park'
  ) THEN
    ALTER TABLE public.request_items ADD COLUMN specific_park text;
  END IF;
END $$;

-- Backfill existing records by looking up from park_stores
UPDATE public.request_items ri
SET specific_park = ps.park
FROM public.park_stores ps
WHERE ri.store_name = ps.store_name
  AND (ri.land_name = ps.land OR ri.land_name IS NULL)
  AND ri.specific_park IS NULL;

-- For Disney items without a store match, try to infer from land_name
UPDATE public.request_items
SET specific_park = CASE
  WHEN land_name IN ('Main Street U.S.A.', 'Adventureland', 'Frontierland', 'Liberty Square', 'Fantasyland', 'Tomorrowland') THEN 'Magic Kingdom'
  WHEN land_name LIKE 'World Showcase%' OR land_name IN ('Future World', 'World Celebration', 'World Discovery', 'World Nature') THEN 'EPCOT'
  WHEN land_name IN ('Hollywood Boulevard', 'Echo Lake', 'Grand Avenue', 'Animation Courtyard', 'Toy Story Land', 'Star Wars: Galaxy''s Edge', 'Sunset Boulevard') THEN 'Hollywood Studios'
  WHEN land_name IN ('Oasis', 'Discovery Island', 'Africa', 'Rafiki''s Planet Watch', 'Asia', 'DinoLand U.S.A.', 'Pandora - The World of Avatar') THEN 'Animal Kingdom'
  ELSE NULL
END
WHERE park = 'disney' AND specific_park IS NULL AND land_name IS NOT NULL;

COMMENT ON COLUMN public.request_items.specific_park IS 'The specific theme park name (e.g., Magic Kingdom, EPCOT, Islands of Adventure)';

-- =============================================
-- VERIFICATION QUERIES (run these after to confirm)
-- =============================================

-- Check admin_users policies:
-- SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE tablename = 'admin_users';

-- Check all authenticated_full_access policies:
-- SELECT tablename, policyname FROM pg_policies WHERE policyname = 'authenticated_full_access' ORDER BY tablename;

-- Check specific_park column exists:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'request_items' AND column_name = 'specific_park';
