"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { addComment } from "@/app/(community)/actions";

export type CommentView = {
  id: string;
  body: string;
  created_at: string;
  authorName: string;
};

export function CommentSection({
  postId,
  comments,
  canComment,
}: {
  postId: string;
  comments: CommentView[];
  canComment: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Reset in the submit path rather than an effect -- setState inside an effect
  // triggers cascading renders.
  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addComment({ error: null }, formData);

      setError(result.error);
      if (!result.error) formRef.current?.reset();
    });
  }

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">
        {comments.length} {comments.length === 1 ? "comment" : "comments"}
      </h2>

      {canComment ? (
        <form ref={formRef} action={onSubmit} className="space-y-3">
          <input type="hidden" name="postId" value={postId} />
          <Label htmlFor="comment-body" className="sr-only">
            Add a comment
          </Label>
          <Textarea
            id="comment-body"
            name="body"
            required
            rows={3}
            placeholder="Share a supportive thought…"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Posting…" : "Post comment"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to join the discussion.</p>
      )}

      <ul className="space-y-4">
        {comments.map((comment) => (
          <li key={comment.id} className="space-y-1">
            <Separator />
            <p className="pt-3 text-xs text-muted-foreground">
              {comment.authorName} ·{" "}
              {new Date(comment.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
