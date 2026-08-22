import Link from "next/link";
import { ArrowUpRight, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LikeButton } from "./like-button";

export type FeedPost = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  authorName: string;
  authorId: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

function excerpt(body: string, max = 220) {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export function PostCard({ post }: { post: FeedPost }) {
  return (
    <Card className="border-border/70 bg-card/85 shadow-sm shadow-foreground/[0.02] transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              From{" "}
              <Link
                href={`/profile/${post.authorId}`}
                className="underline-offset-4 transition-colors hover:underline"
              >
                {post.authorName}
              </Link>
            </p>
            <CardTitle className="text-2xl leading-snug">
              <Link
                href={`/posts/${post.id}`}
                className="outline-none transition-colors hover:text-primary focus-visible:rounded focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {post.title}
              </Link>
            </CardTitle>
          </div>
          <Link
            href={`/posts/${post.id}`}
            aria-label={`Read ${post.title}`}
            className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(post.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-6 text-muted-foreground">{excerpt(post.body)}</p>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border/60 pt-3">
          <LikeButton
            postId={post.id}
            initialCount={post.likeCount}
            initiallyLiked={post.likedByMe}
          />
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageSquare className="size-4" aria-hidden />
            <span className="tabular-nums">{post.commentCount}</span>
            <span className="sr-only">comments</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
