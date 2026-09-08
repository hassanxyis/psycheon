import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { GradientBlob } from "./gradient-blob";

export function CtaBand() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:py-28">
      <div className="relative mx-auto isolate max-w-6xl overflow-hidden rounded-[2rem] bg-primary px-6 py-16 text-center text-primary-foreground shadow-xl shadow-primary/10 sm:px-12 sm:py-20">
        <GradientBlob className="-top-32 -left-20 w-72 opacity-55" tone="cream" />
        <GradientBlob className="-right-16 -bottom-24 w-80 opacity-50" tone="gold" />
        <div className="relative mx-auto max-w-2xl space-y-6">
          <p className="text-sm font-semibold tracking-[0.16em] text-primary-foreground/75 uppercase">
            Take the gentler next step
          </p>
          <h2 className="font-heading text-4xl leading-[1.03] tracking-tight sm:text-5xl">
            You do not have to hold every thought alone.
          </h2>
          <p className="text-base leading-7 text-primary-foreground/80">
            Join the conversation today. When you are ready, more support is
            there to meet you in person.
          </p>
          <div className="pt-2">
            <Link
              href="/signup"
              className={buttonVariants({
                variant: "secondary",
                size: "lg",
                className: "bg-background text-foreground shadow-sm hover:bg-background/90",
              })}
            >
              Create your free account <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
