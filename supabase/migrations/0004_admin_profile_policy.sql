-- mindfit :: admin policies required by the admin panel
--
-- Two gaps that only surface once admins have a UI:
--
-- 1. profiles UPDATE -- the existing policy only permits auth.uid() = id, so an
--    admin could not change another user's role at all. The existing
--    profiles_guard_role trigger still prevents non-admin self-promotion.
--
-- 2. comments SELECT -- the only read policy requires the parent post to be
--    'published'. Since moderating a post sets it to hidden/removed, a reported
--    comment on a moderated post became invisible to the very admins who are
--    allowed to delete it ("admins delete any comment" already exists).

-- Dropped first because `create policy` has no IF NOT EXISTS. Re-running this
-- file raised 42710 on the first statement, which aborted it before the second
-- -- so "admins view all comments" would have been silently skipped, and a
-- reported comment on a hidden post would be invisible to the admins allowed to
-- delete it. The error looked like a harmless "already exists".
drop policy if exists "admins update any profile" on public.profiles;

create policy "admins update any profile"
  on public.profiles for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "admins view all comments" on public.comments;

create policy "admins view all comments"
  on public.comments for select
  to authenticated
  using ((select private.is_admin()));
