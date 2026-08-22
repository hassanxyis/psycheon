import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database, Profile } from "@/lib/types/database";
import { supabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Must be created per-request and never hoisted to a module-level constant --
 * it closes over this request's cookies.
 *
 * In Next.js 16 `cookies()` is async, hence the await. Calling this from a
 * Server Component means `setAll` will throw (Server Components cannot write
 * cookies); that is expected and swallowed below, because the proxy is what
 * actually persists refreshed tokens.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component render -- the proxy refreshes tokens instead.
          }
        },
      },
    },
  );
}

/**
 * Verified identity for the current request, or null.
 *
 * Uses getClaims(), which validates the JWT signature locally (WebCrypto +
 * cached JWKS). Never use getSession() for this -- it reads the cookie without
 * verifying it, and cookies can be spoofed.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  return {
    id: data.claims.sub as string,
    email: (data.claims.email as string | undefined) ?? null,
  };
}

/**
 * Current user's profile row, or null when they are signed out or the profile
 * has not been provisioned yet. Identity still comes from getClaims(); this
 * query only supplies public profile data and the database-backed role.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, role, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}
