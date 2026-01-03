-- Push Notification Subscriptions
-- Stores Web Push API subscriptions for real-time notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL, -- 'admin' for admin subscriptions, or customer UUID
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL, -- { p256dh: string, auth: string }
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_id, endpoint)
);

-- Index for customer lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_customer_id
ON push_subscriptions(customer_id);

-- RLS Policy - only admin can manage subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by API routes)
CREATE POLICY "Service role can manage push subscriptions"
ON push_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to view their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
ON push_subscriptions
FOR SELECT
TO authenticated
USING (customer_id = auth.uid()::text OR customer_id = 'admin');
