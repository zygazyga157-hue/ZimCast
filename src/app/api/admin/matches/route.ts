import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { handleApiError } from "@/lib/errors";
import { createMatchProgram } from "@/lib/match-program";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { homeTeam, awayTeam, kickoff, price, streamKey, zplsFixtureId } = body;

    if (!homeTeam || !awayTeam || !kickoff || price == null || !streamKey) {
      return NextResponse.json(
        { error: "homeTeam, awayTeam, kickoff, price, and streamKey are required" },
        { status: 400 }
      );
    }

    const match = await prisma.match.create({
      data: {
        homeTeam,
        awayTeam,
        kickoff: new Date(kickoff),
        price,
        streamKey,
        ...(zplsFixtureId !== undefined && { zplsFixtureId }),
      },
    });

    // Invalidate match cache
    const keys = await redis.keys("matches:*");
    if (keys.length > 0) await redis.del(...keys);

    // Auto-create linked SPORTS program for the match
    const { programId, warning: programWarning } = await createMatchProgram(
      match.id,
      homeTeam,
      awayTeam,
      new Date(kickoff),
      "ZBCTV"
    );

    return NextResponse.json(
      { ...match, programId, programWarning },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "Create match error");
  }
}
