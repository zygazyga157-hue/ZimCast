import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { computePassWindow } from "@/lib/match-window";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // upcoming | live | ended | all

    // Check cache
    const cacheKey = `matches:${status || "all"}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    // Fetch all matches — we'll filter by derived phase
    const matches = await prisma.match.findMany({
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

    // Load linked SPORTS programs for phase computation
    const matchIds = matches.map((m) => m.id);
    const linkedPrograms = await prisma.program.findMany({
      where: { matchId: { in: matchIds }, category: "SPORTS" },
      select: { matchId: true, endTime: true },
      orderBy: { startTime: "asc" },
    });
    const programEndByMatch = new Map<string, Date>();
    for (const prog of linkedPrograms) {
      if (prog.matchId && !programEndByMatch.has(prog.matchId)) {
        programEndByMatch.set(prog.matchId, prog.endTime);
      }
    }

    const enriched = matches.map((m) => {
      const { phase, passStart, passEnd } = computePassWindow(
        m.kickoff,
        programEndByMatch.get(m.id) ?? null
      );
      return {
        ...m,
        phase,
        passStart: passStart.toISOString(),
        passEnd: passEnd.toISOString(),
      };
    });

    // Filter by derived phase
    let filtered = enriched;
    if (status === "live") {
      filtered = enriched.filter(
        (m) => m.phase === "LIVE" || m.phase === "PREGAME" || m.phase === "POSTGAME"
      );
    } else if (status === "upcoming") {
      filtered = enriched.filter((m) => m.phase === "UPCOMING");
    } else if (status === "ended") {
      filtered = enriched.filter((m) => m.phase === "ENDED");
    }

    const response = { matches: filtered };
    await redis.set(cacheKey, JSON.stringify(response), "EX", 30);

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "Matches list error");
  }
}
