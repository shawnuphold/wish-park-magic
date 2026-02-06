// Supabase client for Next.js (Browser)
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
