"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  /** Stored avatar URL (takes priority). */
  avatarUrl?: string | null;
  /** Name for initials + generation seed. */
  name?: string | null;
  /** Email fallback for initials + seed. */
  email?: string | null;
  /** Interests array for motif selection. */
  interests?: string[];
  /** Radix avatar size variant. */
  size?: "sm" | "default" | "lg";
  /** Additional className on the wrapper. */
  className?: string;
  /** Whether to show the animated ring + vibe animation. */
  animated?: boolean;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
    if (initials) return initials;
  }
  return (email?.[0] ?? "U").toUpperCase();
}

const INTEREST_VIBE: Record<string, string> = {
  Sports: "avatar-vibe-energetic",
  News: "avatar-vibe-steady",
  Entertainment: "avatar-vibe-playful",
  Music: "avatar-vibe-rhythmic",
  Documentary: "avatar-vibe-steady",
  Gaming: "avatar-vibe-energetic",
  Travel: "avatar-vibe-playful",
  Food: "avatar-vibe-warm",
  Tech: "avatar-vibe-precise",
  Fashion: "avatar-vibe-playful",
  Fitness: "avatar-vibe-energetic",
  Art: "avatar-vibe-rhythmic",
};

export function ProfileAvatar({
  avatarUrl,
  name,
  email,
  interests,
  size = "default",
  className,
  animated = false,
}: ProfileAvatarProps) {
  const initials = getInitials(name, email);
  const vibe =
    (interests ?? []).map((i) => INTEREST_VIBE[i]).find(Boolean) ??
    "avatar-vibe-steady";

  return (
    <div
      className={cn(
        "relative inline-flex",
        animated && "avatar-ring-glow",
        animated && vibe,
      )}
    >
      <Avatar size={size} className={className}>
        <AvatarImage src={avatarUrl ?? undefined} alt={name ?? email ?? "User avatar"} />
        <AvatarFallback className="gradient-accent text-xs font-bold text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
