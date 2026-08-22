/**
 * Reads the Supabase env vars, failing with an actionable message.
 *
 * Without this, a missing key surfaces as "Your project's URL and Key are
 * required to create a Supabase client!" on every route, which does not say
 * which variable is missing or where to put it.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(" and ")} in .env.local. ` +
        `Copy the values from Supabase dashboard -> Project Settings -> API. ` +
        `See .env.example for the expected format.`,
    );
  }

  return { url: url!, key: key! };
}
