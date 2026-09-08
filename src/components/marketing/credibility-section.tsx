import { LockKeyhole, Sparkles, Stethoscope } from "lucide-react";

const commitments = [
  {
    icon: Stethoscope,
    title: "Care with real clinical grounding",
    description:
      "When you are ready for a consultation, the next conversation happens with qualified professionals at our clinic.",
  },
  {
    icon: LockKeyhole,
    title: "Space to be human, not perform",
    description:
      "We make room for honest questions and thoughtful boundaries — in the community and at the clinic.",
  },
  {
    icon: Sparkles,
    title: "No pressure to do it perfectly",
    description:
      "Read, write, ask, pause. You decide what a useful next step looks like.",
  },
];

export function CredibilitySection() {
  return (
    <section className="overflow-hidden bg-secondary/55">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-28">
        <div className="max-w-lg space-y-5">
          <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
            Care, without the coldness
          </p>
          <h2 className="font-heading text-4xl leading-[1.03] tracking-tight sm:text-5xl">
            Support can be serious without feeling severe.
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Psychéon brings the warmth of a good conversation closer to the
            reassurance of professional, in-person care.
          </p>
        </div>

        <div className="grid gap-3">
          {commitments.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group rounded-2xl border border-border/70 bg-card/70 p-5 transition-colors hover:bg-card"
            >
              <div className="flex gap-4">
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="space-y-1.5">
                  <h3 className="font-heading text-xl leading-tight">{title}</h3>
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
  );
}
