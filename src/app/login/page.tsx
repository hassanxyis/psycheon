import Link from "next/link";
import { redirect } from "next/navigation";

import { sendMagicLink, signIn, signInWithGoogle } from "@/app/(auth)/actions";
import { MagicLinkForm, PasswordForm } from "@/components/auth/auth-forms";
import { FocusedPageShell } from "@/components/focused-page-shell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getAuthUser } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/site";

export default async function LoginPage(props: PageProps<"/login">) {
  const { error, next } = await props.searchParams;

  // Guards send people here as /login?next=/posts/new -- keep that destination
  // so signing in returns them to what they clicked, not the feed.
  const destination = safeRedirectPath(
    typeof next === "string" ? next : undefined,
  );

  if (await getAuthUser()) redirect(destination);

  return (
    <FocusedPageShell
      eyebrow="Welcome back"
      title="Pick up the conversation when you are ready."
      description="Your thoughts, your pace. Sign in to return to your community and the support that is waiting for you."
      backHref="/"
      backLabel="Back to mindfit"
    >
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h2 className="font-heading text-3xl leading-tight">Sign in</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Use your password, a magic link, or Google.
          </p>
        </div>

        {typeof error === "string" && error.length > 0 && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <PasswordForm action={signIn} submitLabel="Sign in" next={destination} />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs font-medium text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <MagicLinkForm action={sendMagicLink} next={destination} />

        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={destination} />
          <Button type="submit" variant="outline" className="w-full">
            Continue with Google
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </FocusedPageShell>
  );
}
