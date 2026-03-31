import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // upcoming | live | all

    // Check cache
    const cacheKey = `matches:${status || "all"}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    const where: Record<string, unknown> = {};
    if (status === "live") {
      where.isLive = true;
    } else if (status === "upcoming") {
      where.kickoff = { gte: new Date() };
      where.isLive = false;
    }

    const matches = await prisma.match.findMany({
      where,
      orderBy: { kickoff: "asc" },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        kickoff: true,
        price: true,
        isLive: true,
      },
    });

    // Cache for 60 seconds
    const response = { matches };
    await redis.set(cacheKey, JSON.stringify(response), "EX", 60);

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "Matches list error");
  }
}
