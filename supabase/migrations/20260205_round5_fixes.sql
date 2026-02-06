-- =============================================
-- ROUND 5 AUDIT FIXES
-- Date: February 5, 2026
--
-- 1. Add UNIQUE constraint on customers.email
--    (prevents duplicate customer creation)
-- =============================================

-- Add unique constraint on email if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass
      AND contype = 'u'
      AND conname = 'customers_email_unique'
  ) THEN
    -- First, clean up any existing duplicates by keeping the oldest record
    DELETE FROM public.customers
    WHERE id NOT IN (
      SELECT DISTINCT ON (lower(email)) id
      FROM public.customers
      WHERE email IS NOT NULL
      ORDER BY lower(email), created_at ASC
    )
    AND email IS NOT NULL
    AND email IN (
      SELECT lower(email) FROM public.customers
      GROUP BY lower(email)
      HAVING count(*) > 1
    );

    ALTER TABLE public.customers
    ADD CONSTRAINT customers_email_unique UNIQUE (email);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  NULL; -- Constraint already exists
END $$;

-- =============================================
-- VERIFICATION
-- =============================================
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.customers'::regclass AND contype = 'u';
