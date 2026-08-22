import { notFound } from "next/navigation";

import { getCurrentProfile } from "@/lib/supabase/server";

/**
 * Guard for every admin route. The role comes from public.profiles, never from
 * mutable JWT user metadata. notFound() avoids advertising an admin area to
 * people who are not allowed to access it.
 */
export async function requireAdmin() {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") notFound();

  return profile;
}
