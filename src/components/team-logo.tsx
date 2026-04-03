"use client";

import { useState } from "react";
import Image from "next/image";

// Known placeholder image hash from livescore CDN (generic empty badge)
const PLACEHOLDER_HASHES = [
  "UklGRiAGAABXRUJQ", // base64 prefix of the known placeholder WebP
];

function isPlaceholderUrl(url: string): boolean {
  // Detect known placeholder filenames or patterns
  return PLACEHOLDER_HASHES.some((h) => url.includes(h));
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

interface TeamLogoProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  fallbackClassName?: string;
}

export function TeamLogo({
  src,
  name,
  size = 40,
  className = "rounded-full object-contain",
  fallbackClassName,
}: TeamLogoProps) {
  const [failed, setFailed] = useState(false);

  const showFallback = !src || failed || isPlaceholderUrl(src);

  if (showFallback) {
    const sizeClass =
      size >= 64
        ? "h-16 w-16 sm:h-20 sm:w-20 text-lg sm:text-xl"
        : size >= 40
          ? "h-10 w-10 text-xs"
          : size >= 24
            ? "h-6 w-6 text-[8px]"
            : "h-5 w-5 text-[7px]";
    return (
      <div
        className={
          fallbackClassName ??
          `flex shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 font-bold text-primary ${sizeClass}`
        }
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
