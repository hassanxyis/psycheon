"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportContent } from "@/app/(community)/actions";

export function ReportDialog({
  targetType,
  targetId,
}: {
  targetType: "post" | "comment";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * Calling the action here rather than via useActionState: the dialog needs to
   * close on success, and driving that from an effect causes cascading renders.
   */
  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await reportContent({ error: null }, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      setOpen(false);
      toast.success("Report submitted. Our moderators will review it.");
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground" />
        }
      >
        <Flag className="size-4" aria-hidden />
        Report
      </DialogTrigger>
      <DialogContent>
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>Report this {targetType}</DialogTitle>
            <DialogDescription>
              Tell us what is wrong. Reports are visible only to moderators.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />

          <div className="space-y-2 py-4">
            <Label htmlFor="report-reason">Reason</Label>
            <Textarea id="report-reason" name="reason" required rows={4} />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Sending…" : "Submit report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
