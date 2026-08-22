"use server";

import { refresh } from "next/cache";

import { createClient, getAuthUser } from "@/lib/supabase/server";

export type ProfileActionState = {
  error: string | null;
  message: string | null;
};

function validAvatarUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function updateProfile(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getAuthUser();
  if (!user) return { error: "Sign in to update your profile.", message: null };

  const displayName = String(formData.get("displayName") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (displayName.length < 2 || displayName.length > 80) {
    return {
      error: "Display name must be between 2 and 80 characters.",
      message: null,
    };
  }
  if (bio.length > 500) {
    return { error: "Bio must be 500 characters or fewer.", message: null };
  }
  if (!validAvatarUrl(avatarUrl)) {
    return {
      error: "Avatar URL must start with http:// or https://.",
      message: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl || null,
      bio: bio || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message, message: null };

  refresh();
  return { error: null, message: "Profile updated." };
}
