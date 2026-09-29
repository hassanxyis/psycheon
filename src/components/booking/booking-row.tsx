"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import { cancelBooking } from "@/app/(booking)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MemberBooking } from "@/lib/queries";
import type { BookingStatus } from "@/lib/types/database";

/**
 * `pending` reads as "pending payment" to the clinic but as limbo to a member
 * who has in fact successfully booked -- so it is labelled by what the member
 * needs to do, not by the enum value.
 */
const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pay at the clinic",
  paid: "Paid",
  cancelled: "Cancelled",
  completed: "Completed",
};

const STATUS_VARIANT: Record<BookingStatus, "default" | "secondary" | "outline"> =
  {
    pending: "secondary",
    paid: "default",
    cancelled: "outline",
    completed: "outline",
  };

export function BookingRow({
  booking,
  slotLabel,
  cancellable,
}: {
  booking: MemberBooking;
  /** Pre-formatted on the server so the clinic timezone is applied once. */
  slotLabel: string;
  cancellable: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const spent = booking.status === "cancelled" || booking.status === "completed";

  function onCancel() {
    // Arm on the first click: cancelling is not reversible from this screen, and
    // re-booking depends on the slot still being free.
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);

    startTransition(async () => {
      const result = await cancelBooking(booking.id);
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    });
  }

  return (
    <Card className={spent ? "opacity-70" : undefined}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium tabular-nums">{slotLabel}</p>
            <Badge variant={STATUS_VARIANT[booking.status]}>
              {STATUS_LABEL[booking.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {/* An unlisted psychologist has no public page, so linking would
                404. The appointment is still real -- show the name plainly. */}
            {booking.psychologistListed ? (
              <Link
                href={`/psychologists/${booking.psychologistId}`}
                className="font-medium underline-offset-4 hover:text-primary hover:underline"
              >
                {booking.psychologistName}
              </Link>
            ) : (
              <span className="font-medium">{booking.psychologistName}</span>
            )}
            {booking.psychologistCredentials &&
              ` · ${booking.psychologistCredentials}`}
            {booking.sessionMinutes !== null && ` · ${booking.sessionMinutes} min`}
          </p>
          {booking.location && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden />
              {booking.location}
            </p>
          )}
          {booking.notes && (
            <p className="text-sm leading-6 text-foreground/75">
              “{booking.notes}”
            </p>
          )}
        </div>

        {cancellable && (
          <Button
            variant={confirming ? "destructive" : "outline"}
            size="sm"
            className="shrink-0"
            disabled={pending}
            onClick={onCancel}
          >
            {confirming ? "Confirm cancel" : "Cancel"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
