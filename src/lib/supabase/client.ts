import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types/database";
import { supabaseEnv } from "./env";

/**
 * Supabase client for Client Components.
 *
 * Safe to call on every render -- createBrowserClient memoises the underlying
 * client, so this does not open a new connection each time.
 */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient<Database>(url, key);
}
