/**
 * Every export from a "use server" file must be an async function.
 *
 *   node scripts/check-use-server.mjs
 *
 * Next enforces this at module evaluation:
 *
 *   A "use server" file can only export async functions, found object
 *
 * and the consequence is out of proportion to the mistake -- the whole page
 * crashes, including the parts that never touch the offending export. What makes
 * it worth a script is that nothing else catches it: `tsc --noEmit` passes,
 * `eslint` passes, and `next build` passes, because it is a runtime rule about
 * the module graph rather than a type or lint error. It surfaced here only when
 * a human clicked Edit on the admin roster.
 *
 * `export type` and `export interface` are fine -- erased before Next sees them.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) found.push(full);
  }
  return found;
}

/**
 * Exports that are allowed: `export async function`, and any `export type` /
 * `export interface` / `export { ... }` form that carries the `type` keyword.
 * Everything else -- const, let, var, class, a non-async function, a default
 * export, or a bare `export { x }` of a value -- is a violation.
 */
const ALLOWED = /^export\s+(async\s+function|type\b|interface\b)/;
const BARE_EXPORT_BLOCK = /^export\s*\{/;

let violations = 0;
let scanned = 0;

for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");

  // Only the directive at the top of the file makes it a server module. A
  // "use server" inside a function body marks that function alone, which is a
  // different feature and not what this rule is about.
  if (!/^\s*(['"])use server\1/.test(source)) continue;
  scanned += 1;

  const relative = file.replace(SRC, "src/").replace(/\\/g, "/");

  source.split(/\r?\n/).forEach((line, index) => {
    if (!/^export\b/.test(line)) return;
    if (ALLOWED.test(line)) return;

    // `export { type Foo }` and `export type { Foo }` are both erased. A bare
    // `export { something }` of a value is not, but this project uses the
    // explicit `export type { ... }` form, so require the keyword to be present.
    if (BARE_EXPORT_BLOCK.test(line) && /\btype\b/.test(line)) return;

    violations += 1;
    console.log(
      `  FAIL ${relative}:${index + 1}\n         ${line.trim()}`,
    );
  });
}

console.log(
  violations === 0
    ? `\nChecked ${scanned} "use server" file(s). All exports are async functions or types.\n`
    : `\n${violations} non-async export(s) in a "use server" file.\n` +
        `Move plain values to a normal module -- src/lib/action-state.ts is where\n` +
        `this project keeps the action-state constants.\n`,
);

process.exit(violations === 0 ? 0 : 1);
