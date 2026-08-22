import Link from "next/link";
import { ArrowUpRight, GraduationCap, Stethoscope } from "lucide-react";

import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getPsychologists } from "@/lib/queries";

export const metadata = {
  title: "Psychologists · mindfit",
  description:
    "Meet the qualified psychologists at the mindfit clinic and find support that fits what you are navigating.",
};

function excerpt(text: string, max = 180) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export default async function PsychologistsPage() {
  const psychologists = await getPsychologists();

  return (
    <main className="min-h-[calc(100svh-4.5rem)] bg-[radial-gradient(circle_at_92%_0%,var(--brand-cream-deep),transparent_34%),var(--background)]">
      <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-12 sm:px-6 sm:py-16">
        <header className="max-w-2xl space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-primary uppercase">
            <Stethoscope className="size-4" aria-hidden />
            Our clinic
          </p>
          <h1 className="font-heading text-5xl leading-[0.98] tracking-tight">
            People with the right training, ready when you are.
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Every psychologist here practises at the mindfit clinic. Read what
            they work with, then choose the person who fits what you are
            carrying.
          </p>
        </header>

        {psychologists.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-primary/25 bg-secondary/40 p-10 text-center sm:p-14">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-card text-primary shadow-sm">
              <GraduationCap className="size-5" aria-hidden />
            </span>
            <h2 className="mt-5 font-heading text-3xl">
              The roster is being prepared.
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              We are finalising profiles for our psychologists. In the meantime,
              the community is open to everyone.
            </p>
            <Link
              href="/feed"
              className={buttonVariants({ size: "sm", className: "mt-6" })}
            >
              Visit the community
            </Link>
          </section>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {psychologists.map((psychologist) => (
              <Card
                key={psychologist.id}
                className="justify-between border-border/70 bg-card/85 shadow-sm shadow-foreground/[0.02] transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <ProfileAvatar
                        name={psychologist.name}
                        avatarUrl={psychologist.photo_url}
                        size="lg"
                      />
                      <div className="space-y-1">
                        <CardTitle className="text-2xl leading-snug">
                          <Link
                            href={`/psychologists/${psychologist.id}`}
                            className="outline-none transition-colors hover:text-primary focus-visible:rounded focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            {psychologist.name}
                          </Link>
                        </CardTitle>
                        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                          {psychologist.credentials}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/psychologists/${psychologist.id}`}
                      aria-label={`View ${psychologist.name}'s profile`}
                      className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      <ArrowUpRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(psychologist.years_experience !== null ||
                    psychologist.location) && (
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {psychologist.years_experience !== null && (
                        <span>
                          {psychologist.years_experience} years of practice
                        </span>
                      )}
                      {psychologist.years_experience !== null &&
                        psychologist.location && <span aria-hidden>·</span>}
                      {psychologist.location && <span>{psychologist.location}</span>}
                    </p>
                  )}

                  {psychologist.bio && (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {excerpt(psychologist.bio)}
                    </p>
                  )}

                  {psychologist.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {psychologist.specialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
