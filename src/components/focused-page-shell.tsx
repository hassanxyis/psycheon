import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Sprout } from "lucide-react";

import { Logo } from "@/components/logo";
import { GradientBlob } from "@/components/marketing/gradient-blob";

export function FocusedPageShell({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <main className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden bg-[radial-gradient(circle_at_15%_0%,var(--brand-cream-deep),transparent_34%),linear-gradient(145deg,var(--background),var(--secondary)_75%,var(--background))] px-4 py-12 sm:px-6 sm:py-16">
      <GradientBlob
        className="marketing-drift -left-32 top-16 w-72 opacity-60 sm:w-96"
        tone="navy"
      />
      <GradientBlob
        className="marketing-drift-slow -right-32 bottom-0 w-72 opacity-50 sm:w-96"
        tone="gold"
      />

      <div className="relative mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:gap-16">
        <section className="max-w-md space-y-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {backLabel}
          </Link>

          <div className="space-y-4">
            <Logo variant="lockup" alt="Psychéon" className="h-32 w-auto" />
            <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
              {eyebrow}
            </p>
            <h1 className="font-heading text-4xl leading-[1.02] tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-sm text-base leading-7 text-muted-foreground">
              {description}
            </p>
          </div>

          <p className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            <Sprout className="size-4 text-primary" aria-hidden />
            Small steps still count.
          </p>
        </section>

        <div className="rounded-[2rem] border border-border/75 bg-card/85 p-2 shadow-2xl shadow-primary/8 backdrop-blur-md sm:p-3">
          <div className="rounded-[1.55rem] border border-border/55 bg-card p-5 sm:p-7">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
