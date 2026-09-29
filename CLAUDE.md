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

```bash
npm run check:slots     # assertions over src/lib/booking.ts (see below)
```

There is no test runner configured. `npm run build` runs TypeScript, so a clean
build is currently the closest thing to a full check. Run `npx next typegen`
after adding or renaming a route, otherwise `PageProps<"/new-route">` will not
resolve -- pages use those globals rather than hand-written prop types.

`npm run check:slots` is the one exception: slot arithmetic is timezone
sensitive, and a five-hour error looks correct on a machine set to Pakistan time
and wrong only in production, so it is asserted rather than eyeballed. The
script forces `TZ=UTC` to reproduce the container. Run it after touching
`src/lib/booking.ts`.

## What this is

A psychology community + in-clinic booking platform for a clinic in Pakistan.
`psych-platform-lean-mvp-plan.md` is the scope document the schema was built
from. Every phase in it now has UI: auth, the community (posts, comments, likes,
tags, reports), member profiles, the public psychologist directory, booking, and
the admin panel (moderation queue, psychologist roster, booking queue, role
management).

Still outstanding from the plan: confirmation emails on booking (blocked on
Resend SMTP -- see Environment) and a payment gateway (deliberately deferred,
see Payments).

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
| `src/app/(booking)/actions.ts` | create booking, member cancellation |
| `src/app/admin/actions.ts` | moderation, roster, bookings, role changes |
| `src/app/profile/actions.ts` | profile edit |

The pages those actions serve are flat routes -- `/login`, `/signup`, `/feed`,
`/posts/[id]`, `/bookings`. Do not go looking for `(community)/feed/page.tsx`.

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

## Booking

`availability` holds a weekly wall-clock **window** (Monday 10:00-13:00);
`bookings.slot_time` is one `timestamptz`. `src/lib/booking.ts` is the bridge and
is pure -- `now` is always passed in, never read from the clock, which is what
makes `npm run check:slots` possible.

Three things there are easy to undo by accident:

- **The clinic offset is applied explicitly.** `availability.start_time` is a
  bare `time` meaning "10am at the clinic". The container runs UTC, so
  `new Date(y, m, d, 10, 0)` would produce 10:00 UTC -- 3pm in Lahore -- and it
  would look right on a dev machine set to Pakistan time. PKT is UTC+5 with no
  DST since 2009, which is what makes a fixed offset exact rather than
  approximate. Never format a `slot_time` with bare `toLocaleString()`; use
  `formatSlotTime()`.
- **`session_minutes` lives on `psychologists`** (migration 0007) and is what
  divides a window into slots. A slot is only offered if the whole session fits
  inside the window.
- **`isSlotOffered()` in `createBooking` is not decoration.** No constraint ties
  `bookings.slot_time` back to an `availability` row, so the unique index would
  happily accept 3am on a Sunday. That check is the only thing between a crafted
  POST and an appointment nobody is at the clinic for.

`bookings_no_double_booking` is a **partial** unique index in 0007, not the table
constraint 0001 declared. The original counted cancelled rows, so a cancelled
booking held its slot forever and the insert failed with 23505 on a slot the UI
correctly showed as free. The race between rendering a calendar and inserting can
only be settled by the database, so 23505 is caught and turned into "someone just
took that time" rather than prevented.

**A member can see a psychologist they have booked, listed or not** --
`"members view psychologists they have booked"` in 0007, via
`private.has_booked()`. Without it, `is_active` was the only thing letting a
non-admin read the table, and unlisting someone (the documented way to retire
anyone with booking history, since `psychologist_id` is `on delete restrict`)
blanked the psychologist out of every member's own booking list. The policy goes
through a `private` function for the same reason `is_admin()` does: a USING
clause selecting from `public.bookings` would evaluate that table's policies per
row.

Relatedly, `MemberBooking.sessionMinutes` is nullable and rendered only when
present. It used to default to 60, which turned an unreadable row into a
confidently wrong duration -- the failure mode worth avoiding is a fabricated
fact, not a missing one.

`booked_slots()` (0007) is a `security definer` function because RLS cannot
express what the picker needs. "users view their own bookings" is correct -- a
booking reveals that a named person is seeing a psychologist -- but policies are
row-level, so there is no way to expose `slot_time` without also exposing
`user_id`. The function returns bare instants and no identity. Read it, never
`select` from `bookings`, when building a calendar.

Members may set exactly one status, `cancelled`, and only more than 24h ahead.
The 24h rule is clinic policy enforced in the action; the status restriction is
enforced by `guard_booking_payment_fields` in the database. An admin cancelling
past the cutoff is the intended escape hatch.

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

`setBookingStatus` never clears `paid_at`. Wiping it on a cancellation would
destroy the record that money changed hands, which is the one fact a refund
conversation depends on -- the status says the session will not happen, `paid_at`
still says it was paid for.

`updateUserRole` refuses to change the caller's own role, so an admin cannot
lock the project out of its own admin area.

## Payments

Deliberately manual. Stripe does not support Pakistan-registered businesses, and
a local gateway (Safepay/PayFast) requires business verification that would
delay launch. `bookings` carries nullable `payment_provider` / `payment_ref` /
`paid_at` so a gateway can be added later without a migration.
`guard_booking_payment_fields` restricts those columns, and any status change
other than `cancelled`, to admins.

In practice: a member books and lands on `pending`, pays cash or by transfer at
the clinic, and an admin hits "Mark paid" on `/admin/bookings`.
`markBookingPaid` leaves `payment_provider` null precisely because there was no
provider -- that column is for the gateway that does not exist yet, not for
recording "cash".

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
