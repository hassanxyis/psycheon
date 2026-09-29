"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";

import {
  BOOKING_HORIZON_DAYS,
  CANCELLATION_CUTOFF_HOURS,
  buildCalendar,
  canCancel,
  isSlotOffered,
} from "@/lib/booking";
import {
  getAvailabilityForPsychologist,
  getBookedSlots,
  getPsychologistById,
} from "@/lib/queries";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export type BookingActionState = { error: string | null; message: string | null };

export const emptyBookingState: BookingActionState = { error: null, message: null };

/**
 * Identity comes from the verified JWT, never from a form field. RLS enforces
 * the same rule; this exists so a signed-out user gets a login redirect rather
 * than an opaque policy failure.
 */
async function requireUser() {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/bookings");
  return user;
}

/**
 * Books one slot.
 *
 * The submitted instant is re-validated against the psychologist's real
 * schedule before insert. Nothing in the database ties `bookings.slot_time` back
 * to an `availability` window -- the unique index prevents a *collision* but
 * would accept 3am on a Sunday -- so this check is the only thing standing
 * between a crafted POST and an appointment nobody is at the clinic for.
 */
export async function createBooking(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await requireUser();

  const psychologistId = String(formData.get("psychologistId") ?? "");
  const slotTime = String(formData.get("slotTime") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!psychologistId || !slotTime) {
    return { error: "Pick a time before confirming.", message: null };
  }

  // is_active -- an unlisted psychologist is not taking bookings, and this is
  // the same lookup the public profile uses.
  const psychologist = await getPsychologistById(psychologistId);
  if (!psychologist) {
    return { error: "That psychologist is not taking bookings.", message: null };
  }

  const now = new Date();
  const horizonEnd = new Date(
    now.getTime() + (BOOKING_HORIZON_DAYS + 1) * 86_400_000,
  );

  const [availability, bookedSlots] = await Promise.all([
    getAvailabilityForPsychologist(psychologistId),
    getBookedSlots({ psychologistId, from: now, to: horizonEnd }),
  ]);

  const calendar = buildCalendar({
    availability,
    sessionMinutes: psychologist.session_minutes,
    bookedSlots,
    now,
  });

  if (!isSlotOffered(slotTime, calendar)) {
    return {
      error: "That time is no longer available. Please pick another.",
      message: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bookings").insert({
    user_id: user.id,
    psychologist_id: psychologistId,
    slot_time: slotTime,
    notes: notes || null,
  });

  // 23505 is the partial unique index from migration 0007 -- someone else took
  // the slot between the calendar render and this insert. The database is the
  // only place that race can be settled, so a friendly message is the whole fix.
  if (error?.code === "23505") {
    return {
      error: "Someone just took that time. Please pick another.",
      message: null,
    };
  }
  if (error) return { error: error.message, message: null };

  redirect("/bookings?booked=1");
}

/**
 * Member-initiated cancellation.
 *
 * `cancelled` is the one status a member may set -- migration 0003's
 * guard_booking_payment_fields() rejects every other transition from a
 * non-admin, so the database enforces this independently of the check here.
 *
 * The cutoff is this side only: it is clinic policy rather than a data
 * invariant, and an admin must stay able to cancel at any time.
 */
export async function cancelBooking(bookingId: string): Promise<BookingActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  // Read the row first so the cutoff is judged against the stored slot_time
  // rather than anything the client sent. RLS scopes this to the caller's own
  // bookings, so a guessed id returns nothing rather than someone else's row.
  const { data: booking, error: readError } = await supabase
    .from("bookings")
    .select("id, slot_time, status")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) return { error: readError.message, message: null };
  if (!booking) return { error: "Booking not found.", message: null };

  if (booking.status === "cancelled") {
    return { error: "That booking is already cancelled.", message: null };
  }
  if (booking.status === "completed") {
    return { error: "That session has already happened.", message: null };
  }

  if (!canCancel(booking.slot_time, new Date())) {
    return {
      error: `Bookings can only be cancelled online more than ${CANCELLATION_CUTOFF_HOURS} hours ahead. Please call the clinic.`,
      message: null,
    };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("user_id", user.id);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: "Booking cancelled." };
}
