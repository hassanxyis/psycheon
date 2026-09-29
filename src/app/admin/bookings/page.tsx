import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import { AdminBookingRow } from "@/components/admin/booking-row";
import { Badge } from "@/components/ui/badge";
import { formatSlotTime } from "@/lib/booking";
import { getBookingsForAdmin } from "@/lib/queries";
import type { BookingStatus } from "@/lib/types/database";

const STATUSES = ["pending", "paid", "completed", "cancelled"] as const;

function isBookingStatus(value: string): value is BookingStatus {
  return (STATUSES as readonly string[]).includes(value);
}

export default async function AdminBookingsPage(
  props: PageProps<"/admin/bookings">,
) {
  // searchParams is a Promise in Next.js 16.
  const { status } = await props.searchParams;

  const activeStatus =
    typeof status === "string" && isBookingStatus(status) ? status : undefined;

  const bookings = await getBookingsForAdmin({ status: activeStatus });

  const now = new Date();
  // Same navigation-as-filter pattern as /admin/posts: shareable URL, working
  // back button.
  const filterHref = (next?: BookingStatus) =>
    next ? `/admin/bookings?status=${next}` : "/admin/bookings";

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Bookings</h2>
        <p className="text-sm text-muted-foreground">
          Soonest first. Payment is taken at the clinic — mark a booking paid
          once you have the money in hand.
        </p>
      </div>

      <nav
        aria-label="Filter by status"
        className="flex flex-wrap gap-2 border-y border-border/65 py-4"
      >
        <Link
          href={filterHref()}
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Badge
            variant={activeStatus ? "outline" : "default"}
            className="h-7 px-3 text-sm"
          >
            All
          </Badge>
        </Link>
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={filterHref(value)}
            className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Badge
              variant={activeStatus === value ? "default" : "outline"}
              className="h-7 px-3 text-sm capitalize"
            >
              {value}
            </Badge>
          </Link>
        ))}
      </nav>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <CalendarCheck
            className="mx-auto size-5 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-3 text-sm font-medium">
            {activeStatus ? "Nothing matches this filter." : "No bookings yet."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeStatus
              ? "Try a different status."
              : "Bookings will appear here as members make them."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <AdminBookingRow
              key={booking.id}
              booking={booking}
              slotLabel={formatSlotTime(booking.slotTime)}
              isPast={new Date(booking.slotTime).getTime() < now.getTime()}
            />
          ))}
        </div>
      )}
    </section>
  );
}
