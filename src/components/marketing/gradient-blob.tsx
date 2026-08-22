import { cn } from "@/lib/utils";

/** Decorative atmosphere only — intentionally invisible to assistive tech. */
export function GradientBlob({
  className,
  tone = "sage",
}: {
  className?: string;
  tone?: "sage" | "terracotta" | "cream";
}) {
  const tones = {
    sage: "bg-brand-sage/35",
    terracotta: "bg-brand-terracotta/25",
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
