"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { markBookingPaid, setBookingStatus } from "@/app/admin/actions";
import type { AdminActionState } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminBooking } from "@/lib/queries";
import type { BookingStatus } from "@/lib/types/database";

const STATUS_VARIANT: Record<BookingStatus, "default" | "secondary" | "outline"> =
  {
    pending: "secondary",
    paid: "default",
    cancelled: "outline",
    completed: "outline",
  };

export function AdminBookingRow({
  booking,
  slotLabel,
  isPast,
}: {
  booking: AdminBooking;
  /** Pre-formatted on the server so the clinic timezone is applied once. */
  slotLabel: string;
  isPast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  function run(action: () => Promise<AdminActionState>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    });
  }

  const live = booking.status === "pending" || booking.status === "paid";

  return (
    <Card className={booking.status === "cancelled" ? "opacity-70" : undefined}>
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium tabular-nums">{slotLabel}</p>
            <Badge variant={STATUS_VARIANT[booking.status]} className="capitalize">
              {booking.status}
            </Badge>
            {isPast && live && (
              <Badge variant="outline">Needs closing out</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/profile/${booking.memberId}`}
              className="font-medium underline-offset-4 hover:text-primary hover:underline"
            >
              {booking.memberName}
            </Link>
            {` with ${booking.psychologistName}`}
            {booking.sessionMinutes !== null && ` · ${booking.sessionMinutes} min`}
          </p>
          {booking.notes && (
            <p className="text-sm leading-6 text-foreground/75">
              “{booking.notes}”
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {booking.status === "pending" && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => markBookingPaid(booking.id))}
            >
              Mark paid
            </Button>
          )}

          {live && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setBookingStatus(booking.id, "completed"))}
            >
              Completed
            </Button>
          )}

          {live && (
            <Button
              variant={confirmingCancel ? "destructive" : "ghost"}
              size="sm"
              disabled={pending}
              onClick={() => {
                // Members cannot cancel inside the 24h cutoff, so an admin
                // cancellation is usually a phone call being actioned. Arm it
                // anyway -- the member is not watching this screen.
                if (!confirmingCancel) {
                  setConfirmingCancel(true);
                  return;
                }
                setConfirmingCancel(false);
                run(() => setBookingStatus(booking.id, "cancelled"));
              }}
            >
              {confirmingCancel ? "Confirm cancel" : "Cancel"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
