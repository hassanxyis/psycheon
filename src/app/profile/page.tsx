import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";

import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/supabase/server";

export default async function MyProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/profile");

  return (
    <main className="min-h-[calc(100svh-4.5rem)] bg-[radial-gradient(circle_at_92%_0%,var(--brand-cream-deep),transparent_34%),var(--background)]">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-primary uppercase">
              <Settings2 className="size-4" aria-hidden />
              Your space
            </p>
            <h1 className="font-heading text-5xl leading-[0.98] tracking-tight">
              Make this profile feel like you.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              Your name and bio are visible to people who visit your public profile.
            </p>
          </div>
          <ProfileAvatar
            name={profile.display_name}
            avatarUrl={profile.avatar_url}
            size="lg"
            className="size-16 text-lg sm:size-20"
          />
        </header>

        <Card className="border-border/70 bg-card/85 shadow-sm shadow-foreground/[0.02]">
          <CardHeader>
            <CardTitle className="text-3xl">Profile details</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
