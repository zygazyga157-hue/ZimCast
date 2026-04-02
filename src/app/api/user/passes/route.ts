import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePassWindow, getPassState } from "@/lib/match-window";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const passes = await prisma.matchPass.findMany({
      where: { userId: session.user.id },
      include: {
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            kickoff: true,
            isLive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Load linked SPORTS programs for each match in one query
    const matchIds = [...new Set(passes.map((p) => p.matchId))];
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

    const enriched = passes.map((p) => {
      const programEnd = programEndByMatch.get(p.matchId) ?? null;
      const { passStart, passEnd, phase } = computePassWindow(
        p.match.kickoff,
        programEnd
      );
      const passState = getPassState(true, passStart, passEnd);
      return {
        ...p,
        passStart: passStart.toISOString(),
        passEnd: passEnd.toISOString(),
        passState,
        phase,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return handleApiError(error, "Passes fetch error");
  }
}
