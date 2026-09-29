-- Seed one psychologist with a weekly schedule, so bookable slots appear.
--
-- Run in the Supabase dashboard SQL editor. This is the same thing the admin
-- panel does; doing it here means you can see slots working before sorting out
-- admin sign-in.
--
-- ===========================================================================
-- READ THIS FIRST
--
-- `is_active = true` puts this person on the PUBLIC directory at /psychologists
-- and makes them bookable by anyone. The values below are placeholders. Replace
-- every one of them with a real clinician's real details before this site is
-- reachable by the public -- a fabricated psychologist with invented credentials
-- on a clinic's website is something a patient could act on.
--
-- To remove everything this script adds:
--   delete from public.psychologists where name = 'PLACEHOLDER — replace me';
--   -- availability cascades (on delete cascade), bookings do not (on delete
--   -- restrict), so this fails once someone has booked. Unlist instead:
--   --   update public.psychologists set is_active = false where ...;
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. The psychologist
--
-- session_minutes is what divides the hours below into bookable slots. At 60,
-- a 10:00-13:00 window yields 10:00, 11:00 and 12:00.
-- ---------------------------------------------------------------------------

insert into public.psychologists (
  name,
  credentials,
  specialties,
  languages,
  bio,
  years_experience,
  session_fee,
  location,
  session_minutes,
  is_active
)
values (
  'PLACEHOLDER — replace me',
  'MS Clinical Psychology',                    -- real qualification, real body
  array['Anxiety', 'Stress', 'Relationships'], -- shows as "Works with"
  array['Urdu', 'English'],
  'Replace this with a real bio before the site goes live.',
  10,                                          -- years_experience, 0-70 or null
  3500,                                        -- session_fee, whole rupees or null
  'Replace with the clinic address',
  60,                                          -- session_minutes, 15-240
  true                                         -- PUBLIC once this is true
)
-- Re-running the script would otherwise add a second copy.
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. The weekly schedule
--
-- day_of_week is 0=Sunday .. 6=Saturday, matching the check constraint in 0001
-- and DAY_NAMES in src/lib/schedule.ts.
--
-- These repeat every week, and src/lib/booking.ts projects them four weeks
-- ahead (BOOKING_HORIZON_DAYS). Times are CLINIC wall-clock (PKT) -- the app
-- converts to UTC when it stores a booking, so put in the hours the clinic
-- actually opens, not anything timezone-adjusted.
--
-- Monday/Wednesday/Friday get a morning and an afternoon sitting; Tuesday and
-- Thursday mornings only. Note 14:00-17:00 starting exactly when 11:00-14:00
-- ends: that is legal. availability_guard_overlap (0008) compares half-open, so
-- back-to-back sittings are fine and genuinely overlapping ones are refused.
-- ---------------------------------------------------------------------------

insert into public.availability (psychologist_id, day_of_week, start_time, end_time)
select p.id, v.day_of_week, v.start_time, v.end_time
from public.psychologists p
cross join (values
  (1, '11:00'::time, '14:00'::time),   -- Monday morning
  (1, '14:00'::time, '17:00'::time),   -- Monday afternoon
  (2, '11:00'::time, '14:00'::time),   -- Tuesday
  (3, '11:00'::time, '14:00'::time),   -- Wednesday morning
  (3, '14:00'::time, '17:00'::time),   -- Wednesday afternoon
  (4, '11:00'::time, '14:00'::time),   -- Thursday
  (5, '11:00'::time, '14:00'::time),   -- Friday morning
  (5, '14:00'::time, '17:00'::time)    -- Friday afternoon
) as v(day_of_week, start_time, end_time)
where p.name = 'PLACEHOLDER — replace me'
  -- Skip anything already present, so the script can be re-run. Without this the
  -- overlap trigger would reject the whole statement on a second run.
  and not exists (
    select 1 from public.availability a
    where a.psychologist_id = p.id
      and a.day_of_week = v.day_of_week
      and a.start_time   = v.start_time
  );

-- ---------------------------------------------------------------------------
-- 3. Check it
-- ---------------------------------------------------------------------------

select
  p.name,
  p.is_active,
  p.session_minutes,
  count(a.id)                                     as windows,
  -- Slots per week = total scheduled minutes / session length.
  sum(extract(epoch from (a.end_time - a.start_time)) / 60)::int
    / p.session_minutes                           as slots_per_week
from public.psychologists p
left join public.availability a on a.psychologist_id = p.id
where p.name = 'PLACEHOLDER — replace me'
group by p.id, p.name, p.is_active, p.session_minutes;

-- Expect windows = 8 and slots_per_week = 24 (8 windows x 3 hours / 60 min).
--
-- Then open /psychologists, click through to this person, and the picker shows
-- roughly 19 bookable days and ~93 slots over the four-week horizon -- Mon/Wed/Fri
-- have 6 each (the two sittings run 11:00-17:00 unbroken, because 14:00 both ends
-- one and starts the next), Tue/Thu have 3. Slightly under 4 x 24 because today's
-- already-passed hours are dropped. Verified against src/lib/booking.ts.
--
-- Nothing appears at all if is_active is false.

-- ---------------------------------------------------------------------------
-- 4. Optional: prove the overlap guard from 0008 actually fires
--
-- Uncomment and run. It must fail with 23514 and a message naming 11:00 to
-- 14:00. If it succeeds, 0008 did not apply and two members can be booked into
-- one hour.
-- ---------------------------------------------------------------------------

-- insert into public.availability (psychologist_id, day_of_week, start_time, end_time)
-- select id, 1, '12:00'::time, '15:00'::time
-- from public.psychologists where name = 'PLACEHOLDER — replace me';
