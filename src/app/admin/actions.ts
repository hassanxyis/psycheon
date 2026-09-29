"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingStatus,
  PostStatus,
  ReportStatus,
  UserRole,
} from "@/lib/types/database";

export type AdminActionState = { error: string | null; message: string | null };

export const emptyAdminState: AdminActionState = { error: null, message: null };

/**
 * Every action re-runs requireAdmin() rather than trusting that the caller
 * arrived from an admin page -- Server Actions are addressable endpoints, so
 * the layout guard does not protect them. RLS enforces the same rule again.
 */

function parseSpecialties(raw: string) {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function optionalUrl(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return undefined;
  return value;
}

/**
 * Optional whole number. Returns null when blank and `undefined` to signal
 * invalid, matching optionalUrl -- callers distinguish the two before saving.
 */
function optionalInt(raw: string, max: number) {
  const value = raw.trim();
  if (!value) return null;
  if (!/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);
  return parsed > max ? undefined : parsed;
}

function optionalText(raw: string) {
  const value = raw.trim();
  return value || null;
}

type PsychologistFields = {
  name: string;
  credentials: string;
  specialties: string[];
  bio: string | null;
  photo_url: string | null;
  years_experience: number | null;
  languages: string[];
  session_fee: number | null;
  location: string | null;
  session_minutes: number;
};

/**
 * Shared parse + validation for the create and update forms, which take the
 * same fields. Returns an error message instead of throwing so the caller can
 * hand it straight back to the dialog.
 */
function readPsychologistForm(
  formData: FormData,
): { error: string } | { fields: PsychologistFields } {
  const name = String(formData.get("name") ?? "").trim();
  const credentials = String(formData.get("credentials") ?? "").trim();
  const photoUrl = optionalUrl(String(formData.get("photoUrl") ?? ""));
  const yearsExperience = optionalInt(
    String(formData.get("yearsExperience") ?? ""),
    70,
  );
  const sessionFee = optionalInt(String(formData.get("sessionFee") ?? ""), 10_000_000);
  // Not optional: session_minutes is `not null default 60` because it is what
  // slices availability into slots. Blank falls back to the column default
  // rather than erroring -- the field is new and the form may be resubmitted
  // from a cached page that does not have it.
  const sessionMinutesRaw = String(formData.get("sessionMinutes") ?? "").trim();
  const sessionMinutes = sessionMinutesRaw
    ? optionalInt(sessionMinutesRaw, 240)
    : 60;

  if (name.length < 2) return { error: "Name is required." };
  if (!credentials) return { error: "Credentials are required." };
  if (photoUrl === undefined) {
    return { error: "Photo URL must start with http:// or https://." };
  }
  if (yearsExperience === undefined) {
    return { error: "Years of experience must be a whole number up to 70." };
  }
  if (sessionFee === undefined) {
    return { error: "Session fee must be a whole number of rupees." };
  }
  // The check constraint in 0007 is `between 15 and 240`, so catch the low end
  // here too rather than letting it surface as a constraint violation.
  if (sessionMinutes === undefined || sessionMinutes === null || sessionMinutes < 15) {
    return { error: "Session length must be between 15 and 240 minutes." };
  }

  return {
    fields: {
      name,
      credentials,
      specialties: parseSpecialties(String(formData.get("specialties") ?? "")),
      bio: optionalText(String(formData.get("bio") ?? "")),
      photo_url: photoUrl,
      years_experience: yearsExperience,
      // Same comma-separated shape as specialties.
      languages: parseSpecialties(String(formData.get("languages") ?? "")),
      session_fee: sessionFee,
      location: optionalText(String(formData.get("location") ?? "")),
      session_minutes: sessionMinutes,
    },
  };
}

async function setReportStatus(
  reportId: string,
  status: ReportStatus,
): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", reportId);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: `Report ${status}.` };
}

export async function resolveReport(reportId: string) {
  return setReportStatus(reportId, "resolved");
}

export async function dismissReport(reportId: string) {
  return setReportStatus(reportId, "dismissed");
}

/**
 * Post moderation is soft: posts.status moves to hidden/removed and RLS stops
 * serving them to anyone but the author and admins. Nothing is destroyed, so a
 * mistaken action is reversible from this same screen.
 */
export async function setPostStatus(
  postId: string,
  status: PostStatus,
): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("posts")
    .update({ status })
    .eq("id", postId);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: `Post ${status}.` };
}

/**
 * Permanent deletion, for spam that should not linger even as a hidden row.
 * Prefer setPostStatus for anything judgement-based -- that is reversible and
 * this is not. Comments and likes cascade away with the post.
 */
export async function deletePost(postId: string): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: "Post deleted permanently." };
}

/**
 * Comments have no status column in the schema, so moderating one is a hard
 * delete via the "admins delete any comment" policy. This is irreversible --
 * the UI asks for confirmation before calling it.
 */
export async function deleteReportedComment(
  commentId: string,
): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("comments").delete().eq("id", commentId);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: "Comment deleted." };
}

export async function createPsychologist(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const parsed = readPsychologistForm(formData);
  if ("error" in parsed) return { error: parsed.error, message: null };

  const supabase = await createClient();
  const { error } = await supabase.from("psychologists").insert(parsed.fields);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: `${parsed.fields.name} added to the roster.` };
}

export async function updatePsychologist(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing psychologist.", message: null };

  const parsed = readPsychologistForm(formData);
  if ("error" in parsed) return { error: parsed.error, message: null };

  const supabase = await createClient();
  const { error } = await supabase
    .from("psychologists")
    .update({ ...parsed.fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: `${parsed.fields.name} updated.` };
}

/**
 * Hard delete. bookings.psychologist_id is `on delete restrict`, so a
 * psychologist with booking history cannot be removed -- unlisting is the right
 * move there, and 23503 is Postgres telling us exactly that.
 */
export async function deletePsychologist(
  id: string,
): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("psychologists").delete().eq("id", id);

  if (error?.code === "23503") {
    return {
      error:
        "This psychologist has bookings, so the record cannot be deleted. Unlist them instead.",
      message: null,
    };
  }
  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: "Psychologist deleted." };
}

export async function togglePsychologistActive(
  id: string,
  isActive: boolean,
): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("psychologists")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message, message: null };

  refresh();
  return {
    error: null,
    message: isActive ? "Now listed publicly." : "Hidden from the public directory.",
  };
}

/**
 * Weekly availability slots. The database enforces day_of_week 0-6 and
 * start_time < end_time (availability_time_order in migration 0001); these
 * checks exist to return a readable message instead of a constraint violation.
 */
export async function addAvailabilitySlot(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const psychologistId = String(formData.get("psychologistId") ?? "");
  const dayRaw = String(formData.get("dayOfWeek") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  if (!psychologistId) return { error: "Missing psychologist.", message: null };

  const dayOfWeek = /^\d+$/.test(dayRaw) ? Number(dayRaw) : NaN;
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { error: "Pick a day of the week.", message: null };
  }
  if (!startTime || !endTime) {
    return { error: "Both a start and end time are required.", message: null };
  }
  // <input type="time"> gives "HH:MM", which compares correctly as a string
  // because both values are zero-padded and same-length.
  if (startTime >= endTime) {
    return { error: "The start time must be before the end time.", message: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("availability").insert({
    psychologist_id: psychologistId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  });

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: "Slot added." };
}

export async function deleteAvailabilitySlot(
  slotId: string,
): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("availability").delete().eq("id", slotId);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: "Slot removed." };
}

/**
 * Marks a booking paid under the manual-payment flow -- cash or transfer at the
 * clinic, confirmed by hand. `payment_provider` stays null precisely because
 * there was no provider; a Safepay/PayFast integration later fills it in
 * without a migration.
 *
 * guard_booking_payment_fields() (migration 0003) rejects writes to paid_at
 * from anyone who is not an admin, so this is enforced twice.
 */
export async function markBookingPaid(
  bookingId: string,
): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: "Marked paid." };
}

/**
 * Any other status move: confirming a session happened, or cancelling on a
 * member's behalf when they phone in past the self-service cutoff.
 *
 * `paid_at` is deliberately left alone. Clearing it on a cancellation would
 * destroy the record that money was taken, which is the one fact a refund
 * conversation depends on -- the status says the session will not happen, and
 * paid_at still says it was paid for.
 */
export async function setBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<AdminActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: `Booking ${status}.` };
}

/**
 * Role changes require the "admins update any profile" policy from migration
 * 0004. Self-demotion is refused here so an admin cannot lock themselves --
 * and potentially the whole project -- out of the admin area by accident.
 */
export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { error: "You cannot change your own role.", message: null };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: `Role set to ${role}.` };
}
