-- Run in the Supabase dashboard SQL editor. Read-only.
--
-- Answers the question a client cannot: are all the policies and triggers the
-- migrations declare actually present? RLS is the security boundary in this
-- project, and 0003 creates 31 policies in one file -- if it ever aborts partway
-- (a re-run, a partial paste), everything after the failure point silently does
-- not exist and the app keeps working, just with the guard missing.
--
-- Expected counts come from the migration files, counted at the time 0009 was
-- written. Update them if you add policies.

-- ---------------------------------------------------------------------------
-- 1. Policy count per table. Any zero is an emergency.
-- ---------------------------------------------------------------------------
select
  c.relname                                as table_name,
  c.relrowsecurity                         as rls_enabled,
  count(p.policyname)                      as policies,
  case c.relname
    when 'profiles'      then 5   -- 0003 x4, 0004 x1
    when 'posts'         then 6
    when 'comments'      then 6   -- 0003 x5, 0004 x1
    when 'likes'         then 3
    when 'psychologists' then 3   -- 0003 x2, 0007 x1
    when 'availability'  then 2
    when 'bookings'      then 5
    when 'reports'       then 3
  end                                      as expected
from pg_class c
left join pg_policies p
  on p.schemaname = 'public' and p.tablename = c.relname
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
  and c.relname in ('profiles','posts','comments','likes',
                    'psychologists','availability','bookings','reports')
group by c.relname, c.relrowsecurity
order by c.relname;

-- Any row where rls_enabled is false, or policies is 0, or policies is short of
-- expected, means a migration did not fully apply. Investigate before shipping.

-- ---------------------------------------------------------------------------
-- 2. The specific policies that are easy to lose, because they are the second
--    statement in a file whose first statement can fail with 42710.
-- ---------------------------------------------------------------------------
select
  expected.policyname,
  expected.tablename,
  (p.policyname is not null) as present
from (values
  -- 0004 -- the one that matters: without it, a reported comment on a hidden
  -- post is invisible to the admins allowed to delete it.
  ('comments',      'admins view all comments'),
  ('profiles',      'admins update any profile'),
  -- 0007
  ('psychologists', 'members view psychologists they have booked')
) as expected(tablename, policyname)
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename  = expected.tablename
 and p.policyname = expected.policyname;

-- ---------------------------------------------------------------------------
-- 3. Triggers, including the ones no client can see.
-- ---------------------------------------------------------------------------
select
  expected.tgname,
  (t.tgname is not null) as present
from (values
  ('on_auth_user_created'),        -- 0002 (on auth.users)
  ('profiles_guard_role'),         -- 0003
  ('bookings_guard_payment'),      -- 0003
  ('availability_guard_overlap')   -- 0008
) as expected(tgname)
left join pg_trigger t
  on t.tgname = expected.tgname and not t.tgisinternal;

-- ---------------------------------------------------------------------------
-- 4. The security definer functions, and that execute was granted.
-- ---------------------------------------------------------------------------
select
  p.proname,
  p.prosecdef                              as security_definer,
  pg_get_function_identity_arguments(p.oid) as args,
  -- booked_slots must be callable by a signed-out visitor, or the calendar shows
  -- every slot as free to anyone not logged in.
  has_function_privilege('anon',           p.oid, 'execute') as anon_can_call,
  has_function_privilege('authenticated',  p.oid, 'execute') as auth_can_call
from pg_proc p
where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
  and p.proname in ('booked_slots','is_admin','has_booked',
                    'handle_new_user','guard_availability_overlap',
                    'guard_booking_payment_fields')
order by p.proname;

-- booked_slots: expect security_definer true, args
--   (p_psychologist_id uuid, p_from timestamp with time zone, p_to timestamp with time zone),
--   returning a table -- check with:
--     select pg_get_function_result(oid) from pg_proc
--     where proname = 'booked_slots';
--   It must read `TABLE(slot_time timestamp with time zone, duration_minutes smallint)`.
--   If it reads `SETOF timestamp with time zone`, 0009 did not replace 0007's
--   version and the slot picker cannot detect overlapping sessions.

-- ---------------------------------------------------------------------------
-- 5. The booking guards from 0007/0009.
-- ---------------------------------------------------------------------------
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'bookings'
  and indexname = 'bookings_no_double_booking';

-- Expect indexdef to contain `WHERE (status <> 'cancelled'::booking_status)`.
-- Without the WHERE clause this is 0001's unrestricted constraint, and a
-- cancelled booking will occupy its slot forever.
