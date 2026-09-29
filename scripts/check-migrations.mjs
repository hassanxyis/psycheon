/**
 * Which migrations are actually applied to the Supabase project in .env.local.
 *
 *   node scripts/check-migrations.mjs
 *
 * There is no linked Supabase CLI project and no schema_migrations table, so
 * nothing records what has been run -- the repo only knows what has been
 * *written*. This asks the database instead, by probing for the specific column,
 * function and function-signature each migration introduces.
 *
 * Almost entirely read-only: selects, and rpc calls whose arguments match
 * nothing. The one exception is a deliberate insert into `posts` used to test
 * whether RLS is in force -- it is constructed to fail twice over (no policy
 * permits an anonymous insert, and its author_id is a uuid no profile has, so the
 * foreign key rejects it even if the policy did not). Nothing is ever stored.
 *
 * It authenticates with the publishable key, which is what the browser uses, so
 * it sees exactly what an anonymous visitor sees. That bounds what is knowable:
 * a trigger or an RLS policy is invisible from out here, so those migrations are
 * reported as "not probeable" rather than guessed at. Where a migration cannot
 * be detected directly, the probe says so instead of inferring.
 */

import { readFileSync } from "node:fs";

const ENV_PATH = new URL("../.env.local", import.meta.url);

function readEnv() {
  let raw;
  try {
    raw = readFileSync(ENV_PATH, "utf8");
  } catch {
    console.error(
      "Could not read .env.local. Copy .env.example to .env.local and fill it in.",
    );
    process.exit(2);
  }

  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = readEnv();
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!URL_BASE || !KEY) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must both be set in .env.local.",
  );
  process.exit(2);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

/**
 * One retry on a thrown request. A transient failure reads as "unclear", and an
 * unclear answer to "has this migration run" is the least useful outcome there
 * is -- worse than either yes or no, because it cannot be acted on.
 */
async function request(url, init) {
  try {
    return await fetch(url, init);
  } catch {
    return fetch(url, init);
  }
}

/** GET against PostgREST. Returns {ok, status, code, body}. */
async function get(path) {
  const response = await request(`${URL_BASE}/rest/v1/${path}`, { headers });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return {
    ok: response.ok,
    status: response.status,
    code: body?.code ?? null,
    message: body?.message ?? null,
    body,
  };
}

async function rpc(name, args) {
  const response = await request(`${URL_BASE}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return {
    ok: response.ok,
    status: response.status,
    code: body?.code ?? null,
    message: body?.message ?? null,
    body,
  };
}

/** True if a table exists and `column` is selectable. 42703 = undefined_column. */
async function hasColumn(table, column) {
  const result = await get(`${table}?select=${column}&limit=1`);
  if (result.ok) return true;
  if (result.code === "42703") return false;
  return null; // something else went wrong -- do not guess
}

async function tableExists(table) {
  const result = await get(`${table}?select=id&limit=1`);
  if (result.ok) return true;
  // 42P01 undefined_table; PGRST205 is PostgREST's "not in schema cache".
  if (result.code === "42P01" || result.code === "PGRST205") return false;
  if (result.code === "42703") return true; // exists, just has no `id`
  return null;
}

const UNKNOWN_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * booked_slots() distinguishes three states:
 *  - absent      -> 0007 not applied
 *  - timestamps  -> 0007 applied, 0009 not
 *  - rows with duration_minutes -> 0009 applied
 *
 * Called with a uuid that matches nothing and a one-second range, so it returns
 * an empty set on a healthy database. An empty result cannot distinguish the two
 * shapes, so the 0009 probe leans on the argument list instead: 0009's version is
 * `returns table (...)`, which PostgREST exposes as a relation -- selecting a
 * named column from it succeeds, where the scalar 0007 version rejects it.
 */
async function bookedSlotsState() {
  const probe = await rpc("booked_slots", {
    p_psychologist_id: UNKNOWN_UUID,
    p_from: "2000-01-01T00:00:00Z",
    p_to: "2000-01-01T00:00:01Z",
  });

  // PGRST202 = no function matching that name/signature.
  if (probe.code === "PGRST202" || probe.status === 404) return "absent";
  if (!probe.ok) return null;

  const shaped = await request(
    `${URL_BASE}/rest/v1/rpc/booked_slots?select=slot_time,duration_minutes`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_psychologist_id: UNKNOWN_UUID,
        p_from: "2000-01-01T00:00:00Z",
        p_to: "2000-01-01T00:00:01Z",
      }),
    },
  );

  return shaped.ok ? "with-duration" : "timestamps-only";
}

const YES = "APPLIED";
const NO = "NOT APPLIED";
const HUH = "UNCLEAR";
const OPAQUE = "NOT PROBEABLE";

const results = [];
function record(id, title, state, detail) {
  results.push({ id, title, state, detail });
}

console.log(
  `\nProbing ${URL_BASE}\n(as an anonymous visitor; reads, plus one insert that is designed to be refused)\n`,
);

// ---------------------------------------------------------------------------

const psychologists = await tableExists("psychologists");
const bookings = await tableExists("bookings");

if (psychologists === null) {
  console.error(
    "Could not reach the database, or the publishable key was rejected.\n" +
      "Check NEXT_PUBLIC_SUPABASE_URL and the key in .env.local.",
  );
  process.exit(2);
}

record(
  "0001",
  "initial schema",
  psychologists && bookings ? YES : psychologists || bookings ? HUH : NO,
  psychologists && bookings
    ? "psychologists and bookings both exist"
    : "expected both psychologists and bookings to exist",
);

/**
 * `profiles` is world-readable by design (0003 -- author names on posts), which
 * makes it the one window onto three otherwise invisible migrations.
 */
const profiles = await get("profiles?select=id,role");
const profileRows = Array.isArray(profiles.body) ? profiles.body : [];
const anyProfile = profileRows.length > 0;
const anyAdmin = profileRows.some((row) => row.role === "admin");

record(
  "0002",
  "handle_new_user trigger",
  anyProfile ? YES : OPAQUE,
  anyProfile
    ? `${profileRows.length} profile row(s) exist, and nothing in the app inserts into profiles -- only this trigger does`
    : "a trigger is invisible to the client, and there are no profiles yet to infer from; confirm by signing up and checking display_name is the name, not the email local-part",
);

/**
 * RLS cannot be read directly, but it can be *tested*: no policy on `bookings`
 * or `reports` grants anything to `anon`, so a row coming back here means RLS is
 * off or the policies never landed. Absence of rows proves nothing (the table may
 * simply be empty), so this only ever reports a leak, never a clean bill.
 */
async function leaksToAnon(table) {
  const result = await get(`${table}?select=id&limit=1`);
  if (!result.ok) return false;
  return Array.isArray(result.body) && result.body.length > 0;
}

const bookingLeak = bookings ? await leaksToAnon("bookings") : false;
const reportLeak = await leaksToAnon("reports");

/**
 * A write attempt is the sharpest test available, because it does not depend on
 * any table having rows. No policy grants `anon` insert on `posts` (0003 scopes
 * every insert `to authenticated`), so a success would mean RLS is not in force.
 *
 * This is the one non-read in the script. It is written to fail: author_id is a
 * uuid that cannot exist, so even in the catastrophic case where it is permitted,
 * the foreign key to profiles rejects it (23503) and nothing is stored.
 */
async function anonCanInsertPost() {
  const response = await request(`${URL_BASE}/rest/v1/posts`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      author_id: UNKNOWN_UUID,
      title: "rls probe -- should never be stored",
      body: "rls probe",
    }),
  });

  // 42501 insufficient_privilege / 401 / 403 are all "RLS refused", the healthy
  // answer. 23503 means the policy allowed it and only the foreign key stopped it.
  if (response.status === 401 || response.status === 403) return false;
  const text = await response.text();
  if (/42501/.test(text)) return false;
  if (/23503/.test(text)) return true;
  return response.ok ? true : false;
}

const writeLeak = await anonCanInsertPost();
const anyLeak = bookingLeak || reportLeak || writeLeak;

record(
  "0003",
  "RLS policies",
  anyLeak ? NO : anyProfile ? YES : OPAQUE,
  anyLeak
    ? `LEAK: anonymous access succeeded on ${
        [
          bookingLeak && "reading bookings",
          reportLeak && "reading reports",
          writeLeak && "inserting a post",
        ]
          .filter(Boolean)
          .join(" and ")
      } -- no policy permits that, so RLS is not in force`
    : "an anonymous insert into posts was refused, and bookings/reports leaked nothing -- consistent with the policies being in place",
);

record(
  "0004",
  "admins update any profile",
  OPAQUE,
  anyAdmin
    ? "a policy, not visible from here -- but an admin exists and the admin panel could not manage roles without it, so it is almost certainly applied"
    : "a policy; not visible from here",
);

const years = await hasColumn("psychologists", "years_experience");
const sessionFee = await hasColumn("psychologists", "session_fee");
record(
  "0005",
  "richer psychologist profiles",
  years && sessionFee ? YES : years === false || sessionFee === false ? NO : HUH,
  years && sessionFee
    ? "years_experience and session_fee present"
    : "years_experience / session_fee missing",
);

record(
  "0006",
  "role guard bootstrap fix",
  // 0003's profiles_guard_role refused every role change when auth.uid() is
  // null, which is the case in the SQL editor -- so before 0006 the first admin
  // could not be created at all. An admin existing is the evidence.
  anyAdmin ? YES : OPAQUE,
  anyAdmin
    ? "an admin row exists, and 0003's role guard made that impossible from the SQL editor until 0006 scoped it to signed-in users"
    : "changes a trigger function. If the first-admin promote in 0002's footer worked, this is applied",
);

const sessionMinutes = await hasColumn("psychologists", "session_minutes");
const slots = await bookedSlotsState();

record(
  "0007",
  "booking slots",
  sessionMinutes && slots !== "absent"
    ? YES
    : sessionMinutes === false && slots === "absent"
      ? NO
      : HUH,
  `session_minutes ${
    sessionMinutes === null ? "unclear" : sessionMinutes ? "present" : "missing"
  }, booked_slots() ${slots ?? "unclear"}`,
);

record(
  "0008",
  "no overlapping availability",
  OPAQUE,
  "a trigger. Confirm by adding two overlapping windows for one psychologist in /admin -- the second should be refused",
);

const durationColumn = bookings
  ? await hasColumn("bookings", "duration_minutes")
  : null;

record(
  "0009",
  "booking duration",
  // `absent` means 0007 never ran either, so 0009 -- which replaces 0007's
  // function -- cannot have run. That is a definite no, not an unclear.
  slots === "with-duration" && durationColumn
    ? YES
    : slots === "absent" || slots === "timestamps-only" || durationColumn === false
      ? NO
      : HUH,
  slots === "with-duration" && durationColumn
    ? "bookings.duration_minutes present and booked_slots() returns it"
    : slots === "absent"
      ? "booked_slots() does not exist at all, so 0007 has not run and 0009 (which replaces it) cannot have"
      : slots === "timestamps-only"
        ? "booked_slots() exists but returns bare timestamps -- that is 0007's version, 0009 has not replaced it"
        : `bookings.duration_minutes ${
            durationColumn === false ? "missing" : "unclear"
          }`,
);

// ---------------------------------------------------------------------------

const width = Math.max(...results.map((r) => r.title.length));

for (const { id, title, state, detail } of results) {
  const badge =
    state === YES
      ? "  applied  "
      : state === NO
        ? "  MISSING  "
        : state === OPAQUE
          ? "     --     "
          : "  unclear  ";
  console.log(`${badge} ${id}  ${title.padEnd(width)}   ${detail}`);
}

const missing = results.filter((r) => r.state === NO);
const unclear = results.filter((r) => r.state === HUH);

console.log("");
if (missing.length > 0) {
  // Any un-probeable migration numbered above the lowest missing one has to be
  // run too -- it cannot have been applied out of order, and leaving it out of
  // this list would read as "already done". 0008 is trigger-only and invisible,
  // so it would otherwise vanish between a missing 0007 and a missing 0009.
  const lowest = missing[0].id;
  const alsoNeeded = results.filter(
    (r) => r.state === OPAQUE && r.id > lowest,
  );

  const order = [...missing, ...alsoNeeded]
    .map((r) => r.id)
    .sort()
    .join(", ");

  console.log(`Still to run, in order: ${order}`);
  if (alsoNeeded.length > 0) {
    console.log(
      `  (${alsoNeeded
        .map((r) => r.id)
        .join(", ")} cannot be probed from here, but ${lowest} is missing, so they cannot have run either.)`,
    );
  }
  console.log(
    "Apply each file's full contents in the Supabase dashboard SQL editor.",
  );
} else if (unclear.length > 0) {
  console.log(`Could not determine: ${unclear.map((r) => r.id).join(", ")}.`);
} else {
  console.log(
    "Every probeable migration is applied. The ones marked -- still need the SQL below.",
  );
}

console.log(`
The four marked -- are triggers and policies, which a client cannot see. To
check those directly, run this in the SQL editor:

  select tgname from pg_trigger
  where not tgisinternal
    and tgrelid in ('public.profiles'::regclass,
                    'public.bookings'::regclass,
                    'public.availability'::regclass);
  -- expect: profiles_guard_role, profiles_set_updated_at (0001/0003),
  --         bookings_guard_payment, bookings_set_updated_at (0001/0003),
  --         availability_guard_overlap (0008)

  select tablename, policyname from pg_policies
  where schemaname = 'public' order by tablename, policyname;
  -- expect ~20 policies (0003), plus "admins update any profile" (0004)
  -- and "members view psychologists they have booked" (0007)

  select count(*) from pg_policies
  where schemaname = 'public' and tablename = 'bookings';
  -- expect 5. Zero here with the table present means 0003 never ran, and
  -- every booking in the project is world-readable.
`);

process.exit(missing.length > 0 ? 1 : 0);
