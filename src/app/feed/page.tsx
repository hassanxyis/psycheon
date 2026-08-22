import Link from "next/link";
import { MessageCircle, PenLine, Sprout } from "lucide-react";

import { PostCard } from "@/components/community/post-card";
import { TagFilter } from "@/components/community/tag-filter";
import { buttonVariants } from "@/components/ui/button";
import { getFeedPosts } from "@/lib/queries";
import { getAuthUser } from "@/lib/supabase/server";
import { isPostTag } from "@/lib/tags";

export default async function FeedPage(props: PageProps<"/feed">) {
  const { tag } = await props.searchParams;
  const activeTag = typeof tag === "string" && isPostTag(tag) ? tag : undefined;

  const user = await getAuthUser();
  const posts = await getFeedPosts({ tag: activeTag, userId: user?.id ?? null });

  return (
    <main className="min-h-[calc(100svh-4.5rem)] bg-[radial-gradient(circle_at_8%_0%,var(--brand-cream-deep),transparent_32%),var(--background)]">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12 sm:px-6 sm:py-16">
        <header className="space-y-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-xl space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-primary uppercase">
                <Sprout className="size-4" aria-hidden />
                Community garden
              </p>
              <h1 className="font-heading text-5xl leading-[0.98] tracking-tight">
                A place for the thoughts that need a little air.
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                Read slowly. Share honestly. Respond with the kind of care you
                would want to receive.
              </p>
            </div>
            {user ? (
              <Link href="/posts/new" className={buttonVariants({ size: "lg" })}>
                <PenLine className="size-4" aria-hidden />
                Write a post
              </Link>
            ) : (
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Sign in to share
              </Link>
            )}
          </div>

          <div className="border-y border-border/65 py-4">
            <TagFilter active={activeTag} />
          </div>
        </header>

        {posts.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-primary/25 bg-secondary/40 p-10 text-center sm:p-14">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-card text-primary shadow-sm">
              <MessageCircle className="size-5" aria-hidden />
            </span>
            <h2 className="mt-5 font-heading text-3xl">
              {activeTag ? `Nothing under “${activeTag}” yet.` : "The room is waiting."}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {activeTag
                ? "Try another topic, or be the first person to start this conversation."
                : "Be the first to share a thought that might help someone else feel a little less alone."}
            </p>
            {user ? (
              <Link href="/posts/new" className={buttonVariants({ size: "sm", className: "mt-6" })}>
                Start a conversation
              </Link>
            ) : (
              <Link href="/signup" className={buttonVariants({ size: "sm", className: "mt-6" })}>
                Join the community
              </Link>
            )}
          </section>
        ) : (
          <div className="space-y-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
