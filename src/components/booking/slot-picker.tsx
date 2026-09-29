"use client";

import { useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";

import { createBooking } from "@/app/(booking)/actions";
import { emptyBookingState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BookableDay } from "@/lib/booking";

/**
 * Two-step picker: choose a day, then a time within it. A flat list of every
 * slot across four weeks runs to well over a hundred buttons, which is unusable
 * on a phone -- the clinic's users are overwhelmingly on phones.
 *
 * `createBooking` redirects on success, so there is no success branch here.
 */
export function SlotPicker({
  psychologistId,
  psychologistName,
  sessionMinutes,
  days,
}: {
  psychologistId: string;
  psychologistName: string;
  sessionMinutes: number;
  days: BookableDay[];
}) {
  const [selectedDate, setSelectedDate] = useState(days[0]?.date ?? null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeDay = days.find((day) => day.date === selectedDate) ?? null;

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createBooking(emptyBookingState, formData);
      // Only reached when the action returned instead of redirecting, which
      // means it failed.
      setError(result.error);
    });
  }

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/25 bg-secondary/40 p-6 text-sm leading-6 text-muted-foreground">
        There are no open slots in the next few weeks. Contact the clinic and we
        will find a time for you.
      </div>
    );
  }

  return (
    <Card className="border-border/70 bg-card/85">
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <CalendarClock className="size-4" aria-hidden />
          </span>
          <div className="space-y-0.5">
            <h2 className="font-heading text-xl leading-tight">Book a session</h2>
            <p className="text-sm text-muted-foreground">
              {sessionMinutes} minutes with {psychologistName}, in person at the
              clinic.
            </p>
          </div>
        </div>

        <fieldset className="space-y-2.5">
          <legend className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Pick a day
          </legend>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day) => {
              const active = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setSelectedSlot(null);
                    setError(null);
                  }}
                  className={cn(
                    "shrink-0 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <span className="block text-xs font-medium">{day.dayName}</span>
                  <span className="block text-sm font-semibold tabular-nums">
                    {day.dateLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {activeDay && (
          <fieldset className="space-y-2.5">
            <legend className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Pick a time
            </legend>
            <div className="flex flex-wrap gap-2">
              {activeDay.slots.map((slot) => {
                const active = slot.iso === selectedSlot;
                return (
                  <button
                    key={slot.iso}
                    type="button"
                    disabled={slot.taken}
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedSlot(slot.iso);
                      setError(null);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm tabular-nums transition-colors",
                      slot.taken &&
                        "cursor-not-allowed border-border/50 text-muted-foreground/50 line-through",
                      !slot.taken &&
                        active &&
                        "border-primary bg-primary/10 font-medium",
                      !slot.taken &&
                        !active &&
                        "border-border/70 hover:border-primary/40",
                    )}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Struck-through times are already booked.
            </p>
          </fieldset>
        )}

        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="psychologistId" value={psychologistId} />
          <input type="hidden" name="slotTime" value={selectedSlot ?? ""} />

          <div className="space-y-2">
            <Label htmlFor="booking-notes">
              Anything you want them to know beforehand (optional)
            </Label>
            <Textarea
              id="booking-notes"
              name="notes"
              rows={3}
              placeholder="Only if it helps — you do not have to write anything."
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Button type="submit" disabled={pending || !selectedSlot}>
              {pending ? "Booking…" : "Confirm booking"}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              Payment is taken at the clinic — cash or transfer. Nothing is
              charged online.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
