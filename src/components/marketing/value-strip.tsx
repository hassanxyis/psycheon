import { HeartHandshake, MapPin, ShieldCheck, Users } from "lucide-react";

const values = [
  {
    icon: ShieldCheck,
    label: "Care led by qualified professionals",
  },
  {
    icon: Users,
    label: "A community built for kindness",
  },
  {
    icon: MapPin,
    label: "In-person care in Pakistan",
  },
  {
    icon: HeartHandshake,
    label: "Free to join and take your time",
  },
];

export function ValueStrip() {
  return (
    <section aria-label="What Psychéon offers" className="border-y border-border/60 bg-secondary/65">
      <div className="mx-auto grid w-full max-w-6xl gap-x-8 gap-y-5 px-4 py-7 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {values.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary ring-1 ring-primary/10">
              <Icon className="size-4" aria-hidden />
            </span>
            <p className="text-sm font-medium leading-5 text-secondary-foreground">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
