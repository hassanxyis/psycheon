"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPost, type ActionState } from "@/app/(community)/actions";
import { POST_TAGS } from "@/lib/tags";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Publishing…" : "Publish post"}
    </Button>
  );
}

export function NewPostForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createPost, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required minLength={3} maxLength={200} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Your post</Label>
        <Textarea id="body" name="body" required rows={10} />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Tags</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {POST_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="tags"
                value={tag}
                className="size-4 rounded border-input"
              />
              {tag}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
