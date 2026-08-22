import Link from "next/link";
import { ArrowLeft, CalendarDays, PenLine } from "lucide-react";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/community/post-card";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getPostsByAuthor, getProfileById } from "@/lib/queries";
import { getAuthUser } from "@/lib/supabase/server";

export default async function PublicProfilePage(
  props: PageProps<"/profile/[id]">,
) {
  const { id } = await props.params;
  const [viewer, profile] = await Promise.all([getAuthUser(), getProfileById(id)]);

  if (!profile) notFound();

  const posts = await getPostsByAuthor({
    authorId: profile.id,
    userId: viewer?.id ?? null,
  });
  const isOwnProfile = viewer?.id === profile.id;

  return (
    <main className="min-h-[calc(100svh-4.5rem)] bg-[radial-gradient(circle_at_8%_0%,var(--brand-cream-deep),transparent_32%),var(--background)]">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to community
        </Link>

        <section className="rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-sm shadow-foreground/[0.02] sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <ProfileAvatar
                name={profile.display_name}
                avatarUrl={profile.avatar_url}
                size="lg"
                className="size-14 text-base sm:size-16"
              />
              <div className="space-y-2">
                <h1 className="font-heading text-4xl leading-tight tracking-tight">
                  {profile.display_name}
                </h1>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="size-3.5" aria-hidden />
                  Joined {new Date(profile.created_at).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                {profile.bio && (
                  <p className="max-w-xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
            {isOwnProfile && (
              <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Edit profile
              </Link>
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
                Conversations
              </p>
              <h2 className="mt-1 font-heading text-3xl">Posts by {profile.display_name}</h2>
            </div>
            <Badge variant="secondary" className="h-7 px-3 text-sm">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </Badge>
          </div>

          {posts.length > 0 ? (
            <div className="space-y-5">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-primary/25 bg-secondary/40 p-10 text-center">
              <PenLine className="mx-auto size-5 text-primary" aria-hidden />
              <h3 className="mt-4 font-heading text-2xl">No public posts yet.</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                {isOwnProfile
                  ? "When you share something with the community, it will appear here."
                  : "This person has not shared a public post yet."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
