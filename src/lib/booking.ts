/**
 * Turning a weekly schedule into bookable slots.
 *
 * `availability` rows are wall-clock windows that repeat every week (Monday
 * 10:00-13:00). `bookings.slot_time` is a single `timestamptz`. This file is the
 * bridge, and it is pure -- `now` is always passed in, never read from the
 * clock, so the same inputs always produce the same slots.
 *
 * ## The timezone trap
 *
 * `availability.start_time` is a bare Postgres `time`: it means "10am at the
 * clinic" and carries no zone. The production container runs in UTC (nothing
 * sets TZ, and Render does not set it either), so building a slot with
 * `new Date(y, m, d, 10, 0)` would produce 10:00 **UTC** -- 3pm in Lahore. Every
 * slot would be five hours wrong, and it would look right on a developer machine
 * set to Pakistan time, which is the worst kind of wrong.
 *
 * So the offset is applied explicitly. Pakistan Standard Time is UTC+5 all year
 * and has observed no DST since 2009, which is what makes a fixed offset exact
 * here rather than an approximation. A clinic in a DST-observing country could
 * not use this approach -- it would need a real IANA zone conversion.
 */

import type { Availability } from "@/lib/types/database";
import { formatTime } from "@/lib/schedule";

/** PKT. Fixed, not looked up: see the timezone note above. */
const CLINIC_UTC_OFFSET_MINUTES = 5 * 60;

const MS_PER_DAY = 86_400_000;

/** How far ahead the calendar runs. Four weeks of the repeating schedule. */
export const BOOKING_HORIZON_DAYS = 28;

/**
 * A member may cancel their own booking until this many hours before the slot.
 * Inside the window it becomes a phone call, so the clinic has a chance to
 * refill the hour rather than losing it silently.
 */
export const CANCELLATION_CUTOFF_HOURS = 24;

export type BookableSlot = {
  /** ISO instant, and the exact value written to `bookings.slot_time`. */
  iso: string;
  /** Clinic-local label, e.g. "10:00 am". */
  label: string;
  /**
   * Overlaps a live (non-cancelled) booking. Not the same as "starts at the
   * same instant" -- see the interval note on BookedSlot.
   */
  taken: boolean;
};

/**
 * A live booking, as `booked_slots()` reports it (migration 0009).
 *
 * The duration matters because it is stored per booking: an appointment made
 * when the psychologist ran 60-minute sessions is still 60 minutes after they
 * switch to 90. Comparing start instants alone would miss the case that
 * motivated 0009 -- bookings at 10:00 and 11:00 made at 60 minutes stop being
 * compatible once the session length is 90, and the 10:00 runs straight through
 * the 11:00 even though the two instants remain distinct.
 */
export type BookedSlot = {
  slotTime: string;
  durationMinutes: number;
};

export type BookableDay = {
  /** Clinic-local date, "YYYY-MM-DD". Stable key for React and for form values. */
  date: string;
  /** e.g. "Monday" */
  dayName: string;
  /** e.g. "6 October" */
  dateLabel: string;
  slots: BookableSlot[];
};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "10:30:00" (or "10:30") -> 630. NaN-safe: returns null on anything else. */
function timeToMinutes(time: string): number | null {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return hours * 60 + minutes;
}

/** 630 -> "10:30", the shape formatTime() expects. */
function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Start times inside one window, in minutes from clinic midnight.
 *
 * A slot is only offered if the whole session fits: a 90-minute session in a
 * 10:00-13:00 window yields 10:00 and 11:30, not 12:30, because 12:30 would run
 * half an hour past the end of the window.
 */
function slotStartsIn(window: Availability, sessionMinutes: number): number[] {
  const start = timeToMinutes(window.start_time);
  const end = timeToMinutes(window.end_time);

  if (start === null || end === null || sessionMinutes <= 0) return [];

  const starts: number[] = [];
  for (let at = start; at + sessionMinutes <= end; at += sessionMinutes) {
    starts.push(at);
  }
  return starts;
}

/**
 * The clinic-local calendar date and weekday of an instant.
 *
 * Shifting by the offset and then reading the **UTC** parts is what makes this
 * independent of the server's own timezone. Reading the local parts would put
 * the container's TZ back in the answer.
 */
function clinicParts(instant: Date) {
  const shifted = new Date(instant.getTime() + CLINIC_UTC_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(),
  };
}

/**
 * The instant at which a clinic wall-clock time occurs on a clinic date.
 *
 * `Date.UTC` normalises out-of-range values, so subtracting the offset can carry
 * back into the previous day without special-casing -- an 02:00 clinic slot is
 * 21:00 UTC the day before, and this produces that.
 */
function clinicInstant(
  year: number,
  month: number,
  day: number,
  minutesFromMidnight: number,
) {
  return new Date(
    Date.UTC(year, month, day, 0, minutesFromMidnight - CLINIC_UTC_OFFSET_MINUTES),
  );
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The bookable calendar for one psychologist.
 *
 * Days with no slots left are dropped entirely rather than rendered empty, so
 * the picker shows only days that can actually be booked. A slot in the past is
 * dropped for the same reason; a slot already booked is kept but marked `taken`,
 * because showing a full day as full is more honest than hiding it and letting
 * someone wonder why Tuesday vanished.
 */
export function buildCalendar(opts: {
  availability: Availability[];
  sessionMinutes: number;
  /** Live bookings, from the booked_slots() function (migration 0009). */
  bookedSlots: BookedSlot[];
  now: Date;
  horizonDays?: number;
}): BookableDay[] {
  const { availability, sessionMinutes, bookedSlots, now } = opts;
  const horizonDays = opts.horizonDays ?? BOOKING_HORIZON_DAYS;

  // Half-open [start, end) intervals in epoch milliseconds. Milliseconds rather
  // than the ISO strings because two strings for the same instant can differ
  // textually ("...Z" vs "+00:00") and Postgres returns the offset form.
  const busy = bookedSlots.map((booking) => {
    const start = new Date(booking.slotTime).getTime();
    return { start, end: start + booking.durationMinutes * 60_000 };
  });

  /**
   * Half-open on both sides, so a session ending exactly when another begins is
   * not a clash -- that is the normal back-to-back case and rejecting it would
   * make every second slot unbookable.
   */
  const overlapsBooking = (start: number) => {
    const end = start + sessionMinutes * 60_000;
    return busy.some((booked) => start < booked.end && end > booked.start);
  };

  const windowsByDay = new Map<number, Availability[]>();
  for (const window of availability) {
    const existing = windowsByDay.get(window.day_of_week);
    if (existing) existing.push(window);
    else windowsByDay.set(window.day_of_week, [window]);
  }

  const today = clinicParts(now);
  // A pure-UTC midnight anchor. Adding whole days to it is exact because UTC has
  // no DST discontinuities -- doing the same arithmetic on a local-time Date
  // would silently gain or lose an hour in a DST-observing zone.
  const anchor = Date.UTC(today.year, today.month, today.day);

  const days: BookableDay[] = [];

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const cursor = new Date(anchor + offset * MS_PER_DAY);
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const day = cursor.getUTCDate();
    const dayOfWeek = cursor.getUTCDay();

    const windows = windowsByDay.get(dayOfWeek);
    if (!windows) continue;

    // Keyed by start minute, not pushed to an array: nothing stops an admin
    // adding 10:00-13:00 and 11:00-14:00 on the same day, and those windows
    // generate 11:00 and 12:00 twice. A duplicate slot would give the picker
    // two React children with the same key and make one of them unselectable.
    // De-duplicating here means the whole calendar is unique by construction.
    const byStart = new Map<number, BookableSlot>();

    for (const window of windows) {
      for (const minutes of slotStartsIn(window, sessionMinutes)) {
        if (byStart.has(minutes)) continue;

        const instant = clinicInstant(year, month, day, minutes);
        if (instant.getTime() <= now.getTime()) continue;

        byStart.set(minutes, {
          iso: instant.toISOString(),
          label: formatTime(minutesToTime(minutes)),
          taken: overlapsBooking(instant.getTime()),
        });
      }
    }

    if (byStart.size === 0) continue;

    // Two sittings on one day (a morning and an evening) arrive as separate
    // rows in whatever order the query returned them.
    const slots = [...byStart.values()].sort((a, b) =>
      a.iso.localeCompare(b.iso),
    );

    days.push({
      date: isoDate(year, month, day),
      dayName: DAY_LABELS[dayOfWeek],
      dateLabel: `${day} ${MONTH_LABELS[month]}`,
      slots,
    });
  }

  return days;
}

/**
 * Whether a slot is still inside the self-service cancellation window.
 *
 * Also false once the slot is in the past -- cancelling an appointment that has
 * already happened is not a cancellation, and the admin marks those completed.
 */
export function canCancel(slotTime: string, now: Date) {
  const cutoff = new Date(slotTime).getTime() - CANCELLATION_CUTOFF_HOURS * 3_600_000;
  return now.getTime() < cutoff;
}

/**
 * Clinic-local rendering of a stored `slot_time`, e.g. "Monday 6 October, 10:00 am".
 *
 * Never `toLocaleString()` without a zone here: on the server that formats in
 * the container's timezone (UTC) and would show a Lahore 10am appointment as 5am.
 */
export function formatSlotTime(slotTime: string) {
  const instant = new Date(slotTime);
  const { year, month, day, dayOfWeek } = clinicParts(instant);

  const shifted = new Date(instant.getTime() + CLINIC_UTC_OFFSET_MINUTES * 60_000);
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();

  return `${DAY_LABELS[dayOfWeek]} ${day} ${MONTH_LABELS[month]} ${year}, ${formatTime(
    minutesToTime(minutes),
  )}`;
}

/**
 * Validates a slot submitted by the client against the psychologist's real
 * schedule.
 *
 * The client posts an instant, and nothing about that instant is trustworthy --
 * the double-booking index stops a collision but would happily accept 3am on a
 * Sunday, because no database constraint ties `bookings.slot_time` back to the
 * `availability` window it came from. This is the check that does.
 */
export function isSlotOffered(
  slotTime: string,
  calendar: BookableDay[],
): boolean {
  const target = new Date(slotTime).getTime();
  if (Number.isNaN(target)) return false;

  return calendar.some((day) =>
    day.slots.some((slot) => !slot.taken && new Date(slot.iso).getTime() === target),
  );
}
