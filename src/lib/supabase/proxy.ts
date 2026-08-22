import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/types/database";
import { supabaseEnv } from "./env";

/**
 * Refreshes the auth token on every matched request and writes it back to both
 * sides: `request.cookies` so Server Components rendered in this same pass see
 * the fresh token, and `response.cookies` so the browser stores it.
 *
 * This is a session-freshness mechanism, NOT the security boundary. Data access
 * is governed by RLS policies in the database; a request that slips past this
 * still cannot read rows it does not own.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not remove: this call is what triggers the token refresh. Use getClaims
  // (local JWT verification) rather than getSession, which does not verify.
  await supabase.auth.getClaims();

  return response;
}
