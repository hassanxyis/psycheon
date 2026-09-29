"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarDays, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addAvailabilitySlot,
  deleteAvailabilitySlot,
} from "@/app/admin/actions";
import { emptyAdminState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Availability } from "@/lib/types/database";
import { DAY_NAMES, formatSlot, groupByDay } from "@/lib/schedule";

export function AvailabilityEditor({
  psychologistId,
  slots,
}: {
  psychologistId: string;
  slots: Availability[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const schedule = groupByDay(slots);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addAvailabilitySlot(emptyAdminState, formData);

      setError(result.error);
      if (result.error) return;

      formRef.current?.reset();
      if (result.message) toast.success(result.message);
    });
  }

  function onDelete(slotId: string) {
    startTransition(async () => {
      const result = await deleteAvailabilitySlot(slotId);
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent>
          <form ref={formRef} action={onSubmit} className="space-y-4">
            <input type="hidden" name="psychologistId" value={psychologistId} />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="slot-day">Day</Label>
                <select
                  id="slot-day"
                  name="dayOfWeek"
                  defaultValue="1"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {DAY_NAMES.map((name, day) => (
                    <option key={name} value={day}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot-start">Start</Label>
                <Input id="slot-start" name="startTime" type="time" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot-end">End</Label>
                <Input id="slot-end" name="endTime" type="time" required />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Add slot"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {schedule.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <CalendarDays className="mx-auto size-5 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">No availability set.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing can be booked until a window exists — the public profile
            asks people to contact the clinic instead.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedule.map((entry) => (
            <Card key={entry.day}>
              <CardContent className="space-y-2.5">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {entry.name}
                </p>
                <ul className="space-y-2">
                  {entry.slots.map((slot) => (
                    <li
                      key={slot.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm tabular-nums">
                        {formatSlot(slot)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${entry.name} ${formatSlot(slot)}`}
                        disabled={pending}
                        onClick={() => onDelete(slot.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
