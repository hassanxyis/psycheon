/**
 * Does booked_slots() actually return what src/lib/booking.ts expects?
 *
 *   node scripts/check-booked-slots-rpc.mjs
 *
 * check-migrations.mjs proves the function exists with the right signature.
 * That is not the same as proving its *result* deserialises into a BookedSlot --
 * `src/lib/types/database.ts` is hand-written, so a mismatch between the SQL and
 * the TypeScript is exactly the kind of thing nothing catches until a member is
 * looking at a broken calendar.
 *
 * This calls the real function against the project in .env.local and checks the
 * shape of what comes back. Read-only.
 */

import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
}

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!URL_BASE || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY missing from .env.local");
  process.exit(2);
}

let failures = 0;
function check(name, pass, detail) {
  console.log(`  ${pass ? "ok  " : "FAIL"} ${name}${detail ? ` -- ${detail}` : ""}`);
  if (!pass) failures += 1;
}

async function callRpc(args) {
  const response = await fetch(`${URL_BASE}/rest/v1/rpc/booked_slots`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, ok: response.ok, body };
}

console.log(`\nCalling booked_slots() on ${URL_BASE}\n`);

// A psychologist id that cannot exist, so this is guaranteed to touch no data.
const NOBODY = "00000000-0000-0000-0000-000000000000";

const empty = await callRpc({
  p_psychologist_id: NOBODY,
  p_from: "2026-01-01T00:00:00Z",
  p_to: "2026-01-08T00:00:00Z",
});

check("callable by an anonymous visitor", empty.ok, empty.ok ? "" : `HTTP ${empty.status} ${JSON.stringify(empty.body)?.slice(0, 160)}`);

if (!empty.ok) {
  console.log(
    "\nThe grant in migration 0007/0009 is `to anon, authenticated`. A 401/403 here\n" +
      "means it did not take, and a signed-out visitor would see every slot as free.\n",
  );
  process.exit(1);
}

check(
  "returns an array",
  Array.isArray(empty.body),
  Array.isArray(empty.body) ? `${empty.body.length} row(s)` : typeof empty.body,
);

// The set-returning form must come back as rows of named columns. 0007's scalar
// version returned bare timestamp strings, and `row.slot_time` on a string is
// undefined -- which would make every slot read as free rather than erroring.
check(
  "not the pre-0009 scalar shape",
  empty.body.length === 0 || typeof empty.body[0] === "object",
  empty.body.length === 0
    ? "no rows to inspect (see below)"
    : `first row is ${typeof empty.body[0]}`,
);

if (empty.body.length > 0) {
  const row = empty.body[0];
  check("row has slot_time", "slot_time" in row, JSON.stringify(row));
  check("row has duration_minutes", "duration_minutes" in row, JSON.stringify(row));
  check(
    "slot_time parses as a date",
    !Number.isNaN(new Date(row.slot_time).getTime()),
    String(row.slot_time),
  );
  check(
    "duration_minutes is a number",
    typeof row.duration_minutes === "number",
    `${typeof row.duration_minutes}: ${row.duration_minutes}`,
  );
}

// Wrong argument names must be rejected, not silently treated as a call with
// defaults -- getBookedSlots() passes p_psychologist_id / p_from / p_to, and a
// rename on either side needs to break loudly.
const wrongArgs = await callRpc({ psychologist_id: NOBODY, from: "x", to: "y" });
check(
  "rejects mismatched argument names",
  !wrongArgs.ok,
  wrongArgs.ok ? "accepted them, which hides a rename" : `HTTP ${wrongArgs.status}`,
);

if (empty.body.length === 0) {
  console.log(
    "\nNo rows came back, which is expected: the uuid used matches no psychologist.\n" +
      "The column-shape checks above can only run against real rows -- re-run this\n" +
      "after the first booking exists to confirm the deserialisation end to end.\n",
  );
}

console.log(failures === 0 ? "All checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
