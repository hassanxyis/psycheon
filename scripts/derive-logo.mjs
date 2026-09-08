/**
 * Derives the transparent brand assets from `public/logo.jpeg`.
 *
 * The source is a JPEG, so it has no alpha and carries a flat cream backdrop
 * that does not match the site background. Run this once after replacing the
 * source art; the outputs are committed, so the build never depends on sharp.
 *
 *   node scripts/derive-logo.mjs
 *
 * Keying note: alpha is derived from each pixel's *distance* to the cream, not
 * from its luminance. Luminance keying looks reasonable on the navy but reads
 * the gold as half-transparent (a=0.42) and tears its colour to olive, because
 * gold is nearly as bright as the backdrop it sits on.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "public", "logo.jpeg");

/** The backdrop baked into the source JPEG. */
const CREAM = [0xf4, 0xf0, 0xed];

/**
 * Distance at which a pixel counts as fully opaque ink. Measured against the
 * source: solid navy sits ~211 away, solid gold ~99, and JPEG ringing around
 * the glyph edges stays under ~30.
 */
const OPAQUE_AT = 70;

/**
 * Alpha below this is ringing, not ink. Dropping it clears the halo that would
 * otherwise render as a dirty rectangle (23% of the mark's pixels -> 1.7%).
 * Survivors are rescaled so the floor does not eat the genuinely soft edges;
 * the thinnest gold traces stay 3-4px wide.
 */
const NOISE_FLOOR = 0.22;

/**
 * Crop boxes in source pixels, taken from the alpha bounding box each band
 * produces under the keying above -- not from eyeballing the source. Measuring
 * on a coarse stride silently clips: an earlier pass lost 227 fully-opaque
 * pixels off the top of the head that way.
 *
 * The lockup deliberately stops at y951, the last tagline row. The pillar row
 * (RESEARCH/ARTICLES/INSIGHTS/WELLBEING) starts at y1001 and is dropped -- it
 * advertises a content brand rather than a booking clinic.
 */
const BANDS = {
  mark: { left: 407, top: 170, width: 426, height: 621 },
  lockup: { left: 288, top: 170, width: 684, height: 782 },
};

/** Cuts the cream backdrop out of the source and returns an RGBA sharp pipeline. */
async function keyed() {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0, o = 0; i < data.length; i += channels, o += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const distance = Math.max(
      Math.abs(r - CREAM[0]),
      Math.abs(g - CREAM[1]),
      Math.abs(b - CREAM[2]),
    );

    let alpha = Math.min(1, distance / OPAQUE_AT);
    alpha = alpha < NOISE_FLOOR ? 0 : (alpha - NOISE_FLOOR) / (1 - NOISE_FLOOR);

    // Colour is carried through untouched -- unpremultiplying against the cream
    // is what destroys the gold.
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = Math.round(alpha * 255);
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png();
}

async function main() {
  const brandDir = path.join(root, "public", "brand");
  const appDir = path.join(root, "src", "app");
  await mkdir(brandDir, { recursive: true });

  const source = await keyed();
  const band = (name) => source.clone().extract(BANDS[name]);

  const write = async (file, buffer) => {
    await writeFile(file, buffer);
    const { width, height } = await sharp(buffer).metadata();
    console.log(`  ${path.relative(root, file)}  ${width}x${height}`);
  };

  console.log("Deriving brand assets from public/logo.jpeg");

  // Sized to roughly 2x their largest on-screen box rather than shipped at
  // source resolution -- the header mark renders at 36px, and the full-size
  // crop is ~15x the bytes for no visible gain.
  await write(
    path.join(brandDir, "psycheon-mark.png"),
    await band("mark")
      .resize({ height: 160 })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer(),
  );

  await write(
    path.join(brandDir, "psycheon-lockup.png"),
    await band("lockup")
      .resize({ height: 420 })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer(),
  );

  // Favicon: the mark alone, padded so it is not clipped by rounded masks.
  await write(
    path.join(appDir, "icon.png"),
    await band("mark")
      .resize(416, 416, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 48,
        bottom: 48,
        left: 48,
        right: 48,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer(),
  );

  // Apple flattens transparency to black, so this one keeps the cream.
  await write(
    path.join(appDir, "apple-icon.png"),
    await band("mark")
      .resize(148, 148, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 16,
        bottom: 16,
        left: 16,
        right: 16,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .flatten({ background: { r: CREAM[0], g: CREAM[1], b: CREAM[2] } })
      .png()
      .toBuffer(),
  );

  // Static OG card. Generated here rather than through ImageResponse: Satori
  // cannot parse the oklch() design tokens and cannot reuse the next/font
  // Fraunces instance, both of which this sidesteps.
  const lockupForOg = await band("lockup")
    .resize({ height: 470, fit: "inside" })
    .png()
    .toBuffer();

  await write(
    path.join(appDir, "opengraph-image.png"),
    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: CREAM[0], g: CREAM[1], b: CREAM[2], alpha: 1 },
      },
    })
      .composite([{ input: lockupForOg, gravity: "centre" }])
      .png()
      .toBuffer(),
  );
}

await main();
