import { cn } from "@/lib/utils";

/**
 * Brand assets are derived from `public/logo.jpeg` by `scripts/derive-logo.mjs`
 * and committed. Plain `<img>` rather than `next/image`: these are fixed-size
 * static PNGs, and the project has no other `next/image` usage or `images`
 * config to inherit.
 */
/** Dimensions must match what `scripts/derive-logo.mjs` prints, or the reserved
 *  space is wrong and the page shifts as the PNG loads. */
const VARIANTS = {
  mark: { src: "/brand/psycheon-mark.png", width: 110, height: 160 },
  lockup: { src: "/brand/psycheon-lockup.png", width: 367, height: 420 },
} as const;

export function Logo({
  variant = "mark",
  className,
  alt,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
  /**
   * Omit where the logo sits beside the visible brand name -- announcing it
   * twice is noise. Passing a string opts back into an accessible name.
   */
  alt?: string;
}) {
  const { src, width, height } = VARIANTS[variant];

  return (
    /* Small fixed-size PNGs (mark ~8KB, lockup ~25KB), already emitted at ~2x
       their render box, so next/image has nothing left to optimise here. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={width}
      height={height}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      decoding="async"
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
