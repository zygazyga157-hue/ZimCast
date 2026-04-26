import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { computePassWindow } from "@/lib/match-window";
import { handleApiError } from "@/lib/errors";
import { getFixtureScore } from "@/lib/zpls";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // upcoming | live | ended | all
    const dateParam = searchParams.get("date"); // YYYY-MM-DD, defaults to today

    // Resolve target date
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);
    const dateKey = dayStart.toISOString().slice(0, 10);

    // Check cache
    const cacheKey = `matches:${dateKey}:${status || "all"}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(JSON.parse(cached));
    } catch {
      // Cache failures (including NOAUTH) are non-fatal.
    }

    // Fetch matches with kickoff on the target date,
    // plus any match that might still be in an active window (PREGAME/LIVE/POSTGAME).
    // Active-window matches have passEnd > now, so we include matches from the
    // day before as well (a match at 23:00 yesterday could still be in POSTGAME).
    const lookbackStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);

    const matches = await prisma.match.findMany({
      where: {
        kickoff: { gte: lookbackStart, lte: dayEnd },
      },
      orderBy: { kickoff: "asc" },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        kickoff: true,
        price: true,
        isLive: true,
        zplsFixtureId: true,
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

    // Enrich linked matches with ZPLS live scores (best-effort)
    const enrichedWithScores = await Promise.all(
      enriched.map(async (m) => {
        if (!m.zplsFixtureId) return m;
        try {
          const score = await getFixtureScore(m.zplsFixtureId);
          if (score) {
            return { ...m, zpls: score };
          }
        } catch {
          // Score enrichment failed — acceptable
        }
        return m;
      })
    );

    // Date filter: keep matches whose kickoff falls on the target date,
    // plus any match still in an active window (PREGAME/LIVE/POSTGAME)
    const dateFiltered = enrichedWithScores.filter((m) => {
      const kickoffDate = new Date(m.kickoff);
      const isToday = kickoffDate >= dayStart && kickoffDate <= dayEnd;
      const isActive = m.phase === "PREGAME" || m.phase === "LIVE" || m.phase === "POSTGAME";
      return isToday || isActive;
    });

    // Filter by derived phase
    let filtered = dateFiltered;
    if (status === "live") {
      filtered = dateFiltered.filter(
        (m) => m.phase === "LIVE" || m.phase === "PREGAME" || m.phase === "POSTGAME"
      );
    } else if (status === "upcoming") {
      filtered = dateFiltered.filter((m) => m.phase === "UPCOMING");
    } else if (status === "ended") {
      filtered = dateFiltered.filter((m) => m.phase === "ENDED");
    }

    const response = { matches: filtered };
    try {
      await redis.set(cacheKey, JSON.stringify(response), "EX", 30);
    } catch {
      // Cache write failures are non-fatal.
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "Matches list error");
  }
}
