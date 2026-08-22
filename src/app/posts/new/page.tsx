import { redirect } from "next/navigation";

import { NewPostForm } from "@/components/community/new-post-form";
import { FocusedPageShell } from "@/components/focused-page-shell";
import { getAuthUser } from "@/lib/supabase/server";

export default async function NewPostPage() {
  if (!(await getAuthUser())) redirect("/login?next=/posts/new");

  return (
    <FocusedPageShell
      eyebrow="Your words, your way"
      title="What would feel lighter to say out loud?"
      description="Write as much or as little as you need. Your post is visible to the community, so share only what feels right."
      backHref="/feed"
      backLabel="Back to community"
    >
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h2 className="font-heading text-3xl leading-tight">Start a conversation</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            A thoughtful title helps the right people find your post.
          </p>
        </div>
        <NewPostForm />
      </div>
    </FocusedPageShell>
  );
}
