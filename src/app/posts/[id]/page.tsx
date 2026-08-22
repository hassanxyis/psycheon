import Link from "next/link";
import { ArrowLeft, MessageCircleHeart } from "lucide-react";
import { notFound } from "next/navigation";

import { CommentSection } from "@/components/community/comment-section";
import { LikeButton } from "@/components/community/like-button";
import { ReportDialog } from "@/components/community/report-dialog";
import { Badge } from "@/components/ui/badge";
import { getComments, getPost } from "@/lib/queries";
import { getAuthUser } from "@/lib/supabase/server";

export default async function PostPage(props: PageProps<"/posts/[id]">) {
  // params is a Promise in Next.js 16 -- must be awaited.
  const { id } = await props.params;

  const user = await getAuthUser();
  const post = await getPost(id, user?.id ?? null);

  if (!post) notFound();

  const comments = await getComments(post.id);

  return (
    <main className="min-h-[calc(100svh-4.5rem)] bg-[radial-gradient(circle_at_92%_0%,var(--brand-cream-deep),transparent_34%),var(--background)]">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to community
        </Link>

        <article className="rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-sm shadow-foreground/[0.02] sm:p-9">
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.14em] text-primary uppercase">
              <span className="grid size-8 place-items-center rounded-full bg-primary/10">
                <MessageCircleHeart className="size-4" aria-hidden />
              </span>
              From{" "}
              <Link
                href={`/profile/${post.authorId}`}
                className="underline-offset-4 transition-colors hover:underline"
              >
                {post.authorName}
              </Link>
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-4xl leading-[1.03] tracking-tight sm:text-5xl">
                {post.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="h-7 px-3 text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <p className="whitespace-pre-wrap text-[0.98rem] leading-8 text-foreground/85">
              {post.body}
            </p>

            <div className="flex items-center gap-2 border-t border-border/60 pt-4">
              <LikeButton
                postId={post.id}
                initialCount={post.likeCount}
                initiallyLiked={post.likedByMe}
              />
              {user && <ReportDialog targetType="post" targetId={post.id} />}
            </div>
          </div>
        </article>

        <section className="rounded-[2rem] border border-border/65 bg-card/55 p-6 sm:p-9">
          <CommentSection postId={post.id} comments={comments} canComment={Boolean(user)} />
        </section>
      </div>
    </main>
  );
}
