import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/site";

/**
 * Landing point for OAuth and magic-link sign-in. Supabase redirects here with
 * a `code` that is exchanged for a session; the cookies set by that exchange
 * are what keep the user signed in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow relative redirects -- an absolute `next` would be an open
  // redirect straight to an attacker's domain.
  const safeNext = safeRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Sign-in link was missing or malformed.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
