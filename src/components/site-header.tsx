import Link from "next/link";
import { CalendarCheck, LogOut, Menu, Shield, UserRound } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentProfile } from "@/lib/supabase/server";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/feed", label: "Community" },
  { href: "/psychologists", label: "Psychologists" },
  { href: "/percentile", label: "Percentile" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo className="h-9 w-auto" />
          <span className="font-heading text-xl leading-none tracking-tight">
            Psychéon
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-1 sm:gap-2">
          {/* Five links plus the account control does not fit on a phone, so
              the links collapse into the menu below the sm breakpoint. */}
          <div className="hidden items-center gap-1 sm:flex sm:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    aria-label="Account menu"
                  />
                }
              >
                <ProfileAvatar
                  name={profile.display_name}
                  avatarUrl={profile.avatar_url}
                  size="sm"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {/* GroupLabel is associated with its parent group by Base UI
                    and throws without one -- it cannot stand on its own. */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="truncate">
                    {profile.display_name}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="sm:hidden">
                    {navLinks.map((link) => (
                      <DropdownMenuItem
                        key={link.href}
                        render={<Link href={link.href} />}
                      >
                        {link.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>
                  <DropdownMenuItem render={<Link href="/bookings" />}>
                    <CalendarCheck aria-hidden />
                    Your bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/profile" />}>
                    <UserRound aria-hidden />
                    Your profile
                  </DropdownMenuItem>
                  {profile.role === "admin" && (
                    <DropdownMenuItem render={<Link href="/admin" />}>
                      <Shield aria-hidden />
                      Admin panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <form action={signOut}>
                    {/* Menu.Item renders a div by default, so nativeButton must
                        be set when the render prop supplies a real <button>. */}
                    <DropdownMenuItem
                      nativeButton
                      render={<button type="submit" className="w-full" />}
                    >
                      <LogOut aria-hidden />
                      Sign out
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="sm:hidden"
                      aria-label="Open navigation"
                    />
                  }
                >
                  <Menu aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {navLinks.map((link) => (
                    <DropdownMenuItem
                      key={link.href}
                      render={<Link href={link.href} />}
                    >
                      {link.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
