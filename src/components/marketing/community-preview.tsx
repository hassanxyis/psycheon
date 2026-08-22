import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getFeedPosts } from "@/lib/queries";

function excerpt(body: string, max = 150) {
  const plain = body.replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

/**
 * A preview, not the point of the page. getFeedPosts throws when Supabase is
 * unreachable, which would take the whole landing page down with it -- so a
 * failure falls through to the same empty state as "no posts yet".
 */
async function recentPostsOrEmpty() {
  try {
    return (await getFeedPosts({ userId: null })).slice(0, 3);
  } catch {
    return [];
  }
}

export async function CommunityPreview() {
  const recentPosts = await recentPostsOrEmpty();

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div className="max-w-lg space-y-5">
          <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
            From the community
          </p>
          <h2 className="font-heading text-4xl leading-[1.03] tracking-tight sm:text-5xl">
            Sometimes seeing the words helps.
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            A few thoughts from people making sense of their own days. Read
            quietly, or add your voice when it feels right.
          </p>
          <Link href="/feed" className={buttonVariants({ variant: "outline" })}>
            Visit the community <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>

        {recentPosts.length > 0 ? (
          <div className="grid gap-3">
            {recentPosts.map((post, index) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="group rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-foreground/[0.02] transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                      Note {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="font-heading text-xl leading-snug group-hover:text-primary">
                      {post.title}
                    </h3>
                  </div>
                  <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {excerpt(post.body)}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {post.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="size-3.5" aria-hidden />
                    {post.commentCount}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-primary/25 bg-secondary/45 p-10 text-center sm:p-14">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-card text-primary shadow-sm">
              <MessageCircle className="size-5" aria-hidden />
            </span>
            <h3 className="mt-5 font-heading text-2xl">The room is waiting.</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Be the first to share a thought that might help someone else feel a little less alone.
            </p>
            <Link href="/signup" className={buttonVariants({ size: "sm", className: "mt-6" })}>
              Start a conversation
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
