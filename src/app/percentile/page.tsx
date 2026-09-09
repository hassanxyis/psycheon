import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, School, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientBlob } from "@/components/marketing/gradient-blob";
import {
  CREDIBILITY,
  CTA_HREF,
  CTA_LABEL,
  EYEBROW,
  INTRO,
  ONET_ATTRIBUTION,
  ONET_LICENCE_URL,
  PERCENTILE_REVIEW_URL,
  PERCENTILE_URL,
  SCOPE_DISCLAIMER,
  STEPS,
  TAGLINE,
  TITLE,
} from "@/lib/percentile";

/**
 * Percentile — Psychéon's assessment product for institutions.
 *
 * Every string on this page comes from `@/lib/percentile`, which carries the
 * rules that govern them (Percentile's R4, R7 and R10). Nothing is written
 * inline here: this page sits one click from a psychologist directory and a
 * clinic booking flow, and R7 forbids copy implying the product screens or
 * assesses mental health. Keeping the words in one reviewable file is the guard,
 * since this project has no test runner.
 *
 * The visual grammar is the site's own — eyebrow, `font-heading` display line,
 * muted body, `GradientBlob` atmosphere — so the product reads as Psychéon's
 * without the page borrowing the clinic's vocabulary.
 */
export const metadata = {
  title: "Percentile · Psychéon",
  description:
    "Career interest and personality assessment for schools and colleges, from Psychéon.",
};

export default function PercentilePage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_18%_0%,var(--brand-cream-deep),transparent_46%),var(--background)]">
        <GradientBlob
          className="marketing-drift -top-28 right-[6%] w-72 opacity-60 sm:w-96"
          tone="gold"
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-2xl space-y-6">
            <Badge
              variant="secondary"
              className="marketing-rise h-7 gap-2 px-3 text-xs font-semibold tracking-wide"
            >
              <School className="size-3.5" aria-hidden />
              {EYEBROW}
            </Badge>

            <div className="marketing-rise marketing-rise-delay space-y-5">
              <h1 className="font-heading text-5xl leading-[0.98] tracking-[-0.04em] sm:text-6xl">
                {TITLE}
              </h1>
              <p className="text-xl leading-8 text-foreground/90">{TAGLINE}</p>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                {INTRO}
              </p>
            </div>

            <div className="marketing-rise marketing-rise-delay-2 flex flex-col gap-3 sm:flex-row">
              <Link href={CTA_HREF} className={buttonVariants({ size: "lg" })}>
                {CTA_LABEL}
              </Link>
              <a
                href={PERCENTILE_URL}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Visit Percentile <ArrowUpRight className="size-4" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="max-w-2xl space-y-4">
          <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
            How a cohort runs
          </p>
          <h2 className="font-heading text-4xl leading-[1.03] tracking-tight sm:text-5xl">
            Four steps, one term.
          </h2>
        </div>

        <ol className="mt-10 grid gap-5 lg:grid-cols-2">
          {STEPS.map((step, index) => (
            <Card key={step.title} className="bg-card/85">
              <CardHeader className="space-y-4">
                <span
                  className="grid size-10 place-items-center rounded-2xl bg-secondary font-heading text-lg text-primary"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <CardTitle className="text-xl leading-tight">
                  {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </ol>
      </section>

      <section className="overflow-hidden bg-secondary/55">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-28">
          <div className="max-w-lg space-y-5">
            <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
              What it rests on
            </p>
            <h2 className="font-heading text-4xl leading-[1.03] tracking-tight sm:text-5xl">
              Checkable claims, not adjectives.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              An institution is buying a document it will hand to families. Every
              claim below is one it can verify before it does.
            </p>
          </div>

          <div className="grid gap-3">
            {CREDIBILITY.map(({ title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-border/70 bg-card/70 p-5 transition-colors hover:bg-card"
              >
                <div className="flex gap-4">
                  <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="size-4" aria-hidden />
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="font-heading text-xl leading-tight">
                      {title}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Deliberately its own band, well away from the clinic's booking CTA:
          Percentile is an assessment for a cohort, not a route into care. */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="rounded-3xl border border-border/70 bg-card/70 px-6 py-10 sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl leading-tight tracking-tight sm:text-4xl">
                Running an assessment this year?
              </h2>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Pilots run at fifteen to twenty-five students so a school can see
                the whole pipeline before committing a year group.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={CTA_HREF} className={buttonVariants({ size: "lg" })}>
                  {CTA_LABEL}
                </Link>
                {/* The two products have separate accounts. Until that is worth
                    solving, a link is the whole of the integration. */}
                <a
                  href={PERCENTILE_REVIEW_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "ghost", size: "lg" })}
                >
                  <ClipboardCheck className="size-4" aria-hidden />
                  Reviewer sign-in
                </a>
              </div>
            </div>

            <p className="text-sm leading-6 text-muted-foreground lg:border-l lg:border-border/70 lg:pl-8">
              {SCOPE_DISCLAIMER}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {ONET_ATTRIBUTION}{" "}
            <a
              href={ONET_LICENCE_URL}
              className="underline underline-offset-2"
              rel="license noreferrer"
              target="_blank"
            >
              CC BY 4.0
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
