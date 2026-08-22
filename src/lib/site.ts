/**
 * Absolute origin for redirect URLs (OAuth callback, magic links).
 *
 * Supabase requires absolute URLs here, and a relative path silently sends the
 * user to the Supabase domain instead of back to the app. Vercel exposes
 * VERCEL_URL without a protocol, hence the prefixing.
 */
/**
 * Clinic contact details, shown on /contact and in the footer.
 *
 * TODO: replace every placeholder below with the real clinic details. This is
 * the only place they live, so one edit updates the whole site.
 */
export const CLINIC = {
  address: "TODO: street address, area, city",
  phone: "TODO: +92 300 0000000",
  email: "TODO: hello@example.com",
  hours: "Monday to Saturday, 10:00 – 19:00",
} as const;

/**
 * Narrows a caller-supplied `next` value to a safe in-app path.
 *
 * An absolute URL here would be an open redirect -- a link like
 * `/login?next=https://evil.example` would bounce the user off-site straight
 * after they typed their password. A leading `//` is also rejected because
 * `//evil.example` is protocol-relative and leaves the origin too.
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/feed",
) {
  if (typeof next !== "string" || !next) return fallback;
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
