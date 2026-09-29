-- Make an account you can already sign into an admin.
--
-- Run in the Supabase dashboard SQL editor.
--
-- The situation this solves: there are two profiles in this project --
-- "Syed Hassan" (role user) and "ADMIN - Syed Hassan" (role admin). The admin
-- one was created by hand and its password is unknown, so it cannot be signed
-- into. Rather than recover that password, promote the account you *can* sign
-- into. Role lives on public.profiles, so this is a one-row update.
--
-- Checked against this project's auth settings: email+password is the only
-- enabled provider (Google is off, so the Google button on /login will error),
-- and mailer_autoconfirm is false, so an unconfirmed address cannot sign in.
--
-- If you do not know the password for EITHER account, do not reset it from the
-- app -- Supabase's built-in sender allows 2 messages/hour and refuses addresses
-- outside the project team, so the email will probably never arrive. Set it
-- directly instead:
--
--   Dashboard -> Authentication -> Users -> pick the user -> ... menu
--     -> "Reset password" sends mail (unreliable here), so prefer
--     -> the user's row -> edit -> set a new password directly.
--
-- While there, confirm the address if email_confirmed below is false
-- (same menu -> "Confirm email"). Both are dashboard actions, not SQL --
-- auth.users passwords are bcrypt hashes and must not be written by hand.

-- ---------------------------------------------------------------------------
-- 1. See what you have. Emails live in auth.users, names in public.profiles.
-- ---------------------------------------------------------------------------

select
  u.email,
  p.display_name,
  p.role,
  (u.encrypted_password is not null and u.encrypted_password <> '')
                                as has_password,
  u.email_confirmed_at is not null as email_confirmed,
  u.last_sign_in_at
from auth.users u
join public.profiles p on p.id = u.id
order by u.created_at;

-- has_password false means the account was created without one (an admin row
-- inserted by hand, or a Google-only signup) -- there is no password to recover,
-- which is why promoting the other account is the right move.
--
-- email_confirmed false means sign-in will be refused until the address is
-- confirmed. Supabase's built-in sender is capped at 2 messages/hour and only
-- delivers to project-team addresses, so confirm it in the dashboard instead:
-- Authentication -> Users -> the user -> Confirm email.

-- ---------------------------------------------------------------------------
-- 2. Promote. Replace the address with the one you can sign into.
-- ---------------------------------------------------------------------------

update public.profiles
set role = 'admin',
    updated_at = now()
where id = (select id from auth.users where email = 'REPLACE-WITH-YOUR-EMAIL');

-- ---------------------------------------------------------------------------
-- 3. Verify. This matters more than it looks.
--
-- A typo makes the subquery null, the update matches no rows, and Postgres
-- reports success anyway. The only way to know it worked is to look.
-- ---------------------------------------------------------------------------

select u.email, p.display_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin';

-- Expect your own address in that list. Then sign in at /login and the account
-- menu will have an "Admin panel" item.
--
-- If the update raised "only an admin may change roles", migration 0006 has not
-- applied -- 0003's profiles_guard_role rejects every role change when
-- auth.uid() is null, which is the case in this editor. Apply 0006 and retry.

-- ---------------------------------------------------------------------------
-- 4. Afterwards: tidy up the unusable admin row
--
-- Leaving a second admin account that nobody can sign into is a standing
-- liability -- it has full privileges and no owner. Once your own account works,
-- demote it:
--
--   update public.profiles set role = 'user'
--   where display_name = 'ADMIN - Syed Hassan';
--
-- Deleting the auth.users row would cascade to its profile (on delete cascade in
-- 0001) and take any posts or bookings it owns with it, so demoting is the
-- conservative move. Do this only after confirming step 3 -- updateUserRole()
-- refuses to change your own role, which is deliberate: it stops an admin
-- locking the project out of its own admin area. If you demote the only working
-- admin you are back to the SQL editor.
