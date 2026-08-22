"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateUserRole } from "@/app/admin/actions";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Profile } from "@/lib/types/database";

export function UserRoleRow({
  profile,
  isSelf,
}: {
  profile: Profile;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const nextRole = profile.role === "admin" ? "user" : "admin";

  function onChangeRole() {
    startTransition(async () => {
      const result = await updateUserRole(profile.id, nextRole);
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <ProfileAvatar
            name={profile.display_name}
            avatarUrl={profile.avatar_url}
          />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/profile/${profile.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {profile.display_name}
              </Link>
              <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                {profile.role}
              </Badge>
              {isSelf && <Badge variant="outline">You</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Joined{" "}
              {new Date(profile.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Changing your own role is refused server-side too; disabling the
            button here just avoids offering an action that cannot succeed. */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={pending || isSelf}
          onClick={onChangeRole}
        >
          {isSelf
            ? "Cannot change your own role"
            : nextRole === "admin"
              ? "Make admin"
              : "Revoke admin"}
        </Button>
      </CardContent>
    </Card>
  );
}
