import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { handleApiError } from "@/lib/errors";
import { redisPub } from "@/lib/redis-pubsub";

const CHANNEL = "ZBCTV";
const CACHE_KEY = `epg:summary:${CHANNEL}`;
const CACHE_TTL_SECONDS = 30;

type ProgramSummary = {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  match?: { id: string; homeTeam: string; awayTeam: string } | null;
};

function toProgramSummary(program: {
  id: string;
  title: string;
  category: string;
  startTime: Date;
  endTime: Date;
  match: { id: string; homeTeam: string; awayTeam: string } | null;
} | null): ProgramSummary | null {
  if (!program) return null;
  return {
    id: program.id,
    title: program.title,
    category: program.category,
    startTime: program.startTime.toISOString(),
    endTime: program.endTime.toISOString(),
    match: program.match
      ? {
          id: program.match.id,
          homeTeam: program.match.homeTeam,
          awayTeam: program.match.awayTeam,
        }
      : null,
  };
}

export async function GET() {
  try {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return NextResponse.json(JSON.parse(cached));
    } catch {
      // Cache failures should not break the endpoint.
    }

    const now = new Date();

    const include = {
      match: {
        select: { id: true, homeTeam: true, awayTeam: true },
      },
    } as const;

    // Blackout: if a program with blackout flag is airing, ZTV stream should be blocked.
    const sportsProgram = await prisma.program.findFirst({
      where: {
        channel: CHANNEL,
        blackout: true,
        startTime: { lte: now },
        endTime: { gt: now },
      },
      include,
      orderBy: { startTime: "asc" },
    });

    let ztvAvailable = true;
    let currentProgram: typeof sportsProgram | null = null;
    let nextProgram: typeof sportsProgram | null = null;
    let resumesAt: string | null = null;
    let blackoutMatch: { id: string; homeTeam: string; awayTeam: string } | null = null;

    if (sportsProgram) {
      ztvAvailable = false;
      currentProgram = sportsProgram;
      blackoutMatch = sportsProgram.match
        ? {
            id: sportsProgram.match.id,
            homeTeam: sportsProgram.match.homeTeam,
            awayTeam: sportsProgram.match.awayTeam,
          }
        : null;

      const nextNonSports = await prisma.program.findFirst({
        where: {
          channel: CHANNEL,
          startTime: { gte: sportsProgram.endTime },
          blackout: { not: true },
        },
        include,
        orderBy: { startTime: "asc" },
      });

      nextProgram = nextNonSports ?? null;
      resumesAt = (nextNonSports?.startTime ?? sportsProgram.endTime).toISOString();
    } else {
      currentProgram = await prisma.program.findFirst({
        where: {
          channel: CHANNEL,
          startTime: { lte: now },
          endTime: { gt: now },
        },
        include,
        orderBy: { startTime: "asc" },
      });

      nextProgram = await prisma.program.findFirst({
        where: {
          channel: CHANNEL,
          startTime: { gt: now },
        },
        include,
        orderBy: { startTime: "asc" },
      });
    }

    const response = {
      channel: CHANNEL,
      channelLabel: "ZTV",
      currentProgram: toProgramSummary(currentProgram),
      nextProgram: toProgramSummary(nextProgram),
      ztvAvailable,
      resumesAt,
      blackoutMatch,
    };

    try {
      await redis.set(CACHE_KEY, JSON.stringify(response), "EX", CACHE_TTL_SECONDS);
      redisPub.publish("zimcast:epg", JSON.stringify({ type: "epg:update", data: response }));
    } catch {
      // Ignore cache write failures.
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "EPG summary error");
  }
}

