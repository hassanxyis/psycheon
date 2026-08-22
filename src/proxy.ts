import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed `middleware` to `proxy`. A file named `middleware.ts` is
 * silently ignored -- auth would appear broken with no error message.
 * The runtime is nodejs and is not configurable.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Every path except static assets and image files. Auth routes are
     * deliberately included so tokens refresh during the OAuth round-trip.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
