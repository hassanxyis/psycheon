"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteReportedComment,
  dismissReport,
  resolveReport,
  setPostStatus,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModerationReport } from "@/lib/queries";
import type { AdminActionState } from "@/app/admin/actions";

function excerpt(text: string, max = 260) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export function ReportCard({ report }: { report: ModerationReport }) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function run(action: () => Promise<AdminActionState>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    });
  }

  const targetHref =
    report.targetType === "post" ? `/posts/${report.targetId}` : null;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{report.targetType}</Badge>
          <Badge variant={report.status === "open" ? "destructive" : "outline"}>
            {report.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Reported by{" "}
            <Link
              href={`/profile/${report.reporterId}`}
              className="underline-offset-4 hover:underline"
            >
              {report.reporterName}
            </Link>{" "}
            on{" "}
            {new Date(report.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        <CardTitle className="text-lg leading-snug">
          {report.target ? report.target.title : "Content no longer exists"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Reason given
          </p>
          <p className="text-sm leading-6">{report.reason}</p>
        </div>

        {report.target && (
          <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/40 p-3.5">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Reported content
              {report.target.status && ` · ${report.target.status}`}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {excerpt(report.target.excerpt)}
            </p>
            {targetHref && (
              <Link
                href={targetHref}
                className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open the post →
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          {report.targetType === "post" && report.target && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={pending || report.target.status === "hidden"}
                onClick={() => run(() => setPostStatus(report.targetId, "hidden"))}
              >
                Hide post
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending || report.target.status === "removed"}
                onClick={() => run(() => setPostStatus(report.targetId, "removed"))}
              >
                Remove post
              </Button>
              {report.target.status !== "published" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => setPostStatus(report.targetId, "published"))
                  }
                >
                  Restore post
                </Button>
              )}
            </>
          )}

          {report.targetType === "comment" && report.target && (
            <Button
              variant={confirmingDelete ? "destructive" : "outline"}
              size="sm"
              disabled={pending}
              onClick={() => {
                // Deleting a comment is permanent -- the schema has no status
                // column to soft-hide it, so the first click only arms the button.
                if (!confirmingDelete) {
                  setConfirmingDelete(true);
                  return;
                }
                setConfirmingDelete(false);
                run(() => deleteReportedComment(report.targetId));
              }}
            >
              {confirmingDelete ? "Confirm permanent delete" : "Delete comment"}
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => run(() => resolveReport(report.id))}
          >
            Mark resolved
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => dismissReport(report.id))}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
