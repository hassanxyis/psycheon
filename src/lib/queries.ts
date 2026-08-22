import type {
  Availability,
  PostStatus,
  Profile,
  Psychologist,
  ReportStatus,
} from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";
import type { FeedPost } from "@/components/community/post-card";

type PostRow = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  author_id: string;
  author: { display_name: string } | null;
  likes: { count: number }[];
  comments: { count: number }[];
};

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: { display_name: string } | null;
};

export type PublicProfile = Pick<
  Profile,
  "id" | "display_name" | "avatar_url" | "bio" | "created_at"
>;

export type ModerationReport = {
  id: string;
  targetType: "post" | "comment";
  targetId: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  target: {
    title: string;
    excerpt: string;
    status?: "published" | "hidden" | "removed";
  } | null;
};

function toFeedPost(row: PostRow, likedIds: Set<string>): FeedPost {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: row.tags ?? [],
    created_at: row.created_at,
    authorName: row.author?.display_name ?? "Someone",
    authorId: row.author_id,
    likeCount: row.likes?.[0]?.count ?? 0,
    commentCount: row.comments?.[0]?.count ?? 0,
    likedByMe: likedIds.has(row.id),
  };
}

/**
 * Which of the given posts the current user has liked.
 *
 * Fetched as one `in` query rather than a per-post lookup: the likes table is
 * world-readable, so filtering client-side by user would work but would ship
 * every like row to the server for nothing.
 */
async function likedPostIds(postIds: string[], userId: string | null) {
  if (!userId || postIds.length === 0) return new Set<string>();

  const supabase = await createClient();
  const { data } = await supabase
    .from("likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  return new Set((data ?? []).map((row) => row.post_id));
}

export async function getFeedPosts(opts: { tag?: string; userId: string | null }) {
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select(
      "id, title, body, tags, created_at, author_id, author:profiles!posts_author_id_fkey(display_name), likes(count), comments(count)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  if (opts.tag) query = query.contains("tags", [opts.tag]);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load feed: ${error.message}`);

  const rows = (data ?? []) as unknown as PostRow[];
  const liked = await likedPostIds(
    rows.map((row) => row.id),
    opts.userId,
  );

  return rows.map((row) => toFeedPost(row, liked));
}

export async function getPostsByAuthor(opts: {
  authorId: string;
  userId: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, title, body, tags, created_at, author_id, author:profiles!posts_author_id_fkey(display_name), likes(count), comments(count)",
    )
    .eq("author_id", opts.authorId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load profile posts: ${error.message}`);

  const rows = (data ?? []) as unknown as PostRow[];
  const liked = await likedPostIds(
    rows.map((row) => row.id),
    opts.userId,
  );

  return rows.map((row) => toFeedPost(row, liked));
}

export async function getPost(id: string, userId: string | null) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, title, body, tags, created_at, author_id, author:profiles!posts_author_id_fkey(display_name), likes(count), comments(count)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load post: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as PostRow;
  const liked = await likedPostIds([row.id], userId);

  return { ...toFeedPost(row, liked), authorId: row.author_id };
}

export async function getComments(postId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, body, created_at, author_id, author:profiles!comments_author_id_fkey(display_name)",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load comments: ${error.message}`);

  // Relationships are declared empty in database.ts, so embedded selects come
  // back as `never`. Narrow explicitly until types are generated from the live
  // schema (see the header comment in src/lib/types/database.ts).
  const rows = (data ?? []) as unknown as CommentRow[];

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    created_at: row.created_at,
    authorName: row.author?.display_name ?? "Someone",
  }));
}

export type AdminPost = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  status: PostStatus;
  createdAt: string;
  authorId: string;
  authorName: string;
  commentCount: number;
};

type AdminPostRow = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  status: PostStatus;
  created_at: string;
  author_id: string;
  author: { display_name: string } | null;
  comments: { count: number }[];
};

/**
 * Every post regardless of status, for the admin moderation table. Readable
 * because of the "admins view all posts" policy -- a non-admin running this
 * would silently get only published rows back, never an error.
 */
export async function getAllPostsForAdmin(opts: {
  status?: PostStatus;
  search?: string;
}): Promise<AdminPost[]> {
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select(
      "id, title, body, tags, status, created_at, author_id, author:profiles!posts_author_id_fkey(display_name), comments(count)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (opts.status) query = query.eq("status", opts.status);

  if (opts.search) {
    // Escape PostgREST's or() delimiters -- an unescaped comma or paren in the
    // search box would otherwise be parsed as extra filter syntax.
    const term = opts.search.replace(/[,()\\]/g, " ").trim();
    if (term) query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load posts: ${error.message}`);

  return ((data ?? []) as unknown as AdminPostRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    tags: row.tags ?? [],
    status: row.status,
    createdAt: row.created_at,
    authorId: row.author_id,
    authorName: row.author?.display_name ?? "Someone",
    commentCount: row.comments?.[0]?.count ?? 0,
  }));
}

export async function getProfileById(id: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublicProfile;
}

export async function getPsychologists(): Promise<Psychologist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("psychologists")
    .select(
      "id, name, credentials, specialties, bio, photo_url, is_active, years_experience, languages, session_fee, location, created_at, updated_at",
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to load psychologists: ${error.message}`);
  return (data ?? []) as Psychologist[];
}

export async function getPsychologistById(id: string): Promise<Psychologist | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("psychologists")
    .select(
      "id, name, credentials, specialties, bio, photo_url, is_active, years_experience, languages, session_fee, location, created_at, updated_at",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Psychologist;
}

/**
 * Like getPsychologistById but without the is_active filter -- admin screens
 * must still reach an unlisted psychologist's record.
 */
export async function getPsychologistForAdmin(
  id: string,
): Promise<Psychologist | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("psychologists")
    .select(
      "id, name, credentials, specialties, bio, photo_url, is_active, years_experience, languages, session_fee, location, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Psychologist;
}

export async function getAllPsychologistsForAdmin(): Promise<Psychologist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("psychologists")
    .select(
      "id, name, credentials, specialties, bio, photo_url, is_active, years_experience, languages, session_fee, location, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load psychologist roster: ${error.message}`);
  return (data ?? []) as Psychologist[];
}

/**
 * Weekly recurring schedule for one psychologist. Readable by anyone --
 * "availability is viewable by everyone" -- so the public profile can show it.
 */
export async function getAvailabilityForPsychologist(
  psychologistId: string,
): Promise<Availability[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability")
    .select("id, psychologist_id, day_of_week, start_time, end_time, created_at")
    .eq("psychologist_id", psychologistId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw new Error(`Failed to load availability: ${error.message}`);
  return (data ?? []) as Availability[];
}

export async function getAllProfilesForAdmin(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, role, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) throw new Error(`Failed to load users: ${error.message}`);
  return (data ?? []) as Profile[];
}

type ReportRow = {
  id: string;
  target_type: "post" | "comment";
  target_id: string;
  reporter_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  reporter: { display_name: string } | null;
};

type ModeratedPostRow = {
  id: string;
  title: string;
  body: string;
  status: "published" | "hidden" | "removed";
};

type ModeratedCommentRow = {
  id: string;
  body: string;
  post_id: string;
};

/**
 * Reports deliberately use polymorphic target fields, so PostgREST cannot
 * embed a target relation. Batch-load each target table once and merge locally.
 */
export async function getOpenReports(): Promise<ModerationReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reporter_id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(display_name)",
    )
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reports: ${error.message}`);

  const reports = (data ?? []) as unknown as ReportRow[];
  const postIds = reports
    .filter((report) => report.target_type === "post")
    .map((report) => report.target_id);
  const commentIds = reports
    .filter((report) => report.target_type === "comment")
    .map((report) => report.target_id);

  const [postsResult, commentsResult] = await Promise.all([
    postIds.length
      ? supabase
          .from("posts")
          .select("id, title, body, status")
          .in("id", postIds)
      : Promise.resolve({ data: [], error: null }),
    commentIds.length
      ? supabase
          .from("comments")
          .select("id, body, post_id")
          .in("id", commentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (postsResult.error) {
    throw new Error(`Failed to load reported posts: ${postsResult.error.message}`);
  }
  if (commentsResult.error) {
    throw new Error(
      `Failed to load reported comments: ${commentsResult.error.message}`,
    );
  }

  const posts = new Map(
    ((postsResult.data ?? []) as ModeratedPostRow[]).map((post) => [post.id, post]),
  );
  const comments = new Map(
    ((commentsResult.data ?? []) as ModeratedCommentRow[]).map((comment) => [
      comment.id,
      comment,
    ]),
  );

  return reports.map((report) => {
    const post = posts.get(report.target_id);
    const comment = comments.get(report.target_id);

    return {
      id: report.id,
      targetType: report.target_type,
      targetId: report.target_id,
      reporterId: report.reporter_id,
      reporterName: report.reporter?.display_name ?? "Someone",
      reason: report.reason,
      status: report.status,
      createdAt: report.created_at,
      target: post
        ? { title: post.title, excerpt: post.body, status: post.status }
        : comment
          ? { title: "Comment", excerpt: comment.body }
          : null,
    };
  });
}

export async function getAdminOverview() {
  const supabase = await createClient();
  const [reports, psychologists, users, posts] = await Promise.all([
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reviewing"]),
    supabase.from("psychologists").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
  ]);

  if (reports.error || psychologists.error || users.error || posts.error) {
    throw new Error("Failed to load admin overview.");
  }

  return {
    openReports: reports.count ?? 0,
    psychologists: psychologists.count ?? 0,
    users: users.count ?? 0,
    posts: posts.count ?? 0,
  };
}
