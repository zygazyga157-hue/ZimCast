"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateAvatar, type AvatarInput } from "@/lib/avatar";
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

export function ProfileAvatar({
  avatarUrl,
  name,
  email,
  interests,
  size = "default",
  className,
  animated = false,
}: ProfileAvatarProps) {
  const generated = useMemo(
    () => generateAvatar({ name, email, interests }),
    [name, email, interests]
  );

  // Determine the image source: stored URL first, then generated data URL
  const src = avatarUrl || generated.dataUrl;

  return (
    <div
      className={cn(
        "relative inline-flex",
        animated && "avatar-ring-glow",
        animated && generated.animationClass,
        className
      )}
    >
      <Avatar size={size}>
        <AvatarImage src={src} alt={name ?? email ?? "User avatar"} />
        <AvatarFallback className="gradient-accent text-xs font-bold text-white">
          {generated.initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
