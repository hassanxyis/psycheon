import Link from "next/link";
import {
  ArrowDownRight,
  Leaf,
  MessageCircleHeart,
  Sprout,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GradientBlob } from "./gradient-blob";

const topicFragments = [
  { text: "I have been carrying a lot lately.", className: "left-0 top-10 rotate-[-5deg]" },
  { text: "Feeling lighter after saying it.", className: "right-0 top-28 rotate-[5deg]" },
  { text: "Small steps still count.", className: "bottom-14 left-8 rotate-[3deg]" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_50%_0%,var(--brand-cream-deep),transparent_52%),linear-gradient(135deg,var(--background),var(--secondary)_70%,var(--background))]">
      <GradientBlob
        className="marketing-drift -top-32 left-[3%] w-80 opacity-70 sm:w-112"
        tone="navy"
      />
      <GradientBlob
        className="marketing-drift-slow -right-28 top-16 w-72 opacity-70 sm:w-104"
        tone="gold"
      />

      <div className="relative mx-auto grid min-h-[calc(100svh-4.5rem)] w-full max-w-6xl items-center gap-14 px-4 py-18 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:py-24">
        <div className="relative z-10 max-w-2xl space-y-7 lg:space-y-8">
          <Badge
            variant="secondary"
            className="marketing-rise h-7 gap-2 px-3 text-xs font-semibold tracking-wide"
          >
            <Leaf className="size-3.5" aria-hidden />
            Community · In-clinic care in Pakistan
          </Badge>

          <div className="marketing-rise marketing-rise-delay space-y-5">
            <h1 className="font-heading text-5xl leading-[0.96] tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
              Make room for what is on your mind.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              A gentle space to name what you are feeling, find people who get
              it, and choose real support when you are ready.
            </p>
          </div>

          <div className="marketing-rise marketing-rise-delay-2 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Find your footing <ArrowDownRight className="size-4" aria-hidden />
            </Link>
            <Link href="/feed" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Browse the community
            </Link>
          </div>
          <p className="marketing-rise marketing-rise-delay-2 text-sm text-muted-foreground">
            Free to join · No credit card needed
          </p>
        </div>

        <div className="relative mx-auto hidden h-[33rem] w-full max-w-md lg:block" aria-hidden>
          <div className="absolute inset-14 rounded-[48%_52%_44%_56%/52%_42%_58%_48%] bg-primary/12 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary),transparent_82%)]" />
          <div className="absolute inset-22 rounded-[55%_45%_58%_42%/42%_58%_44%_56%] border border-primary/15 bg-card/55 backdrop-blur-sm" />

          <div className="absolute left-1/2 top-1/2 grid size-42 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[45%_55%_52%_48%/58%_44%_56%_42%] bg-primary text-primary-foreground shadow-2xl shadow-primary/25">
            <MessageCircleHeart className="size-13" strokeWidth={1.25} />
          </div>

          <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/35" />
          <Sprout className="marketing-drift absolute left-[15%] top-[33%] size-9 rotate-[-18deg] text-primary" strokeWidth={1.25} />
          <Leaf className="marketing-drift-slow absolute bottom-[20%] right-[14%] size-10 rotate-[35deg] text-brand-gold" strokeWidth={1.25} />

          {topicFragments.map(({ text, className }) => (
            <div
              key={text}
              className={`absolute rounded-2xl border border-border/80 bg-card/85 px-4 py-3 text-sm font-medium text-foreground shadow-lg shadow-foreground/5 backdrop-blur-md ${className}`}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
