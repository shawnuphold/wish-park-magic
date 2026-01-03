/**
 * Centralized Supabase Admin Client
 *
 * Use this for server-side operations that need to bypass Row Level Security (RLS).
 * This uses the service role key which has full database access.
 *
 * IMPORTANT: Only use in:
 * - API routes
 * - Server actions
 * - Background jobs/scripts
 *
 * Never expose the service role key to the client.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * Get a Supabase admin client with service role privileges.
 * This bypasses RLS and has full database access.
 *
 * Validates environment variables on first call (not at module load)
 * to support scripts that load env vars via dotenv after import.
 */
export function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Re-export for backwards compatibility
export { getSupabaseAdmin as createSupabaseAdminClient };
