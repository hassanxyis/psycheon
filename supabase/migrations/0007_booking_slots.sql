-- psycheon :: what the booking phase needs that 0001/0003 did not anticipate
--
-- Three changes. The tables, RLS policies and payment guard from 0001/0003 are
-- unchanged and still do the work; these fill gaps that only became visible
-- once a real slot picker had to be built on top of them.

-- ---------------------------------------------------------------------------
-- 1. session length :: how long one appointment runs
--
-- `availability` stores a weekly *window* (Monday 10:00-13:00) but `bookings`
-- stores one concrete instant. Nothing in the schema said how long an
-- appointment lasts, so nothing could slice a window into bookable slots.
--
-- Per-psychologist rather than one clinic-wide constant: a senior clinician may
-- run 90-minute sessions while an intake screen runs 30, and that difference is
-- a property of the person, not of the codebase.
-- ---------------------------------------------------------------------------

alter table public.psychologists
  add column if not exists session_minutes smallint not null default 60
    check (session_minutes between 15 and 240);

-- ---------------------------------------------------------------------------
-- 2. the double-booking guard, scoped to live bookings
--
-- 0001 declared `unique (psychologist_id, slot_time)` as a table constraint.
-- That is the right guard, but it counts cancelled rows: once someone booked
-- Monday 10:00 and cancelled, the row still occupied the slot and nobody could
-- ever book it again -- the insert failed with 23505 on a slot the UI correctly
-- showed as free.
--
-- A partial unique index keeps the guard exactly as strong for live bookings
-- (pending / paid / completed) and stops cancelled rows from holding a slot
-- hostage. The index name is reused so the constraint's intent stays greppable,
-- and a violation still surfaces as 23505, so error handling is unchanged.
-- ---------------------------------------------------------------------------

alter table public.bookings
  drop constraint if exists bookings_no_double_booking;

create unique index if not exists bookings_no_double_booking
  on public.bookings (psychologist_id, slot_time)
  where status <> 'cancelled';

-- ---------------------------------------------------------------------------
-- 3. booked_slots() :: which instants are taken, without exposing who booked
--
-- The slot picker has to grey out taken slots, and RLS deliberately forbids
-- that: "users view their own bookings" means one member cannot see another
-- member's row, which is correct -- a booking reveals that a named person is
-- seeing a psychologist, which is exactly the kind of fact this table exists
-- to protect.
--
-- RLS is row-level, so there is no way to expose `slot_time` alone through a
-- policy without exposing `user_id` in the same row. A security definer
-- function is the narrow way through: it returns a bare list of instants and no
-- identity, which is the minimum a calendar needs and nothing more.
--
-- `set search_path = ''` and the fully-qualified table name are required for a
-- security definer function -- without them a caller could shadow `bookings`
-- with a table on their own search_path and have this read that instead.
-- ---------------------------------------------------------------------------

create or replace function public.booked_slots(
  p_psychologist_id uuid,
  p_from            timestamptz,
  p_to              timestamptz
)
returns setof timestamptz
language sql
security definer
set search_path = ''
stable
as $$
  select slot_time
  from public.bookings
  where psychologist_id = p_psychologist_id
    and slot_time >= p_from
    and slot_time <  p_to
    -- Matches the partial index above: a cancelled booking frees its slot.
    and status <> 'cancelled';
$$;

-- Default execute is granted to public on new functions; revoke it and hand it
-- back explicitly so the grant is a decision rather than a default. `anon` is
-- included so a signed-out visitor sees an honest calendar before signing in.
revoke all on function public.booked_slots(uuid, timestamptz, timestamptz) from public;
grant execute on function public.booked_slots(uuid, timestamptz, timestamptz)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Index supporting the function's range scan. bookings_slot_time_idx from 0001
-- indexes slot_time alone; leading with psychologist_id lets one index serve
-- the whole where clause.
-- ---------------------------------------------------------------------------

create index if not exists bookings_psychologist_slot_idx
  on public.bookings (psychologist_id, slot_time);

-- ---------------------------------------------------------------------------
-- 4. a member can see a psychologist they have actually booked
--
-- 0003 gives `psychologists` exactly two select policies: `using (is_active)`
-- for everyone, and admin-only. That is right for a directory but wrong for a
-- booking history, and the gap is on the expected path rather than an edge case:
-- `bookings.psychologist_id` is `on delete restrict`, so deletePsychologist()
-- tells an admin to *unlist* anyone who has bookings.
--
-- The moment that happens, every member holding a booking against them loses
-- the embedded psychologist on their own /bookings page -- the appointment is
-- still real and still in the database, but the person it is with goes blank.
--
-- Having an appointment with someone is reason enough to see their name.
-- ---------------------------------------------------------------------------

-- Goes through a security definer function in `private` for the same reason
-- is_admin() does: a policy on `psychologists` whose USING clause selected from
-- `public.bookings` directly would evaluate that table's own policies per row.
-- This reads it once, with RLS bypassed, and returns a bare boolean.
create or replace function private.has_booked(p_psychologist_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.bookings
    where psychologist_id = p_psychologist_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function private.has_booked(uuid) from public;
grant execute on function private.has_booked(uuid) to authenticated;

-- `create policy` has no IF NOT EXISTS, and a bare re-run aborts the whole file
-- with 42710 -- which on this file would skip the index below and leave the
-- policy's own lookup unindexed. Dropping first makes the file re-runnable.
drop policy if exists "members view psychologists they have booked" on public.psychologists;

create policy "members view psychologists they have booked"
  on public.psychologists for select
  to authenticated
  using ((select auth.uid()) is not null and (select private.has_booked(id)));

-- has_booked() filters on user_id, and the policy is evaluated per psychologist
-- row -- so lead with user_id here. bookings_psychologist_slot_idx above leads
-- with psychologist_id and cannot serve this.
create index if not exists bookings_user_psychologist_idx
  on public.bookings (user_id, psychologist_id);
