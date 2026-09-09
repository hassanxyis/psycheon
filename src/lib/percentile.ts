/**
 * Copy for the Percentile product page.
 *
 * Percentile is Psychéon's assessment product for schools and colleges. It is a
 * separate application with its own repository, database and deployment; this
 * page is the marketing surface for it and the only place the two brands meet
 * in public.
 *
 * **Everything on this page is governed by Percentile's rules, not Psychéon's.**
 * Percentile's `plan.md` §0 lists ten non-negotiable rules, and the two that
 * bind marketing copy are easy to break by writing naturally about a product
 * that sits on a clinic's website:
 *
 * - **R7 — no clinical language.** Percentile measures career interests and
 *   personality. It does not diagnose, screen, or assess mental health, ability
 *   or intelligence, and no copy may imply it does. This clause is unscoped: it
 *   covers marketing aimed at a principal exactly as it covers a student's own
 *   report. The risk here is specific — the rest of this site sells therapy, and
 *   its vocabulary ("support", "wellbeing", "how you are feeling") is precisely
 *   what must not migrate onto this page. The psychologist review step is also
 *   never described as therapy, counselling for distress, or a clinical service.
 * - **R4 — no percentiles until local norms exist.** Until a `norms` row for the
 *   population reaches n >= 300, reports show raw scores and provisional bands.
 *   The product is called Percentile and it cannot currently report one, so no
 *   claim on this page may promise ranking, comparison against other students,
 *   or "where your students stand".
 *
 * Two more constrain what may be named:
 *
 * - **R10** keeps GET2 (entrepreneurial tendency) provisional pending written
 *   permission, and it cannot be administered today. Two modules ship. Do not
 *   write "three modules", "GET2", or "entrepreneurial tendency".
 * - **English-only is deliberate.** Translating a validated instrument changes
 *   its psychometric properties and requires back-translation and a fresh
 *   reliability study. An Urdu edition may be described as in development; it
 *   must never be described as available.
 *
 * The copy lives here as constants rather than inline in the page because
 * Psychéon has no test runner — review of one small file is the whole of the
 * guard. Percentile's own repo has `scripts/check-clinical-language.sh` for the
 * same purpose on its side.
 */

/** Where the product actually lives. Deep links go to routes under this. */
export const PERCENTILE_URL = "https://percentile-lyart.vercel.app";

/**
 * The reviewer sign-in link.
 *
 * The two products have separate Supabase projects and therefore separate
 * accounts; a psychologist who works both signs in twice. Until that is worth
 * solving, a link is the whole of the integration.
 */
export const PERCENTILE_REVIEW_URL = `${PERCENTILE_URL}/review`;

export const EYEBROW = "For schools and colleges";

export const TITLE = "Percentile";

export const TAGLINE =
  "Career interest and personality assessment, built for a whole cohort at once.";

export const INTRO =
  "A counsellor uploads the roster. Students answer on their own phones in about " +
  "twenty-five minutes. A qualified psychologist reads every result before any " +
  "report is released, and the institution gets a cohort report it can act on.";

/**
 * How it works. Written as what happens, in order — no claim about what the
 * result means, which is R3's territory (interpretation is written by a person
 * with psychology training) and not marketing's.
 */
export const STEPS = [
  {
    title: "Upload the roster",
    description:
      "One CSV per cohort. Each student gets their own private link by email — " +
      "there is no account to create and no password for a student to forget.",
  },
  {
    title: "Students answer on their phones",
    description:
      "About twenty-five minutes, and it can be put down and picked up later " +
      "without losing anything. Two instruments: career interests, and personality.",
  },
  {
    title: "A psychologist reviews every result",
    description:
      "No report reaches a student until a qualified psychologist has read the " +
      "output and confirmed the career directions it suggests. This is a checkpoint " +
      "on the assessment, not a consultation.",
  },
  {
    title: "The institution gets the cohort report",
    description:
      "Completion, how students group against the fields they intend to enter, and " +
      "a named list of who to follow up with first.",
  },
] as const;

/**
 * Why it is credible. Each claim here is one an institution can check, which is
 * the point — the alternative is adjectives.
 *
 * The instruments are named because R2 requires they never be invented, and
 * naming them is how a buyer verifies that. The reliability figures are the
 * published ones for the instruments themselves; do not present them as
 * Percentile's own validation, which would be a different and unearned claim.
 */
export const CREDIBILITY = [
  {
    title: "Published instruments, not invented questions",
    description:
      "Interests come from the O*NET Interest Profiler, published by the U.S. " +
      "Department of Labor. Personality items come from the International " +
      "Personality Item Pool. Items are used as published — never paraphrased, " +
      "reordered or improved.",
  },
  {
    title: "A person signs off on every result",
    description:
      "The system cannot release a student's report until a psychologist has " +
      "confirmed it. That rule is enforced in the database, not by policy.",
  },
  {
    title: "Honest about what it does not know yet",
    description:
      "Results are reported as scores and bands, not as rankings against other " +
      "students. Local norms for Pakistani students are still being collected, " +
      "and until they exist the reports say so rather than borrowing American ones.",
  },
  {
    title: "English for now, deliberately",
    description:
      "Translating a validated instrument changes how it behaves and requires a " +
      "fresh reliability study. An Urdu edition is in development and will ship " +
      "when that work is done, not before.",
  },
] as const;

/**
 * What it is not. Stating this plainly is the clearest way to satisfy R7 on a
 * page that sits one click from a psychologist directory and a booking flow —
 * a reader arriving from the clinic side needs the distinction made, not implied.
 */
export const SCOPE_DISCLAIMER =
  "Percentile measures career interests and personality. It does not diagnose, " +
  "screen or assess mental health, ability or intelligence, and the review step " +
  "is not therapy or a clinical consultation.";

/**
 * O*NET credit (Percentile's R6 — a licence term).
 *
 * Carried here even though this page displays no O*NET-derived data, so that the
 * question never has to be re-litigated if it later does. Kept in sync with
 * `web/lib/attribution.ts` in the Percentile repo.
 */
export const ONET_ATTRIBUTION =
  "This page describes a product that includes information from O*NET Resource " +
  "Center by the U.S. Department of Labor, Employment and Training Administration " +
  "(USDOL/ETA). Used under the CC BY 4.0 license. O*NET® is a trademark of " +
  "USDOL/ETA. Percentile has modified all or some of this information. USDOL/ETA " +
  "has not approved, endorsed, or tested these modifications.";

export const ONET_LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";

/** Institutions enquire; there is no self-serve signup for a cohort product. */
export const CTA_LABEL = "Enquire about a pilot";
export const CTA_HREF = "/contact";
