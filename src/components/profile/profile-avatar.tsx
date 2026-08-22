import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return letters ? letters.toUpperCase() : "?";
}

export function ProfileAvatar({
  name,
  avatarUrl,
  size = "default",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={cn(className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={`${name}'s avatar`} />}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
