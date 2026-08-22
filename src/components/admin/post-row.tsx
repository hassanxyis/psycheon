"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { deletePost, setPostStatus } from "@/app/admin/actions";
import type { AdminActionState } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminPost } from "@/lib/queries";

function excerpt(text: string, max = 200) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

const statusVariant = {
  published: "secondary",
  hidden: "outline",
  removed: "destructive",
} as const;

export function PostRow({ post }: { post: AdminPost }) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function run(action: () => Promise<AdminActionState>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant[post.status]}>{post.status}</Badge>
          <span className="text-xs text-muted-foreground">
            by{" "}
            <Link
              href={`/profile/${post.authorId}`}
              className="underline-offset-4 hover:underline"
            >
              {post.authorName}
            </Link>{" "}
            ·{" "}
            {new Date(post.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5" aria-hidden />
            {post.commentCount}
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="leading-snug font-medium">
            <Link
              href={`/posts/${post.id}`}
              className="underline-offset-4 hover:text-primary hover:underline"
            >
              {post.title}
            </Link>
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {excerpt(post.body)}
          </p>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="capitalize">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          {post.status !== "hidden" && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setPostStatus(post.id, "hidden"))}
            >
              Hide
            </Button>
          )}
          {post.status !== "removed" && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setPostStatus(post.id, "removed"))}
            >
              Remove
            </Button>
          )}
          {post.status !== "published" && (
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setPostStatus(post.id, "published"))}
            >
              Restore
            </Button>
          )}

          <Button
            variant={confirmingDelete ? "destructive" : "ghost"}
            size="sm"
            className="ml-auto"
            disabled={pending}
            onClick={() => {
              // Hiding is reversible; this is not. First click only arms the
              // button, matching how reported comments are deleted.
              if (!confirmingDelete) {
                setConfirmingDelete(true);
                return;
              }
              setConfirmingDelete(false);
              run(() => deletePost(post.id));
            }}
          >
            {confirmingDelete ? "Confirm permanent delete" : "Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
