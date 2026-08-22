import Link from "next/link";
import { CalendarCheck, GraduationCap, MessageCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const features = [
  {
    title: "A room to say it out loud",
    description:
      "Write about anxiety, stress, relationships, sleep, or the ordinary hard parts. Read at your own pace. Reply with care.",
    icon: MessageCircle,
    action: { label: "Explore the community", href: "/feed" },
    tone: "bg-secondary text-primary",
  },
  {
    title: "People with the right training",
    description:
      "Meet the qualified psychologists at our clinic and find support that fits what you are navigating.",
    icon: GraduationCap,
    action: { label: "Meet the psychologists", href: "/psychologists" },
    tone: "bg-accent text-accent-foreground",
  },
  {
    title: "Care that fits real life",
    description:
      "Choose an in-clinic time, pay in the way that works for you, and keep the next step simple.",
    icon: CalendarCheck,
    action: { label: "Join to be notified", href: "/signup" },
    tone: "bg-primary text-primary-foreground",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
          One place, at your pace
        </p>
        <h2 className="font-heading text-4xl leading-[1.03] tracking-tight sm:text-5xl">
          Start with the kind of support you need today.
        </h2>
        <p className="max-w-xl text-base leading-7 text-muted-foreground">
          Some days you need to be heard. Some days you need a plan. mindfit is
          designed for both.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {features.map(({ title, description, icon: Icon, action, tone }) => (
          <Card
            key={title}
            className="min-h-72 justify-between bg-card/85 transition-transform duration-300 hover:-translate-y-1"
          >
            <CardHeader className="space-y-5">
              <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}>
                <Icon className="size-5" aria-hidden />
              </span>
              <CardTitle className="text-2xl leading-tight">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="leading-6 text-muted-foreground">{description}</p>
              <Link
                href={action.href}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {action.label} <span aria-hidden>→</span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
