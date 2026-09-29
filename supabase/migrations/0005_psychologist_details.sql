-- mindfit :: richer psychologist profiles
--
-- Fields the public directory can show beyond name/credentials/specialties/bio.
-- All nullable or defaulted, so existing rows stay valid without a backfill.
--
-- No RLS change is needed: "admins manage psychologists" is `for all`, and
-- "active psychologists are viewable by everyone" does not name columns, so
-- both policies pick these up automatically.

alter table public.psychologists
  add column if not exists years_experience smallint
    check (years_experience is null or years_experience between 0 and 70),
  -- text[] to match `specialties`, so the admin form parses both the same way.
  add column if not exists languages text[] not null default '{}',
  -- Whole rupees. integer not numeric -- PKR has no meaningful minor unit here,
  -- and a fee is displayed, never arithmetic'd.
  add column if not exists session_fee integer
    check (session_fee is null or session_fee >= 0),
  add column if not exists location text;

-- Directory filtering by language mirrors how posts.tags is indexed in 0001.
create index if not exists psychologists_languages_idx
  on public.psychologists using gin (languages);
