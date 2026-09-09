import Link from "next/link";
import { MapPin } from "lucide-react";

import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-secondary/45">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="max-w-sm space-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Logo className="h-9 w-auto" />
            <span className="font-heading text-xl tracking-tight">Psychéon</span>
          </Link>
          <p className="text-sm leading-6 text-muted-foreground">
            A softer place for honest conversations and in-person care when you
            need it.
          </p>
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            Rooted in Pakistan
          </p>
        </div>

        <div className="space-y-4 md:text-right">
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium md:justify-end">
            <Link className="transition-colors hover:text-primary" href="/feed">
              Community
            </Link>
            <Link className="transition-colors hover:text-primary" href="/psychologists">
              Psychologists
            </Link>
            <Link className="transition-colors hover:text-primary" href="/percentile">
              Percentile
            </Link>
            <Link className="transition-colors hover:text-primary" href="/contact">
              Contact
            </Link>
            <Link className="transition-colors hover:text-primary" href="/signup">
              Create an account
            </Link>
            <Link className="transition-colors hover:text-primary" href="/login">
              Sign in
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Psychéon. Made for calmer
            conversations.
          </p>
        </div>
      </div>
    </footer>
  );
}
