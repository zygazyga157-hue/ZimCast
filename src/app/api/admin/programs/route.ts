import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { createProgramSafe, invalidateProgramCache, OverlapError, validateProgramInput } from "@/lib/program";
import { redisPub } from "@/lib/redis-pubsub";
import { catDayBounds, isNaiveLocalDateTimeString } from "@/lib/cat-time";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const date = req.nextUrl.searchParams.get("date");
    const where: Record<string, unknown> = {};

    if (date) {
      let start: Date;
      let end: Date;
      try {
        ({ start, end } = catDayBounds(date));
      } catch {
        return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
      }
      where.startTime = { gte: start, lte: end };
    }

    const programs = await prisma.program.findMany({
      where,
      include: { match: { select: { id: true, homeTeam: true, awayTeam: true, kickoff: true, isLive: true, price: true } } },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ programs });
  } catch (error) {
    return handleApiError(error, "Admin programs fetch error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { channel, title, description, category, startTime, endTime, matchId, blackout } = body;

    if (isNaiveLocalDateTimeString(startTime) || isNaiveLocalDateTimeString(endTime)) {
      return NextResponse.json(
        { error: "startTime/endTime must include timezone (send ISO strings ending in Z or with an offset)" },
        { status: 400 }
      );
    }

    const input = {
      channel: channel || "ZBCTV",
      title,
      description: description || null,
      category: category || "ENTERTAINMENT",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      matchId: matchId || null,
      blackout: blackout ?? false,
    };

    const validationError = validateProgramInput(input);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    try {
      const { programId } = await createProgramSafe(input);

      const program = await prisma.program.findUnique({
        where: { id: programId },
        include: { match: { select: { id: true, homeTeam: true, awayTeam: true } } },
      });

      await invalidateProgramCache();
      try { redisPub.publish("zimcast:epg", JSON.stringify({ type: "epg:update" })); } catch {}
      return NextResponse.json(program, { status: 201 });
    } catch (error) {
      if (error instanceof OverlapError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error, "Admin program create error");
  }
}
