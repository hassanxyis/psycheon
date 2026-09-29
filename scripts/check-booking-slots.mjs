/**
 * Sanity checks for src/lib/booking.ts.
 *
 * The project has no test runner, and the slot arithmetic is the one piece here
 * that is both easy to get wrong and impossible to eyeball -- a five-hour
 * timezone error looks correct on a developer machine set to Pakistan time and
 * wrong only in production. So this script exists to be run by hand:
 *
 *   node scripts/check-booking-slots.mjs
 *
 * It runs against the TypeScript source through Node's type stripping, which
 * needs Node 22.6+ (the Dockerfile pins node:22-alpine).
 *
 * Deliberately run with TZ=UTC below so it reproduces the container, not the
 * machine it is typed on.
 *
 * ts-alias-hook.mjs teaches bare Node the `@/*` path alias and the
 * extensionless imports TypeScript allows -- the alternative, making booking.ts
 * import relatively just so this script can load it, would bend application
 * code around its test.
 */

process.env.TZ = "UTC";

import { register } from "node:module";

register("./ts-alias-hook.mjs", import.meta.url);

const { buildCalendar, canCancel, formatSlotTime, isSlotOffered } = await import(
  new URL("../src/lib/booking.ts", import.meta.url).href
);

let failures = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`);
  }
}

function window(dayOfWeek, startTime, endTime) {
  return {
    id: `${dayOfWeek}-${startTime}`,
    psychologist_id: "p1",
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    created_at: "2026-01-01T00:00:00Z",
  };
}

// Monday 5 October 2026, 00:00 UTC == 05:00 clinic time. Chosen because it is a
// Monday in both zones, so a bug that shifts the day would not hide here.
const MONDAY = new Date("2026-10-05T00:00:00Z");

console.log("\nclinic offset (PKT = UTC+5)");
{
  // Monday 10:00-13:00 clinic, 60-minute sessions.
  const days = buildCalendar({
    availability: [window(1, "10:00:00", "13:00:00")],
    sessionMinutes: 60,
    bookedSlots: [],
    now: MONDAY,
    horizonDays: 1,
  });

  check("one day produced", days.length, 1);
  check("day label", [days[0].dayName, days[0].dateLabel], ["Monday", "5 October"]);
  // 10:00 clinic == 05:00 UTC. If this reads 10:00Z the offset was not applied.
  check(
    "slots are clinic-local, stored as UTC",
    days[0].slots.map((slot) => slot.iso),
    [
      "2026-10-05T05:00:00.000Z",
      "2026-10-05T06:00:00.000Z",
      "2026-10-05T07:00:00.000Z",
    ],
  );
  check(
    "labels are clinic wall-clock",
    days[0].slots.map((slot) => slot.label),
    ["10:00 am", "11:00 am", "12:00 pm"],
  );
}

console.log("\npartial sessions never overrun the window");
{
  // 90 minutes into a 3-hour window: 10:00 and 11:30 fit, 13:00 would not.
  const days = buildCalendar({
    availability: [window(1, "10:00:00", "13:00:00")],
    sessionMinutes: 90,
    bookedSlots: [],
    now: MONDAY,
    horizonDays: 1,
  });

  check(
    "90-minute sessions",
    days[0].slots.map((slot) => slot.label),
    ["10:00 am", "11:30 am"],
  );
}

console.log("\nbooked slots are marked, not hidden");
{
  const days = buildCalendar({
    availability: [window(1, "10:00:00", "13:00:00")],
    sessionMinutes: 60,
    // Offset form, as Postgres returns it -- not the "Z" form. Comparing the
    // strings directly rather than the instants would miss this.
    bookedSlots: ["2026-10-05T06:00:00+00:00"],
    now: MONDAY,
    horizonDays: 1,
  });

  check(
    "middle slot taken",
    days[0].slots.map((slot) => slot.taken),
    [false, true, false],
  );
  check(
    "a taken slot is not offered",
    isSlotOffered("2026-10-05T06:00:00.000Z", days),
    false,
  );
  check(
    "a free slot is offered",
    isSlotOffered("2026-10-05T05:00:00.000Z", days),
    true,
  );
  check(
    "an invented slot is refused",
    isSlotOffered("2026-10-05T22:00:00.000Z", days),
    false,
  );
}

console.log("\npast slots are dropped");
{
  // 06:30 UTC == 11:30 clinic, so 10:00 and 11:00 are already gone.
  const days = buildCalendar({
    availability: [window(1, "10:00:00", "13:00:00")],
    sessionMinutes: 60,
    bookedSlots: [],
    now: new Date("2026-10-05T06:30:00Z"),
    horizonDays: 1,
  });

  check(
    "only the remaining slot",
    days[0].slots.map((slot) => slot.label),
    ["12:00 pm"],
  );
}

console.log("\nempty days are dropped entirely");
{
  // Availability on Wednesday only, horizon of 2 days from Monday.
  const days = buildCalendar({
    availability: [window(3, "10:00:00", "11:00:00")],
    sessionMinutes: 60,
    bookedSlots: [],
    now: MONDAY,
    horizonDays: 2,
  });

  check("no matching weekday in range", days.length, 0);
}

console.log("\nthe weekly schedule repeats across the horizon");
{
  const days = buildCalendar({
    availability: [window(1, "10:00:00", "11:00:00")],
    sessionMinutes: 60,
    bookedSlots: [],
    now: MONDAY,
    horizonDays: 28,
  });

  check("four Mondays in four weeks", days.length, 4);
  check(
    "seven days apart each time",
    days.map((day) => day.date),
    ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"],
  );
}

console.log("\ntwo sittings on one day merge and sort");
{
  const days = buildCalendar({
    // Evening window listed first, to prove the sort is not relying on input order.
    availability: [window(1, "17:00:00", "18:00:00"), window(1, "10:00:00", "11:00:00")],
    sessionMinutes: 60,
    bookedSlots: [],
    now: MONDAY,
    horizonDays: 1,
  });

  check("both sittings on one day", days.length, 1);
  check(
    "sorted by time",
    days[0].slots.map((slot) => slot.label),
    ["10:00 am", "5:00 pm"],
  );
}

console.log("\nan early clinic slot crosses back over UTC midnight");
{
  // 02:00 clinic on Monday is 21:00 UTC on Sunday. The clinic-local date must
  // stay Monday even though the stored instant is a Sunday.
  const days = buildCalendar({
    availability: [window(1, "02:00:00", "03:00:00")],
    sessionMinutes: 60,
    bookedSlots: [],
    now: new Date("2026-10-04T00:00:00Z"),
    horizonDays: 2,
  });

  check("day is Monday", [days[0].dayName, days[0].date], ["Monday", "2026-10-05"]);
  check("instant is Sunday UTC", days[0].slots[0].iso, "2026-10-04T21:00:00.000Z");
}

console.log("\nformatSlotTime renders in clinic time, not UTC");
{
  // 05:00 UTC is 10:00 in Lahore. Formatting in the container's zone would say 5am.
  check(
    "stored instant to clinic label",
    formatSlotTime("2026-10-05T05:00:00.000Z"),
    "Monday 5 October 2026, 10:00 am",
  );
  check(
    "instant that is the previous day in UTC",
    formatSlotTime("2026-10-04T21:00:00.000Z"),
    "Monday 5 October 2026, 2:00 am",
  );
}

console.log("\ncancellation cutoff is 24 hours");
{
  const slot = "2026-10-05T05:00:00.000Z";
  check("25 hours ahead", canCancel(slot, new Date("2026-10-04T04:00:00Z")), true);
  check("23 hours ahead", canCancel(slot, new Date("2026-10-04T06:00:00Z")), false);
  check("after the slot", canCancel(slot, new Date("2026-10-05T06:00:00Z")), false);
}

console.log("\nmalformed availability does not throw");
{
  const days = buildCalendar({
    availability: [window(1, "not-a-time", "11:00:00")],
    sessionMinutes: 60,
    bookedSlots: [],
    now: MONDAY,
    horizonDays: 1,
  });

  check("bad window yields no slots", days.length, 0);
  check("non-positive session length", isSlotOffered("nonsense", []), false);
}

console.log(
  failures === 0
    ? "\nAll checks passed.\n"
    : `\n${failures} check(s) failed.\n`,
);

process.exit(failures === 0 ? 0 : 1);
