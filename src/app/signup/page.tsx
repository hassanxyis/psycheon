import Link from "next/link";
import { redirect } from "next/navigation";

import { signUp } from "@/app/(auth)/actions";
import { PasswordForm } from "@/components/auth/auth-forms";
import { FocusedPageShell } from "@/components/focused-page-shell";
import { getAuthUser } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/site";

export default async function SignupPage(props: PageProps<"/signup">) {
  const { next } = await props.searchParams;
  const destination = safeRedirectPath(
    typeof next === "string" ? next : undefined,
  );

  if (await getAuthUser()) redirect(destination);

  return (
    <FocusedPageShell
      eyebrow="Make some room"
      title="A softer place can start with one honest sentence."
      description="Create your free account to read, share, and take the next step only when it feels right for you."
      backHref="/"
      backLabel="Back to mindfit"
    >
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h2 className="font-heading text-3xl leading-tight">Create your account</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Join the community at your own pace.
          </p>
        </div>

        <PasswordForm
          action={signUp}
          submitLabel="Create account"
          withDisplayName
          next={destination}
        />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </FocusedPageShell>
  );
}
