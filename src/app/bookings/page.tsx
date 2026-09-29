import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { BookingRow } from "@/components/booking/booking-row";
import { buttonVariants } from "@/components/ui/button";
import {
  CANCELLATION_CUTOFF_HOURS,
  canCancel,
  formatSlotTime,
} from "@/lib/booking";
import { getBookingsForUser } from "@/lib/queries";
import { getAuthUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Your bookings · Psychéon",
};

export default async function BookingsPage(props: PageProps<"/bookings">) {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/bookings");

  const { booked } = await props.searchParams;
  const bookings = await getBookingsForUser(user.id);

  const now = new Date();
  // Split on the slot time, not on status: a cancelled future booking belongs
  // with the history, and a pending booking whose slot has passed is no longer
  // something the member can act on.
  const upcoming = bookings.filter(
    (booking) =>
      new Date(booking.slotTime).getTime() > now.getTime() &&
      booking.status !== "cancelled",
  );
  const past = bookings
    .filter((booking) => !upcoming.includes(booking))
    .reverse();

  return (
    <main className="min-h-[calc(100svh-4.5rem)] bg-[radial-gradient(circle_at_92%_0%,var(--brand-cream-deep),transparent_34%),var(--background)]">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12 sm:px-6 sm:py-16">
        <header className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-primary uppercase">
            <CalendarCheck className="size-4" aria-hidden />
            Your bookings
          </p>
          <h1 className="font-heading text-4xl leading-[1.03] tracking-tight sm:text-5xl">
            What you have coming up.
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Sessions are in person at the clinic, and payment is taken there —
            cash or transfer. You can cancel online up to{" "}
            {CANCELLATION_CUTOFF_HOURS} hours before a session.
          </p>
        </header>

        {booked && (
          <div
            role="status"
            className="rounded-2xl border border-primary/25 bg-primary/5 p-5 text-sm leading-6"
          >
            <p className="font-medium">Your session is booked.</p>
            <p className="text-muted-foreground">
              The clinic will see it straight away. Bring payment with you, or
              call if anything changes.
            </p>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-primary/25 bg-secondary/45 p-10 text-center sm:p-14">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-card text-primary shadow-sm">
              <CalendarCheck className="size-5" aria-hidden />
            </span>
            <h2 className="mt-5 font-heading text-2xl">Nothing booked yet.</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Have a look at who is at the clinic and pick a time that suits you.
            </p>
            <Link
              href="/psychologists"
              className={buttonVariants({ size: "sm", className: "mt-6" })}
            >
              Meet the psychologists
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Upcoming
                </h2>
                {upcoming.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    slotLabel={formatSlotTime(booking.slotTime)}
                    cancellable={canCancel(booking.slotTime, now)}
                  />
                ))}
              </section>
            )}

            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Earlier
                </h2>
                {past.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    slotLabel={formatSlotTime(booking.slotTime)}
                    cancellable={false}
                  />
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
