import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { POST_TAGS } from "@/lib/tags";

/**
 * Server Component -- filtering is a navigation, so links beat client state.
 * Keeps the feed shareable and back-button friendly.
 */
export function TagFilter({ active }: { active?: string }) {
  return (
    <nav aria-label="Filter by tag" className="flex flex-wrap gap-2">
      <Link href="/feed" className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Badge variant={active ? "outline" : "default"} className="h-7 px-3 text-sm">
          All
        </Badge>
      </Link>
      {POST_TAGS.map((tag) => (
        <Link
          key={tag}
          href={`/feed?tag=${tag}`}
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Badge
            variant={active === tag ? "default" : "outline"}
            className="h-7 px-3 text-sm capitalize"
          >
            {tag}
          </Badge>
        </Link>
      ))}
    </nav>
  );
}
