"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { isPostTag } from "@/lib/tags";

export type ActionState = { error: string | null };

/**
 * Every mutation re-derives the user from the verified JWT rather than trusting
 * an id submitted by the client. RLS enforces this again at the database level;
 * the check here exists to return a friendly error instead of a policy failure.
 */
async function requireUser() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

export async function createPost(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const tags = formData.getAll("tags").map(String).filter(isPostTag);

  if (title.length < 3) return { error: "Title must be at least 3 characters." };
  if (!body) return { error: "Post body cannot be empty." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, title, body, tags })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/posts/${data.id}`);
}

export async function addComment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const postId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!postId) return { error: "Missing post." };
  if (!body) return { error: "Comment cannot be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, body });

  if (error) return { error: error.message };

  // Read-your-writes: the new comment must be visible immediately.
  refresh();
  return { error: null };
}

export async function toggleLike(postId: string, liked: boolean) {
  const user = await requireUser();
  const supabase = await createClient();

  if (liked) {
    await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    // The (post_id, user_id) primary key makes a double-like a no-op rather
    // than a duplicate row, so an ignored conflict is the correct behaviour.
    await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
  }

  refresh();
}

export async function reportContent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (targetType !== "post" && targetType !== "comment") {
    return { error: "Invalid report target." };
  }
  if (!reason) return { error: "Please describe the problem." };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    target_type: targetType,
    target_id: targetId,
    reporter_id: user.id,
    reason,
  });

  // Unique constraint -- the user already reported this item.
  if (error?.code === "23505") {
    return { error: "You have already reported this." };
  }
  if (error) return { error: error.message };

  return { error: null };
}
