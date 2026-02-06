-- =============================================
-- ADD RLS POLICIES FOR AUTHENTICATED ADMIN USERS
-- This fixes ISSUE-026: Admin users cannot update releases
--
-- Problem: RLS was enabled but only service_role had write access.
-- The browser client uses anon key, which was blocked from updates.
--
-- Solution: Add policies for authenticated users to manage data.
-- Created: January 25, 2026
-- =============================================

-- =============================================
-- STEP 1: AUTHENTICATED ADMIN POLICIES
-- Allow authenticated users (logged-in admins) full access
-- The admin app requires Supabase auth login
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

-- Create authenticated user policies for all admin-managed tables
-- These allow any authenticated user to read, insert, update, delete

CREATE POLICY "authenticated_full_access" ON public.new_releases
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.feed_sources
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.customers
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.requests
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.request_items
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.invoices
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- invoice_items may or may not exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
    EXECUTE 'CREATE POLICY "authenticated_full_access" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Policy already exists
END $$;

CREATE POLICY "authenticated_full_access" ON public.shipments
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.shopping_trips
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.settings
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.unclaimed_inventory
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.park_stores
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.notification_templates
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.notification_settings
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.notification_log
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- processed_articles may or may not exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'processed_articles') THEN
    EXECUTE 'CREATE POLICY "authenticated_full_access" ON public.processed_articles FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE POLICY "authenticated_full_access" ON public.customer_interests
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.release_notifications
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- pricing_settings may or may not exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing_settings') THEN
    EXECUTE 'CREATE POLICY "authenticated_full_access" ON public.pricing_settings FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- =============================================
-- VERIFICATION
-- Run these after migration to verify policies
-- =============================================

-- Check policies on new_releases:
-- SELECT policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'new_releases';

-- Expected output should include:
-- - service_role_bypass (for service_role)
-- - public_read_approved_releases (for anon, SELECT only)
-- - authenticated_full_access (for authenticated, ALL operations)
