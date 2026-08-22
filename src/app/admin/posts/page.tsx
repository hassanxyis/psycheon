import Link from "next/link";
import { FileText, Search } from "lucide-react";

import { PostRow } from "@/components/admin/post-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllPostsForAdmin } from "@/lib/queries";
import type { PostStatus } from "@/lib/types/database";

const STATUSES = ["published", "hidden", "removed"] as const;

function isPostStatus(value: string): value is PostStatus {
  return (STATUSES as readonly string[]).includes(value);
}

export default async function AdminPostsPage(props: PageProps<"/admin/posts">) {
  // searchParams is a Promise in Next.js 16.
  const { status, q } = await props.searchParams;

  const activeStatus =
    typeof status === "string" && isPostStatus(status) ? status : undefined;
  const search = typeof q === "string" && q.trim() ? q.trim() : undefined;

  const posts = await getAllPostsForAdmin({ status: activeStatus, search });

  // Filtering is a navigation, not client state -- keeps the view shareable and
  // the back button meaningful, same as the community TagFilter.
  const filterHref = (next?: PostStatus) => {
    const params = new URLSearchParams();
    if (next) params.set("status", next);
    if (search) params.set("q", search);
    const query = params.toString();
    return query ? `/admin/posts?${query}` : "/admin/posts";
  };

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">All posts</h2>
        <p className="text-sm text-muted-foreground">
          Every post, not just reported ones. Hiding and removing are
          reversible; deleting is not.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-y border-border/65 py-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          <Link href={filterHref()} className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Badge
              variant={activeStatus ? "outline" : "default"}
              className="h-7 px-3 text-sm"
            >
              All
            </Badge>
          </Link>
          {STATUSES.map((value) => (
            <Link
              key={value}
              href={filterHref(value)}
              className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Badge
                variant={activeStatus === value ? "default" : "outline"}
                className="h-7 px-3 text-sm capitalize"
              >
                {value}
              </Badge>
            </Link>
          ))}
        </nav>

        <form action="/admin/posts" className="flex items-center gap-2">
          {activeStatus && (
            <input type="hidden" name="status" value={activeStatus} />
          )}
          <label htmlFor="post-search" className="sr-only">
            Search posts
          </label>
          <Input
            id="post-search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search title or body…"
            className="sm:w-56"
          />
          <Button type="submit" variant="outline" size="sm">
            <Search className="size-4" aria-hidden />
            <span className="sr-only">Search</span>
          </Button>
        </form>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <FileText className="mx-auto size-5 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">
            {search || activeStatus ? "Nothing matches this filter." : "No posts yet."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || activeStatus
              ? "Try a different status or search term."
              : "Posts from the community will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
