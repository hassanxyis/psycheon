# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` is machine-managed -- `next dev` rewrites it from
`node_modules/next/dist/server/lib/generate-agent-files.js`. Do not edit it;
deleting it from a diff only recreates the uncommitted change.

## Commands

```bash
npm run dev            # Turbopack dev server on :3000
npm run build          # production build (Turbopack)
npm start              # serve the production build
npm run lint           # bare `eslint` -- flat config; `next lint` no longer exists
npx tsc --noEmit       # typecheck
npx next typegen       # regenerate PageProps/LayoutProps route types
```

There is no test runner configured. `npm run build` runs TypeScript, so a clean
build is currently the closest thing to a full check. Run `npx next typegen`
after adding or renaming a route, otherwise `PageProps<"/new-route">` will not
resolve -- pages use those globals rather than hand-written prop types.

## What this is

A psychology community + in-clinic booking platform for a clinic in Pakistan.
`psych-platform-lean-mvp-plan.md` is the scope document the schema was built
from. Built so far: auth, the community (posts, comments, likes, tags,
reports), member profiles, the public psychologist directory, and the admin
panel (moderation queue, psychologist roster, role management).

Booking is the remaining phase. There is no `/bookings` route yet, but the
`availability` and `bookings` tables, their constraints and their RLS policies
already exist in migration 0001/0003 -- building it needs no migration rewrites.

## Next.js 16 — this is not the Next.js in your training data

These break silently and cost hours if assumed away:

- **`src/proxy.ts`, not `middleware.ts`.** Next 16 renamed the convention. A file
  named `middleware.ts` is ignored with no error -- auth simply stops refreshing.
  The exported function is `proxy`. Runtime is nodejs and is not configurable.
  It must sit beside `app/`, so in this project that is `src/proxy.ts`.
- **`cookies()`, `headers()`, `params`, `searchParams` are all async.** Always
  await them. Synchronous access was removed, not deprecated.
- **Turbopack is the default** for dev and build. No `--turbopack` flag.
- **`revalidateTag` needs a second cacheLife argument.** For read-your-writes
  after a mutation use `refresh()` or `updateTag()` from `next/cache`, which is
  what every action in this repo does.

## Route layout

Route groups here hold **only Server Actions**, not pages:

| Path | Contains |
|---|---|
| `src/app/(auth)/actions.ts` | sign in/up, magic link, Google, sign out |
| `src/app/(community)/actions.ts` | create post, comment, like, report |
| `src/app/admin/actions.ts` | moderation, roster, role changes |
| `src/app/profile/actions.ts` | profile edit |

The pages those actions serve are flat routes -- `/login`, `/signup`, `/feed`,
`/posts/[id]`. Do not go looking for `(community)/feed/page.tsx`.

Reads and writes are separated: **every query lives in `src/lib/queries.ts`**
(server-only, returns view-shaped objects), **every mutation lives in an
`actions.ts`**. A page composes the two; components never query directly.

Actions return a state object (`{ error, message }` or `{ error }`) and are
driven by `useActionState`, or called inside `useTransition` for button-style
actions that toast the result. They do not throw for user-facing failures.

## UI components are Base UI, not Radix

`components.json` selects the `base` registry, so shadcn generated components
that wrap `@base-ui/react`. The composition prop is **`render`**, not `asChild`:

```tsx
<Button render={<Link href="/feed" />}>Community</Button>   // correct
<Button asChild><Link href="/feed">…</Link></Button>        // type error
```

This applies to `DialogTrigger`, `DropdownMenuItem` and every other primitive
that composes. Where a link must look like a button without composing, pages use
`buttonVariants({ ... })` as a `className` instead.

Design tokens live in `src/app/globals.css` as oklch custom properties
(`--brand-sage`, `--brand-terracotta`, `--brand-cream-deep`). Headings use
`font-heading` (Fraunces); body text uses the default sans.

## Auth

`src/lib/supabase/` has three clients, and picking the wrong one breaks cookies:

| File | Use in |
|---|---|
| `client.ts` | Client Components (`createBrowserClient`) |
| `server.ts` | Server Components, Server Actions, Route Handlers |
| `proxy.ts` | the proxy only -- token refresh |

**Use `getClaims()` to establish identity, never `getSession()`.** `getSession`
reads the cookie without verifying it and cookies can be spoofed; `getClaims`
verifies the JWT locally via WebCrypto against a cached JWKS. `getAuthUser()` in
`server.ts` wraps this and is the one function route guards should call.
`getCurrentProfile()` layers the profile row (and the DB-backed role) on top.

Never create the server client at module scope -- it closes over per-request
cookies.

Three sign-in methods are wired: email+password, magic link, and Google OAuth.
All land on `/auth/callback`; `/auth/confirm` handles token_hash-style email
templates. Both routes reject absolute `next` values to avoid open redirects.
Redirect URLs are built by `getSiteUrl()` in `src/lib/site.ts` -- Supabase needs
an absolute origin, and a relative path silently strands the user on the
Supabase domain.

`signUp` passes `full_name` in `options.data` because the `handle_new_user`
trigger (migration 0002) reads it to seed `profiles.display_name`. Renaming that
key on either side leaves new users named after their email local-part.

The Google button ships ahead of its credentials and errors until a client
ID/secret is added in the Supabase dashboard. That is expected, not a bug.

## Database and RLS

Migrations in `supabase/migrations/` are the source of truth, applied in order.
There is no `supabase/config.toml` and no linked CLI project -- migrations are
applied by hand (dashboard SQL editor), so `supabase db push` will not work
until the project is linked.

`src/lib/types/database.ts` is **hand-written** to match the migrations;
regenerate it once the CLI is authenticated:

```bash
npx supabase login
npx supabase gen types typescript --project-id <ref> --schema public > src/lib/types/database.ts
```

Because `Relationships` is declared empty there, embedded selects
(`author:profiles!posts_author_id_fkey(display_name)`) infer as `never`.
`src/lib/queries.ts` casts through explicit row types (`PostRow`, `CommentRow`,
`ReportRow`) to work around it -- delete those casts after generating real types.

**RLS is the security boundary, not the proxy.** Conventions, all deliberate:

- `(select auth.uid())` wrapped in a subquery so it is cached per statement
  rather than evaluated per row.
- Explicit `auth.uid() is not null` guards -- `null = user_id` is silently false.
- One policy per operation, each scoped `to authenticated` / `to anon`.
- Every column named in a policy is indexed.
- Admin checks go through `private.is_admin()`, a `security definer` function in
  a non-exposed schema. A policy that queried `public.profiles` directly would
  recurse into that table's own policies forever.
- Role lives on `profiles`, never in JWT `user_metadata` -- that field is
  user-modifiable. `profiles_guard_role` blocks self-promotion; column-level RLS
  does not exist.

`reports.target_id` is polymorphic (post or comment), so PostgREST cannot embed
the target. `getOpenReports()` batch-loads both target tables and merges locally;
keep that shape rather than reaching for a join.

## Admin

There is no UI to create the first admin. Promote one by hand -- the statement
is at the bottom of `supabase/migrations/0002_profiles_trigger.sql`. It requires
migration `0006`: the `profiles_guard_role` trigger from `0003` originally
refused every role change when `auth.uid()` was null, which is the case in the
SQL editor, so the first admin could never be created. `0006` scopes that guard
to signed-in users.

The address must already exist in `auth.users`. A typo makes the subquery null,
the update matches no rows, and Postgres reports success anyway -- so always
verify with `select display_name, role from public.profiles where role = 'admin';`

`requireAdmin()` in `src/lib/admin.ts` is the guard. `src/app/admin/layout.tsx`
calls it once for the whole section, and it calls `notFound()` rather than
redirecting -- a redirect to `/login` would confirm to a stranger that an admin
area exists.

**The layout guard does not protect Server Actions.** Actions are separately
addressable endpoints, so every function in `src/app/admin/actions.ts` calls
`requireAdmin()` itself. RLS enforces the same rule a third time.

Moderation is asymmetric because the schema is: posts have a `status` enum, so
hiding/removing one is reversible; comments do not, so moderating a comment is a
hard delete (the UI arms the button on first click before it fires).

`updateUserRole` refuses to change the caller's own role, so an admin cannot
lock the project out of its own admin area.

## Payments

Deliberately manual. Stripe does not support Pakistan-registered businesses, and
a local gateway (Safepay/PayFast) requires business verification that would
delay launch. `bookings` carries nullable `payment_provider` / `payment_ref` /
`paid_at` so a gateway can be added later without a migration.
`guard_booking_payment_fields` restricts those columns, and any status change
other than `cancelled`, to admins.

## Environment

Copy `.env.example` to `.env.local` and fill in all three values.
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` come from
Supabase dashboard -> Project Settings -> API (publishable key is the new name
for the anon key); `NEXT_PUBLIC_SITE_URL` is the origin used to build OAuth and
magic-link redirects. `supabaseEnv()` in `src/lib/supabase/env.ts` throws a
message naming the missing variable; without it Supabase reports only "Your
project's URL and Key are required" on every route.

Email uses Resend as custom SMTP. Supabase's built-in sender allows **2 messages
per hour** and refuses delivery to addresses outside the project team, so magic
links and signup confirmations do not work for real users without it. Resend
requires a verified domain before its SMTP credentials function.
