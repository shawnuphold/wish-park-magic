import { createClient } from '@supabase/supabase-js';

// Untyped client for admin operations that need access to all tables
// This bypasses type checking for tables not defined in database.types.ts
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as ReturnType<typeof createClient<any>>;
}

// Export a singleton for convenience
export const adminSupabase = createAdminClient();
