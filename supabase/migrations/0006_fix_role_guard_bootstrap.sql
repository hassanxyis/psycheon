-- mindfit :: make the first admin possible
--
-- prevent_role_self_escalation (0003) rejected every role change unless
-- private.is_admin() was already true. Run from the SQL editor, a migration, or
-- any other non-request context, auth.uid() is null, so is_admin() is false and
-- the update was refused -- including the promotion documented at the bottom of
-- 0002. No admin could be created because no admin existed.
--
-- The guard now only applies to requests that carry a signed-in user. A trusted
-- context (SQL editor, service_role, psql, a migration) has no auth.uid() and is
-- already past every RLS policy on this table, so gating it added no security --
-- it only blocked the one operation the project needs to bootstrap itself.
--
-- What is still enforced, and is the point of this trigger: a signed-in user
-- cannot promote themselves. That path always has auth.uid() set.

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     -- Only guard real user requests. A null uid means a trusted context that
     -- has already bypassed RLS; there is nothing left for this check to add.
     and (select auth.uid()) is not null
     and not (select private.is_admin())
  then
    raise exception 'role may only be changed by an admin';
  end if;

  return new;
end;
$$;

-- Promote the first admin (run once, with your own address):
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
--
-- Verify it matched a row -- a wrong address updates nothing and reports success:
--   select display_name, role from public.profiles where role = 'admin';
