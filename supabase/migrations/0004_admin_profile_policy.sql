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

create policy "admins update any profile"
  on public.profiles for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "admins view all comments"
  on public.comments for select
  to authenticated
  using ((select private.is_admin()));
