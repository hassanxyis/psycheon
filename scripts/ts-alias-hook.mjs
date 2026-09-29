/**
 * Node module-resolution hook that understands two things Node does not:
 *
 * 1. the `@/*` -> `src/*` path alias from tsconfig.json, and
 * 2. extensionless imports, which TypeScript allows and Node requires a `.ts`
 *    suffix for.
 *
 * Used only by scripts/check-booking-slots.mjs, so pure library code can be
 * exercised under bare Node without bending its imports around its test.
 */

/**
 * Already a file: URL with a trailing slash, so `new URL(rest, SRC)` resolves
 * against it directly. Do not route this through pathToFileURL -- on Windows a
 * URL pathname is "/D:/..." and pathToFileURL would read the leading slash as a
 * relative segment, yielding "D:/D:/...".
 */
const SRC = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, next) {
  let target = specifier;

  if (target.startsWith("@/")) {
    target = new URL(target.slice(2), SRC).href;
  }

  try {
    return await next(target, context);
  } catch (error) {
    if (
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      !/\.[cm]?[jt]s$/.test(target)
    ) {
      return next(`${target}.ts`, context);
    }
    throw error;
  }
}
