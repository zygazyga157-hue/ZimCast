import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { handleApiError } from "@/lib/errors";

const CACHE_TTL_SECONDS = 10 * 60; // 10 minutes
const LOOKBACK_DAYS = 30;
const MIN_TOTAL_SECONDS = 15 * 60; // 15 minutes
const MIN_TOP_SHARE = 0.4;

function prettyCategory(category: string): string {
  const upper = category.toUpperCase();
  if (upper === "SPORTS") return "Sports";
  if (upper === "NEWS") return "News";
  if (upper === "ENTERTAINMENT") return "Entertainment";
  if (upper === "MUSIC") return "Music";
  if (upper === "DOCUMENTARY") return "Documentary";
  if (upper === "OTHER") return "Other";
  return upper.slice(0, 1) + upper.slice(1).toLowerCase();
}

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentHour = new Date().getHours();
    const cacheKey = `user:${userId}:insight:${currentHour}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(JSON.parse(cached));
    } catch {
      // Cache failures should not break the endpoint.
    }

    const now = new Date();
    const since = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const activities = await prisma.viewingActivity.findMany({
      where: {
        userId,
        action: "WATCH",
        watchDuration: { gt: 0 },
        sessionStart: { gte: since },
      },
      select: {
        sessionStart: true,
        watchDuration: true,
        matchId: true,
        program: { select: { category: true } },
      },
    });

    const totals: Record<string, number> = {};
    let totalAtHour = 0;

    for (const a of activities) {
      if (a.sessionStart.getHours() !== currentHour) continue;
      const category =
        a.program?.category ?? (a.matchId ? "SPORTS" : null);
      if (!category) continue; // skip unattributable records
      totals[category] = (totals[category] ?? 0) + a.watchDuration;
      totalAtHour += a.watchDuration;
    }

    let message: string | null = null;
    if (totalAtHour >= MIN_TOTAL_SECONDS) {
      let topCategory: string | null = null;
      let topSeconds = 0;
      for (const [cat, seconds] of Object.entries(totals)) {
        if (seconds > topSeconds) {
          topSeconds = seconds;
          topCategory = cat;
        }
      }

      if (topCategory) {
        const share = topSeconds / totalAtHour;
        if (share >= MIN_TOP_SHARE) {
          message = `You usually watch ${prettyCategory(topCategory)} at this time.`;
        }
      }
    }

    const response = { message };

    try {
      await redis.set(cacheKey, JSON.stringify(response), "EX", CACHE_TTL_SECONDS);
    } catch {
      // Ignore cache write failures.
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "User insight error");
  }
}

