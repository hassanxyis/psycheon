-- psycheon :: a booking remembers how long it is
--
-- 0007 put `session_minutes` on `psychologists` and every booking read it live.
-- That is wrong in two ways, and the second one puts two people in one room.
--
-- 1. A booking's duration is a fact about that appointment, not a current
--    property of the psychologist. Change 60 to 90 and a member looking at a
--    session they booked last month is told it was 90 minutes. It was not.
--
-- 2. `bookings_no_double_booking` is unique on the exact `slot_time`, and
--    buildCalendar() marked a slot taken only on an exact instant match. Both
--    are sufficient only while every booking is the same length -- which stops
--    being true the moment session_minutes changes. With bookings at 10:00 and
--    11:00 made at 60 minutes, switching to 90 makes the 10:00 run to 11:30,
--    straight through the 11:00. Neither the index nor the calendar notices,
--    because the instants are still distinct.
--
-- So the duration is stored with the booking, and the calendar compares
-- intervals rather than instants.

alter table public.bookings
  add column duration_minutes smallint
    check (duration_minutes is null or duration_minutes between 15 and 240);

-- Nullable rather than `not null default 60`: a default would state a duration
-- for rows booked before this column existed, and 60 would be a guess. Null
-- means "not recorded", and readers fall back to the psychologist's current
-- session_minutes -- the same value they were already using, so nothing regresses.
comment on column public.bookings.duration_minutes is
  'Session length in minutes as it stood when the booking was made. Null for rows created before migration 0009; fall back to psychologists.session_minutes.';

-- ---------------------------------------------------------------------------
-- booked_slots() now reports the duration too
--
-- Return type changes, and `create or replace function` cannot change a return
-- type, so it is dropped first. The grants go with it and are re-issued below.
-- ---------------------------------------------------------------------------

drop function if exists public.booked_slots(uuid, timestamptz, timestamptz);

create function public.booked_slots(
  p_psychologist_id uuid,
  p_from            timestamptz,
  p_to              timestamptz
)
returns table (slot_time timestamptz, duration_minutes smallint)
language sql
security definer
set search_path = ''
stable
as $$
  select
    b.slot_time,
    -- Pre-0009 rows carry no duration; the psychologist's current session
    -- length is what the calendar assumed for them before this migration, so
    -- using it here keeps behaviour identical for those rows.
    coalesce(b.duration_minutes, p.session_minutes)::smallint
  from public.bookings b
  join public.psychologists p on p.id = b.psychologist_id
  where b.psychologist_id = p_psychologist_id
    -- Widened on the lower bound: a booking that starts before p_from can still
    -- run into the window. Four hours covers the 240-minute ceiling the check
    -- constraint allows, so no live booking can overlap the range unseen.
    and b.slot_time >= p_from - interval '4 hours'
    and b.slot_time <  p_to
    -- Matches bookings_no_double_booking: a cancelled booking frees its slot.
    and b.status <> 'cancelled';
$$;

revoke all on function public.booked_slots(uuid, timestamptz, timestamptz) from public;
grant execute on function public.booked_slots(uuid, timestamptz, timestamptz)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Existing overlaps, if session_minutes was ever changed
--
-- The application now prevents new overlaps, but rows already stored are
-- untouched. This reports live bookings whose sessions run into each other --
-- each clash appears once:
--
--   select a.id as earlier, a.slot_time as earlier_at,
--          b.id as later,   b.slot_time as later_at,
--          a.psychologist_id
--   from public.bookings a
--   join public.bookings b
--     on a.psychologist_id = b.psychologist_id
--    and a.slot_time < b.slot_time
--   join public.psychologists p on p.id = a.psychologist_id
--   where a.status <> 'cancelled'
--     and b.status <> 'cancelled'
--     and b.slot_time < a.slot_time
--       + (coalesce(a.duration_minutes, p.session_minutes) * interval '1 minute');
--
-- Not resolved automatically: deciding which of two real appointments to move is
-- a phone call to two people, not a migration.
-- ---------------------------------------------------------------------------
