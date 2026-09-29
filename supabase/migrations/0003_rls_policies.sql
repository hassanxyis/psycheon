-- mindfit :: row level security
--
-- Conventions used throughout, per Supabase guidance:
--   * (select auth.uid())  -- subquery so the optimizer caches it per statement
--                             instead of re-evaluating per row
--   * one policy per operation; UPDATE needs both `using` and `with check`
--   * every policy scoped `to authenticated` / `to anon` so it does not run for
--     other roles
--   * every column referenced below is indexed in 0001
--
-- RLS is the actual security boundary for this app. The Next.js proxy only
-- refreshes tokens; it does not gate data.
--
-- Every `create policy` here is preceded by `drop policy if exists`, because
-- `create policy` has no IF NOT EXISTS and this file declares 31 of them. Run it
-- twice without the drops and it aborts on the first policy with 42710 -- an
-- error that reads like a harmless "already exists" while every policy after the
-- failure point silently does not get created. On a file that *is* the security
-- boundary, a partial apply is the worst possible outcome: the app keeps working
-- and the guard is simply missing. The drops make the file safe to re-run in
-- full, which is the only way to be sure of what is in the database.

-- ---------------------------------------------------------------------------
-- admin check
-- A policy that reads public.profiles to determine admin-ness would recurse
-- into profiles' own policies forever. A security definer function bypasses RLS
-- on the tables it touches and breaks the cycle. It lives in a private schema
-- that is NOT exposed via the API.
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles      enable row level security;
alter table public.posts         enable row level security;
alter table public.comments      enable row level security;
alter table public.likes         enable row level security;
alter table public.psychologists enable row level security;
alter table public.availability  enable row level security;
alter table public.bookings      enable row level security;
alter table public.reports       enable row level security;

-- ---------------------------------------------------------------------------
-- profiles :: public read (author names on posts), self-write only
-- ---------------------------------------------------------------------------

drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "users insert their own profile" on public.profiles;
create policy "users insert their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);

-- Role is deliberately omitted from the WITH CHECK: a user may edit their own
-- profile but must not be able to promote themselves to admin. Enforced by the
-- guard trigger below, since column-level RLS is not available.
drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not (select private.is_admin()) then
    raise exception 'role may only be changed by an admin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ---------------------------------------------------------------------------
-- posts :: published posts are world-readable; authors manage their own
-- ---------------------------------------------------------------------------

drop policy if exists "published posts are viewable by everyone" on public.posts;
create policy "published posts are viewable by everyone"
  on public.posts for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "authors view their own posts in any status" on public.posts;
create policy "authors view their own posts in any status"
  on public.posts for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = author_id);

drop policy if exists "admins view all posts" on public.posts;
create policy "admins view all posts"
  on public.posts for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "authenticated users create their own posts" on public.posts;
create policy "authenticated users create their own posts"
  on public.posts for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = author_id);

drop policy if exists "authors update their own posts" on public.posts;
create policy "authors update their own posts"
  on public.posts for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

drop policy if exists "admins update any post" on public.posts;
create policy "admins update any post"
  on public.posts for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "authors delete their own posts" on public.posts;
create policy "authors delete their own posts"
  on public.posts for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = author_id);

drop policy if exists "admins delete any post" on public.posts;
create policy "admins delete any post"
  on public.posts for delete
  to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

drop policy if exists "comments on published posts are viewable by everyone" on public.comments;
create policy "comments on published posts are viewable by everyone"
  on public.comments for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = comments.post_id and p.status = 'published'
    )
  );

drop policy if exists "authenticated users create their own comments" on public.comments;
create policy "authenticated users create their own comments"
  on public.comments for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = author_id
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.status = 'published'
    )
  );

drop policy if exists "authors update their own comments" on public.comments;
create policy "authors update their own comments"
  on public.comments for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

drop policy if exists "authors delete their own comments" on public.comments;
create policy "authors delete their own comments"
  on public.comments for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = author_id);

drop policy if exists "admins delete any comment" on public.comments;
create policy "admins delete any comment"
  on public.comments for delete
  to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- likes :: counts are public, but you may only like as yourself
-- ---------------------------------------------------------------------------

drop policy if exists "likes are viewable by everyone" on public.likes;
create policy "likes are viewable by everyone"
  on public.likes for select
  to anon, authenticated
  using (true);

drop policy if exists "users like as themselves" on public.likes;
create policy "users like as themselves"
  on public.likes for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "users remove their own likes" on public.likes;
create policy "users remove their own likes"
  on public.likes for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- psychologists / availability :: public directory, admin-managed (Phase 3-4)
-- ---------------------------------------------------------------------------

drop policy if exists "active psychologists are viewable by everyone" on public.psychologists;
create policy "active psychologists are viewable by everyone"
  on public.psychologists for select
  to anon, authenticated
  using (is_active);

drop policy if exists "admins manage psychologists" on public.psychologists;
create policy "admins manage psychologists"
  on public.psychologists for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "availability is viewable by everyone" on public.availability;
create policy "availability is viewable by everyone"
  on public.availability for select
  to anon, authenticated
  using (true);

drop policy if exists "admins manage availability" on public.availability;
create policy "admins manage availability"
  on public.availability for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- bookings :: private to the booking user and admins (Phase 4)
-- ---------------------------------------------------------------------------

drop policy if exists "users view their own bookings" on public.bookings;
create policy "users view their own bookings"
  on public.bookings for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "admins view all bookings" on public.bookings;
create policy "admins view all bookings"
  on public.bookings for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "users create their own bookings" on public.bookings;
create policy "users create their own bookings"
  on public.bookings for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Users may cancel/reschedule their own booking. Marking a booking 'paid' is an
-- admin action under the manual-payment flow -- guarded by the trigger below.
drop policy if exists "users update their own bookings" on public.bookings;
create policy "users update their own bookings"
  on public.bookings for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "admins update any booking" on public.bookings;
create policy "admins update any booking"
  on public.bookings for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create or replace function public.guard_booking_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.is_admin()) then
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status not in ('cancelled') then
    raise exception 'only an admin may set booking status to %', new.status;
  end if;

  if new.payment_provider is distinct from old.payment_provider
     or new.payment_ref is distinct from old.payment_ref
     or new.paid_at is distinct from old.paid_at then
    raise exception 'payment fields are admin-only';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_guard_payment on public.bookings;
create trigger bookings_guard_payment
  before update on public.bookings
  for each row execute function public.guard_booking_payment_fields();

-- ---------------------------------------------------------------------------
-- reports :: write-only for users, readable only by admins
-- ---------------------------------------------------------------------------

drop policy if exists "users file their own reports" on public.reports;
create policy "users file their own reports"
  on public.reports for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = reporter_id);

drop policy if exists "admins view reports" on public.reports;
create policy "admins view reports"
  on public.reports for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "admins update reports" on public.reports;
create policy "admins update reports"
  on public.reports for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
