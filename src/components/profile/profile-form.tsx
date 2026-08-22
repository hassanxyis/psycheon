"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateProfile, type ProfileActionState } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/types/database";

const initialState: ProfileActionState = { error: null, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save profile"}
    </Button>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          minLength={2}
          maxLength={80}
          defaultValue={profile.display_name}
          autoComplete="nickname"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatarUrl">Avatar URL</Label>
        <Input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          defaultValue={profile.avatar_url ?? ""}
          placeholder="https://example.com/photo.jpg"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Paste a public image URL. Uploading photos will be added later.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={5}
          maxLength={500}
          defaultValue={profile.bio ?? ""}
          placeholder="A few words about what brings you here…"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-xl bg-primary/10 px-3 py-2.5 text-sm text-primary">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
