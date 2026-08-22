import type { Availability } from "@/lib/types/database";

/** day_of_week is 0=Sunday, matching the check constraint in migration 0001. */
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function dayName(dayOfWeek: number) {
  return DAY_NAMES[dayOfWeek] ?? "Unknown";
}

/**
 * Postgres `time` serialises as "HH:MM:SS"; <input type="time"> wants "HH:MM".
 * Trimming the seconds keeps both the form and the display readable.
 */
export function toTimeInputValue(time: string) {
  return time.slice(0, 5);
}

/** "09:00:00" -> "9:00 am". Rendered on the server, so keep the locale fixed. */
export function formatTime(time: string) {
  const [hours, minutes] = toTimeInputValue(time).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  const suffix = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatSlot(slot: Pick<Availability, "start_time" | "end_time">) {
  return `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`;
}

/** Groups slots by day so a day with two sittings renders as one row. */
export function groupByDay(slots: Availability[]) {
  return DAY_NAMES.map((name, day) => ({
    day,
    name,
    slots: slots.filter((slot) => slot.day_of_week === day),
  })).filter((entry) => entry.slots.length > 0);
}
