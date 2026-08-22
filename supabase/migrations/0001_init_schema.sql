-- mindfit :: initial schema
-- All 7 entities from the MVP plan are created up front so that Phases 3-6
-- (directory, booking, admin) need no migration rewrites. Only profiles/posts/
-- comments/likes/reports get UI in Phase 1-2.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('user', 'admin');
create type public.post_status as enum ('published', 'hidden', 'removed');
create type public.booking_status as enum ('pending', 'paid', 'cancelled', 'completed');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_target as enum ('post', 'comment');

-- ---------------------------------------------------------------------------
-- profiles :: 1:1 with auth.users
-- Supabase Auth owns auth.users (and the password hashes), so the plan's `User`
-- table becomes a profile row keyed to it. Role lives here, never in JWT
-- user_metadata -- that field is user-modifiable and must not drive authz.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  bio          text,
  role         public.user_role not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- posts
-- Tags are a text[] + GIN index rather than a join table: the plan specifies a
-- small fixed vocabulary (anxiety, relationships, self-help, ...) and this
-- keeps reads single-table.
-- ---------------------------------------------------------------------------

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  title      text not null check (char_length(trim(title)) between 3 and 200),
  body       text not null check (char_length(trim(body)) between 1 and 20000),
  tags       text[] not null default '{}',
  status     public.post_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_author_id_idx  on public.posts (author_id);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_status_idx     on public.posts (status);
create index posts_tags_idx       on public.posts using gin (tags);

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_post_id_idx   on public.comments (post_id, created_at);
create index comments_author_id_idx on public.comments (author_id);

-- ---------------------------------------------------------------------------
-- likes :: uniqueness enforced by the DB, so a double-tap is a no-op rather
-- than a duplicate row. Application code never has to dedupe.
-- ---------------------------------------------------------------------------

create table public.likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index likes_user_id_idx on public.likes (user_id);

-- ---------------------------------------------------------------------------
-- psychologists :: admin-managed roster, no public self-signup in v1
-- ---------------------------------------------------------------------------

create table public.psychologists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  credentials text not null,
  specialties text[] not null default '{}',
  bio         text,
  photo_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index psychologists_is_active_idx   on public.psychologists (is_active);
create index psychologists_specialties_idx on public.psychologists using gin (specialties);

-- ---------------------------------------------------------------------------
-- availability :: simple weekly schedule (day_of_week 0=Sunday)
-- ---------------------------------------------------------------------------

create table public.availability (
  id              uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  day_of_week     smallint not null check (day_of_week between 0 and 6),
  start_time      time not null,
  end_time        time not null,
  created_at      timestamptz not null default now(),
  constraint availability_time_order check (start_time < end_time)
);

create index availability_psychologist_id_idx on public.availability (psychologist_id, day_of_week);

-- ---------------------------------------------------------------------------
-- bookings
-- The unique (psychologist_id, slot_time) constraint is the double-booking
-- guard that motivated choosing Postgres over MongoDB for this project.
-- payment_provider / payment_ref stay null under the manual-payment flow and
-- are ready for a Safepay/PayFast integration without a migration.
-- ---------------------------------------------------------------------------

create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  psychologist_id  uuid not null references public.psychologists (id) on delete restrict,
  slot_time        timestamptz not null,
  status           public.booking_status not null default 'pending',
  notes            text,
  payment_provider text,
  payment_ref      text,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint bookings_no_double_booking unique (psychologist_id, slot_time)
);

create index bookings_user_id_idx   on public.bookings (user_id);
create index bookings_slot_time_idx on public.bookings (slot_time);
create index bookings_status_idx    on public.bookings (status);

-- ---------------------------------------------------------------------------
-- reports :: moderation queue
-- ---------------------------------------------------------------------------

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  target_type public.report_target not null,
  target_id   uuid not null,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text not null check (char_length(trim(reason)) between 1 and 1000),
  status      public.report_status not null default 'open',
  created_at  timestamptz not null default now(),
  constraint reports_one_per_user_per_target unique (target_type, target_id, reporter_id)
);

create index reports_status_idx      on public.reports (status, created_at desc);
create index reports_reporter_id_idx on public.reports (reporter_id);
create index reports_target_idx      on public.reports (target_type, target_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger posts_set_updated_at         before update on public.posts         for each row execute function public.set_updated_at();
create trigger comments_set_updated_at      before update on public.comments      for each row execute function public.set_updated_at();
create trigger psychologists_set_updated_at before update on public.psychologists for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at      before update on public.bookings      for each row execute function public.set_updated_at();
