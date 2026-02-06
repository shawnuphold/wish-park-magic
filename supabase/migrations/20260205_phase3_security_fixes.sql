-- Phase 3 Security Fixes
-- Run in Supabase SQL Editor

-- M-10: Enable RLS on shopdisney_products table
-- This table was created without RLS, making it fully accessible via the public anon key
ALTER TABLE IF EXISTS public.shopdisney_products ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for cron jobs that scrape and update products)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopdisney_products' AND policyname = 'service_role_bypass'
  ) THEN
    CREATE POLICY "service_role_bypass" ON public.shopdisney_products
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Allow authenticated users to read products (admin pages display product data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopdisney_products' AND policyname = 'authenticated_read'
  ) THEN
    CREATE POLICY "authenticated_read" ON public.shopdisney_products
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Allow public/anon read access (public shop page displays products)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopdisney_products' AND policyname = 'anon_read'
  ) THEN
    CREATE POLICY "anon_read" ON public.shopdisney_products
      FOR SELECT TO anon USING (true);
  END IF;
END $$;
