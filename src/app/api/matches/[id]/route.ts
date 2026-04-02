import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computePassWindow } from "@/lib/match-window";
import { handleApiError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const match = await prisma.match.findUnique({
      where: { id },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        kickoff: true,
        price: true,
        isLive: true,
        streamKey: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Compute pass window from linked SPORTS program
    const linkedProgram = await prisma.program.findFirst({
      where: { matchId: id, category: "SPORTS" },
      select: { endTime: true },
      orderBy: { startTime: "asc" },
    });

    const { passStart, passEnd, phase, phaseEndsAt } = computePassWindow(
      match.kickoff,
      linkedProgram?.endTime ?? null
    );

    return NextResponse.json({
      ...match,
      passStart: passStart.toISOString(),
      passEnd: passEnd.toISOString(),
      phase,
      phaseEndsAt: phaseEndsAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, "Match detail error");
  }
}
