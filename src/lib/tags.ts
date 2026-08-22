/** Fixed tag vocabulary from the MVP plan. Stored as text[] on posts. */
export const POST_TAGS = [
  "anxiety",
  "depression",
  "relationships",
  "self-help",
  "stress",
  "sleep",
  "grief",
  "parenting",
  "work",
] as const;

export type PostTag = (typeof POST_TAGS)[number];

export function isPostTag(value: string): value is PostTag {
  return (POST_TAGS as readonly string[]).includes(value);
}
