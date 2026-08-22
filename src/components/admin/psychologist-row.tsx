"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deletePsychologist,
  togglePsychologistActive,
} from "@/app/admin/actions";
import type { AdminActionState } from "@/app/admin/actions";
import { PsychologistFormDialog } from "@/components/admin/psychologist-form-dialog";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Psychologist } from "@/lib/types/database";

export function PsychologistRow({
  psychologist,
}: {
  psychologist: Psychologist;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function run(action: () => Promise<AdminActionState>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    });
  }

  function onToggle() {
    run(() =>
      togglePsychologistActive(psychologist.id, !psychologist.is_active),
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <ProfileAvatar
            name={psychologist.name}
            avatarUrl={psychologist.photo_url}
          />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{psychologist.name}</p>
              <Badge variant={psychologist.is_active ? "secondary" : "outline"}>
                {psychologist.is_active ? "Listed" : "Hidden"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {psychologist.credentials}
            </p>
            {psychologist.specialties.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {psychologist.specialties.join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {psychologist.is_active && (
            <Link
              href={`/psychologists/${psychologist.id}`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              View
            </Link>
          )}
          <Link
            href={`/admin/psychologists/${psychologist.id}/availability`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Availability
          </Link>
          <PsychologistFormDialog psychologist={psychologist} />
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onToggle}
          >
            {psychologist.is_active ? "Unlist" : "List"}
          </Button>
          <Button
            variant={confirmingDelete ? "destructive" : "ghost"}
            size="sm"
            disabled={pending}
            onClick={() => {
              // Unlisting keeps the record; this destroys it. Arm on the first
              // click so a stray tap cannot wipe a roster entry.
              if (!confirmingDelete) {
                setConfirmingDelete(true);
                return;
              }
              setConfirmingDelete(false);
              run(() => deletePsychologist(psychologist.id));
            }}
          >
            {confirmingDelete ? "Confirm delete" : "Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
