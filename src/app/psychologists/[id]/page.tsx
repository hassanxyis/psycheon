import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Languages,
  MapPin,
  Wallet,
} from "lucide-react";
import { notFound } from "next/navigation";

import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  getAvailabilityForPsychologist,
  getPsychologistById,
} from "@/lib/queries";
import { formatSlot, groupByDay } from "@/lib/schedule";

export default async function PsychologistPage(
  props: PageProps<"/psychologists/[id]">,
) {
  const { id } = await props.params;
  const psychologist = await getPsychologistById(id);

  if (!psychologist) notFound();

  const schedule = groupByDay(await getAvailabilityForPsychologist(id));

  const facts = [
    psychologist.years_experience !== null && {
      icon: BadgeCheck,
      label: "Experience",
      value: `${psychologist.years_experience} years of practice`,
    },
    psychologist.location && {
      icon: MapPin,
      label: "Location",
      value: psychologist.location,
    },
    psychologist.session_fee !== null && {
      icon: Wallet,
      label: "Session fee",
      value: `Rs ${psychologist.session_fee.toLocaleString("en-PK")}`,
    },
    psychologist.languages.length > 0 && {
      icon: Languages,
      label: "Speaks",
      value: psychologist.languages.join(", "),
    },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string }[];

  return (
    <main className="min-h-[calc(100svh-4.5rem)] bg-[radial-gradient(circle_at_92%_0%,var(--brand-cream-deep),transparent_34%),var(--background)]">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/psychologists"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to the clinic
        </Link>

        <article className="rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-sm shadow-foreground/[0.02] sm:p-9">
          <div className="space-y-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <ProfileAvatar
                name={psychologist.name}
                avatarUrl={psychologist.photo_url}
                size="lg"
                className="size-16 text-base sm:size-20"
              />
              <div className="space-y-2">
                <h1 className="font-heading text-4xl leading-[1.03] tracking-tight sm:text-5xl">
                  {psychologist.name}
                </h1>
                <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
                  {psychologist.credentials}
                </p>
              </div>
            </div>

            {facts.length > 0 && (
              <dl className="grid gap-3 rounded-2xl border border-border/65 bg-secondary/30 p-5 sm:grid-cols-2">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-card text-primary shadow-sm">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="space-y-0.5">
                      <dt className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        {label}
                      </dt>
                      <dd className="text-sm leading-6">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}

            {psychologist.specialties.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Works with
                </h2>
                <div className="flex flex-wrap gap-2">
                  {psychologist.specialties.map((specialty) => (
                    <Badge
                      key={specialty}
                      variant="secondary"
                      className="h-7 px-3 text-sm"
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {psychologist.bio && (
              <p className="whitespace-pre-wrap text-[0.98rem] leading-8 text-foreground/85">
                {psychologist.bio}
              </p>
            )}

            <div className="space-y-4 rounded-2xl border border-dashed border-primary/25 bg-secondary/40 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary shadow-sm">
                  <CalendarClock className="size-4" aria-hidden />
                </span>
                <h2 className="text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {schedule.length > 0 ? "Usual hours" : "Booking"}
                </h2>
              </div>

              {schedule.length > 0 ? (
                <>
                  <dl className="space-y-1.5">
                    {schedule.map((entry) => (
                      <div
                        key={entry.day}
                        className="flex flex-wrap justify-between gap-x-6 gap-y-1 text-sm"
                      >
                        <dt className="font-medium">{entry.name}</dt>
                        <dd className="tabular-nums text-muted-foreground">
                          {entry.slots.map(formatSlot).join(", ")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Online booking is not open yet — contact the clinic to take
                    one of these slots.
                  </p>
                </>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Online booking is not open yet. Contact the clinic to arrange
                  a session with {psychologist.name.split(" ")[0]}.
                </p>
              )}

              <Link
                href="/contact"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Contact the clinic
              </Link>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
