import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircleHeart, Phone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CLINIC } from "@/lib/site";

export const metadata = {
  title: "Contact · Psychéon",
  description:
    "Visit, call or email the Psychéon clinic to arrange a consultation with one of our psychologists.",
};

/**
 * Static by design -- no form, no table, nothing to configure. Details come
 * from the CLINIC constant so they are edited in one place.
 */
const details = [
  { icon: MapPin, label: "Visit", value: CLINIC.address },
  { icon: Phone, label: "Call", value: CLINIC.phone, href: `tel:${CLINIC.phone}` },
  { icon: Mail, label: "Email", value: CLINIC.email, href: `mailto:${CLINIC.email}` },
  { icon: Clock, label: "Hours", value: CLINIC.hours },
];

export default function ContactPage() {
  return (
    <main className="min-h-[calc(100svh-4.5rem)] bg-[radial-gradient(circle_at_92%_0%,var(--brand-cream-deep),transparent_34%),var(--background)]">
      <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-12 sm:px-6 sm:py-16">
        <header className="max-w-2xl space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-primary uppercase">
            <MessageCircleHeart className="size-4" aria-hidden />
            Get in touch
          </p>
          <h1 className="font-heading text-5xl leading-[0.98] tracking-tight">
            Come talk to us.
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Booking online is not open yet, so the fastest way to arrange a
            session is to call or email the clinic directly. We will help you
            find the right psychologist for what you are carrying.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {details.map(({ icon: Icon, label, value, href }) => (
            <Card
              key={label}
              className="border-border/70 bg-card/85 shadow-sm shadow-foreground/[0.02]"
            >
              <CardContent className="flex items-start gap-4">
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    {label}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      className="text-sm leading-6 font-medium underline-offset-4 hover:text-primary hover:underline"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm leading-6">{value}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="rounded-[2rem] border border-dashed border-primary/25 bg-secondary/40 p-8 sm:p-12">
          <div className="max-w-xl space-y-3">
            <h2 className="font-heading text-3xl leading-tight">
              Not ready to call yet?
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              The community is open to everyone, and reading for a while before
              you say anything is a perfectly reasonable place to start.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link href="/feed" className={buttonVariants({ size: "sm" })}>
                Visit the community
              </Link>
              <Link
                href="/psychologists"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Meet the psychologists
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
