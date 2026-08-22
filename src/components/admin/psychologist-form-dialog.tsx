"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  createPsychologist,
  emptyAdminState,
  updatePsychologist,
} from "@/app/admin/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Psychologist } from "@/lib/types/database";

export function PsychologistFormDialog({
  psychologist,
}: {
  psychologist?: Psychologist;
}) {
  const editing = Boolean(psychologist);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * The action is called directly instead of through useActionState so the
   * dialog can close on success without driving that from an effect.
   */
  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await updatePsychologist(emptyAdminState, formData)
        : await createPsychologist(emptyAdminState, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      setOpen(false);
      if (result.message) toast.success(result.message);
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
          <Button variant={editing ? "outline" : "default"} size="sm" />
        }
      >
        {editing ? (
          "Edit"
        ) : (
          <>
            <Plus className="size-4" aria-hidden />
            Add psychologist
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${psychologist?.name}` : "Add a psychologist"}
            </DialogTitle>
            <DialogDescription>
              Roster entries are managed by admins. Psychologists are not
              platform accounts.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <input type="hidden" name="id" value={psychologist?.id} />
          )}

          <div className="max-h-[60svh] space-y-4 overflow-y-auto py-4">
            <div className="space-y-2">
              <Label htmlFor="psy-name">Name</Label>
              <Input
                id="psy-name"
                name="name"
                required
                minLength={2}
                defaultValue={psychologist?.name ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="psy-credentials">Credentials</Label>
              <Input
                id="psy-credentials"
                name="credentials"
                required
                defaultValue={psychologist?.credentials ?? ""}
                placeholder="MS Clinical Psychology, PMDC #12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="psy-specialties">Specialties</Label>
              <Input
                id="psy-specialties"
                name="specialties"
                defaultValue={psychologist?.specialties.join(", ") ?? ""}
                placeholder="Anxiety, Trauma, Couples therapy"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Separate each specialty with a comma.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="psy-languages">Languages</Label>
              <Input
                id="psy-languages"
                name="languages"
                defaultValue={psychologist?.languages.join(", ") ?? ""}
                placeholder="Urdu, English, Punjabi"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Separate each language with a comma.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="psy-years">Years of experience</Label>
                <Input
                  id="psy-years"
                  name="yearsExperience"
                  type="number"
                  min={0}
                  max={70}
                  defaultValue={psychologist?.years_experience ?? ""}
                  placeholder="12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="psy-fee">Session fee (PKR)</Label>
                <Input
                  id="psy-fee"
                  name="sessionFee"
                  type="number"
                  min={0}
                  defaultValue={psychologist?.session_fee ?? ""}
                  placeholder="3500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="psy-location">Clinic location</Label>
              <Input
                id="psy-location"
                name="location"
                defaultValue={psychologist?.location ?? ""}
                placeholder="Gulberg III, Lahore"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="psy-photo">Photo URL</Label>
              <Input
                id="psy-photo"
                name="photoUrl"
                type="url"
                defaultValue={psychologist?.photo_url ?? ""}
                placeholder="https://example.com/photo.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="psy-bio">Bio</Label>
              <Textarea
                id="psy-bio"
                name="bio"
                rows={5}
                defaultValue={psychologist?.bio ?? ""}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Add to roster"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
