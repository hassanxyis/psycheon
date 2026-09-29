-- mindfit :: auth.users -> public.profiles
-- Every new auth user gets a profile row automatically, so application code can
-- assume the row exists. Role always defaults to 'user' here; admin is granted
-- manually via SQL (see bottom of file) and never through anything a client
-- can influence.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    -- OAuth gives us a name; email signup does not, so fall back to the local
    -- part of the address rather than leaving the column empty.
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Promote an admin (run manually, replacing the address):
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
--
-- NOTE: as written this fails until migration 0006 is applied. The
-- profiles_guard_role trigger added in 0003 rejects the update because
-- auth.uid() is null outside a request, so private.is_admin() is false. 0006
-- scopes that guard to signed-in users and unblocks this statement.
--
-- The address must belong to an existing auth.users row. A typo makes the
-- subquery null, the update matches nothing, and Postgres still reports
-- success -- always verify afterwards:
--   select display_name, role from public.profiles where role = 'admin';
