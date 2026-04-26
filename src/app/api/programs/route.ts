import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { handleApiError } from "@/lib/errors";
import { catDateKeyFromNow, catDayBounds } from "@/lib/cat-time";

const CACHE_TTL_SECONDS = 60;

export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date");
    const now = new Date();

    const dateKey = dateParam ?? catDateKeyFromNow(now);
    const cacheKey = `programs:${dateKey}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(JSON.parse(cached));
    } catch {
      // Cache failures are non-fatal
    }

    let dayStart: Date;
    let dayEnd: Date;
    try {
      ({ start: dayStart, end: dayEnd } = catDayBounds(dateKey));
    } catch {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    const programs = await prisma.program.findMany({
      where: {
        startTime: { lte: dayEnd },
        endTime: { gte: dayStart },
      },
      include: {
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            kickoff: true,
            isLive: true,
            price: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const currentProgram = programs.find(
      (p) => new Date(p.startTime) <= now && new Date(p.endTime) > now
    ) ?? null;

    const nextProgram = programs.find(
      (p) => new Date(p.startTime) > now
    ) ?? null;

    const response = {
      programs,
      currentProgram,
      nextProgram,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(response), "EX", CACHE_TTL_SECONDS);
    } catch {
      // Ignore cache write failures
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "Programs fetch error");
  }
}
