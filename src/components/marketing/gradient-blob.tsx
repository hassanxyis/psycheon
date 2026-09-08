import { cn } from "@/lib/utils";

/** Decorative atmosphere only — intentionally invisible to assistive tech. */
export function GradientBlob({
  className,
  tone = "navy",
}: {
  className?: string;
  tone?: "navy" | "gold" | "cream";
}) {
  const tones = {
    // Navy is far darker than the sage it replaced, so it blurs in much
    // heavier at the same opacity -- hence the lower alpha.
    navy: "bg-brand-navy/18",
    gold: "bg-brand-gold/28",
    cream: "bg-brand-cream-deep/65",
  };

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute block aspect-square rounded-[45%_55%_55%_45%/55%_45%_55%_45%] blur-3xl",
        tones[tone],
        className,
      )}
    />
  );
}
