"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toggleLike } from "@/app/(community)/actions";
import { cn } from "@/lib/utils";

export function LikeButton({
  postId,
  initialCount,
  initiallyLiked,
}: {
  postId: string;
  initialCount: number;
  initiallyLiked: boolean;
}) {
  const [, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(
    { count: initialCount, liked: initiallyLiked },
    (prev, liked: boolean) => ({
      liked,
      count: prev.count + (liked ? 1 : -1),
    }),
  );

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={state.liked}
      aria-label={state.liked ? "Unlike this post" : "Like this post"}
      onClick={() => {
        startTransition(async () => {
          setOptimistic(!state.liked);
          await toggleLike(postId, state.liked);
        });
      }}
    >
      <Heart
        className={cn("size-4", state.liked && "fill-current text-red-500")}
        aria-hidden
      />
      <span className="tabular-nums">{state.count}</span>
    </Button>
  );
}
