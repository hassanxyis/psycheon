"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthState } from "@/app/(auth)/actions";

const initialState: AuthState = { error: null, message: null };

type Action = (state: AuthState, formData: FormData) => Promise<AuthState>;

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Working…" : children}
    </Button>
  );
}

function Feedback({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {state.message}
      </p>
    );
  }
  return null;
}

export function PasswordForm({
  action,
  submitLabel,
  withDisplayName = false,
  next,
}: {
  action: Action;
  submitLabel: string;
  withDisplayName?: boolean;
  next?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {withDisplayName && (
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" name="displayName" autoComplete="nickname" />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={withDisplayName ? "new-password" : "current-password"}
        />
      </div>
      <Feedback state={state} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

export function MagicLinkForm({
  action,
  next,
}: {
  action: Action;
  next?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <Feedback state={state} />
      <SubmitButton>Send magic link</SubmitButton>
    </form>
  );
}
