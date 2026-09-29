-- psycheon :: stop one psychologist having two overlapping availability windows
--
-- 0001 constrains `availability` to day_of_week 0-6 and start_time < end_time.
-- Nothing stops the same psychologist getting Monday 10:00-13:00 *and* Monday
-- 11:00-14:00, and an admin adding a second sitting to a day is exactly how it
-- happens -- the form has no idea what is already there.
--
-- Two ways that breaks booking, and only the first is cosmetic:
--
-- 1. Both windows generate an 11:00 and a 12:00 slot. buildCalendar() now
--    de-duplicates by start minute, so the picker no longer renders two
--    children with the same key.
-- 2. The real one: 10:00-13:00 and 10:30-13:00 generate slots at 10:00 *and*
--    10:30. Different instants, so `bookings_no_double_booking` (unique on
--    exact slot_time) permits both -- and a 60-minute session starting 10:00
--    overlaps one starting 10:30. Two members are booked into one hour with one
--    psychologist, and nothing in the database or the app objects.
--
-- De-duplicating slots cannot fix (2), because the slots are genuinely
-- different. The fix has to be at the source: overlapping windows for one
-- person are never meaningful, so they are refused.
--
-- A trigger rather than `exclude using gist (psychologist_id with =, ... with &&)`:
-- there is no built-in range type for `time without time zone`, so that route
-- needs a custom `timerange` type plus the btree_gist extension. This is
-- ordinary SQL in the same shape as the three trigger functions 0001/0003
-- already install, and the table takes a handful of writes a week.

create or replace function public.guard_availability_overlap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clashing_start time;
  clashing_end   time;
begin
  -- Half-open comparison: a window ending at 13:00 and one starting at 13:00 do
  -- not overlap, which is what back-to-back sittings need. Using <= / >= here
  -- would reject the most ordinary schedule there is.
  select a.start_time, a.end_time
    into clashing_start, clashing_end
  from public.availability a
  where a.psychologist_id = new.psychologist_id
    and a.day_of_week     = new.day_of_week
    -- On update, the row being changed is still visible to this query.
    and a.id is distinct from new.id
    and new.start_time < a.end_time
    and new.end_time   > a.start_time
  limit 1;

  if found then
    -- to_char, not the bare time: a raw `time` renders as "10:00:00" and the
    -- seconds read as noise in a message an admin sees.
    raise exception
      'this overlaps an existing window on the same day (% to %)',
      to_char(clashing_start, 'HH24:MI'),
      to_char(clashing_end,   'HH24:MI')
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Dropped first so the file re-runs cleanly. `create trigger` has no
-- IF NOT EXISTS, and the function above already uses `create or replace`, so
-- this was the only statement that could fail with 42710.
drop trigger if exists availability_guard_overlap on public.availability;

create trigger availability_guard_overlap
  before insert or update on public.availability
  for each row execute function public.guard_availability_overlap();

-- The trigger's lookup filters on (psychologist_id, day_of_week), which is
-- exactly what availability_psychologist_id_idx from 0001 already covers. No
-- new index needed.

-- ---------------------------------------------------------------------------
-- Existing overlaps, if any
--
-- The trigger only fires on write, so rows already in the table are untouched.
-- Run this after applying to see whether anything needs cleaning up by hand --
-- it reports pairs, so one genuine clash appears twice:
--
--   select a.psychologist_id, a.day_of_week,
--          a.start_time as a_start, a.end_time as a_end,
--          b.start_time as b_start, b.end_time as b_end
--   from public.availability a
--   join public.availability b
--     on a.psychologist_id = b.psychologist_id
--    and a.day_of_week     = b.day_of_week
--    and a.id <> b.id
--    and a.start_time < b.end_time
--    and a.end_time   > b.start_time;
--
-- Deliberately not deleted automatically: which of two overlapping windows is
-- the intended one is a question about the clinic's actual hours, and guessing
-- would silently remove availability someone relies on.
-- ---------------------------------------------------------------------------
