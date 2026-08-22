"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, safeRedirectPath } from "@/lib/site";

export type AuthState = { error: string | null; message: string | null };

const initial: AuthState = { error: null, message: null };

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    return { ...initial, error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ...initial, error: error.message };

  // Guards like /posts/new send people here with ?next=, so honour it and land
  // them where they were headed. safeRedirectPath rejects absolute URLs.
  redirect(safeRedirectPath(formData.get("next")?.toString()));
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !password) {
    return { ...initial, error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { ...initial, error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the handle_new_user trigger to seed profiles.display_name.
      data: displayName ? { full_name: displayName } : undefined,
      emailRedirectTo: callbackUrl(formData.get("next")?.toString()),
    },
  });

  if (error) return { ...initial, error: error.message };

  return {
    error: null,
    message: "Check your email for a confirmation link to finish signing up.",
  };
}

/**
 * Round-trip destination for the email/OAuth flows. /auth/callback reads `next`
 * and re-validates it, so a tampered link still cannot leave the origin.
 */
function callbackUrl(next: string | null | undefined) {
  const path = safeRedirectPath(next);
  return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(path)}`;
}

export async function sendMagicLink(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) return { ...initial, error: "Email is required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(formData.get("next")?.toString()) },
  });

  if (error) return { ...initial, error: error.message };

  return { error: null, message: "Magic link sent. Check your inbox." };
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(formData.get("next")?.toString()) },
  });

  // Until Google credentials are configured in the Supabase dashboard this
  // errors; the button is intentionally shipped ahead of that setup.
  if (error || !data?.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in is not configured yet.")}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
