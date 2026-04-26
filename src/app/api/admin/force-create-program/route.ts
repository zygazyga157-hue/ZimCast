import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { invalidateProgramCache, OverlapError } from "@/lib/program";
import { redisPub } from "@/lib/redis-pubsub";

function computeMatchWindow(kickoff: Date) {
  const start = new Date(kickoff.getTime() - 15 * 60 * 1000);
  const end = new Date(kickoff.getTime() + 210 * 60 * 1000);
  return { start, end };
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const matchId = req.nextUrl.searchParams.get("matchId");
    if (!matchId) return NextResponse.json({ error: "matchId is required" }, { status: 400 });

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, homeTeam: true, awayTeam: true, kickoff: true },
    });
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const { start, end } = computeMatchWindow(match.kickoff);

    const conflicts = await prisma.program.findMany({
      where: {
        channel: "ZBCTV",
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: {
        id: true,
        title: true,
        category: true,
        blackout: true,
        matchId: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({
      match: {
        id: match.id,
        title: `${match.homeTeam} vs ${match.awayTeam}`,
        kickoff: match.kickoff.toISOString(),
      },
      window: { start: start.toISOString(), end: end.toISOString() },
      conflicts: conflicts.map((p) => ({
        ...p,
        startTime: p.startTime.toISOString(),
        endTime: p.endTime.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error, "List scheduling conflicts error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const matchId: string | undefined = body.matchId;
    const action: "delete" | "shift" | undefined = body.action;
    const shiftForwardMs: number = typeof body.shiftForwardMs === "number" ? body.shiftForwardMs : 3_600_000;

    if (!matchId || (action !== "delete" && action !== "shift")) {
      return NextResponse.json({ error: "matchId and action ('delete'|'shift') are required" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, homeTeam: true, awayTeam: true, kickoff: true },
    });
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const { start, end } = computeMatchWindow(match.kickoff);

    // If the program already exists, just return it.
    const existingSports = await prisma.program.findFirst({
      where: { matchId, category: "SPORTS" },
      select: { id: true },
    });
    if (existingSports) {
      return NextResponse.json({ programId: existingSports.id, message: "SPORTS program already exists." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const conflicts = await tx.program.findMany({
        where: {
          channel: "ZBCTV",
          startTime: { lt: end },
          endTime: { gt: start },
        },
        select: {
          id: true,
          title: true,
          category: true,
          blackout: true,
          matchId: true,
          startTime: true,
          endTime: true,
        },
        orderBy: { startTime: "asc" },
      });

      // Safety guard: only auto-modify non-blackout, non-match-linked programs.
      const protectedConflicts = conflicts.filter((p) => p.blackout || p.matchId);
      if (protectedConflicts.length > 0) {
        return {
          ok: false as const,
          error: "Conflicts include blackout or match-linked programs; resolve manually.",
          protectedConflicts,
          conflicts,
        };
      }

      const conflictIds = conflicts.map((c) => c.id);

      if (conflictIds.length > 0) {
        if (action === "delete") {
          await tx.program.deleteMany({ where: { id: { in: conflictIds } } });
        } else {
          // Shift each conflicting program forward and ensure it doesn't overlap anything else.
          for (const p of conflicts) {
            const newStart = new Date(p.startTime.getTime() + shiftForwardMs);
            const newEnd = new Date(p.endTime.getTime() + shiftForwardMs);

            const overlap = await tx.program.findFirst({
              where: {
                channel: "ZBCTV",
                id: { notIn: conflictIds },
                startTime: { lt: newEnd },
                endTime: { gt: newStart },
              },
              select: { id: true, title: true },
            });
            if (overlap) {
              throw new OverlapError(`Shift would overlap with "${overlap.title}"`);
            }

            await tx.program.update({
              where: { id: p.id },
              data: { startTime: newStart, endTime: newEnd },
            });
          }
        }
      }

      // Create blackout SPORTS program for the match window.
      const overlapAfter = await tx.program.findFirst({
        where: {
          channel: "ZBCTV",
          startTime: { lt: end },
          endTime: { gt: start },
        },
        select: { id: true, title: true },
      });
      if (overlapAfter) {
        throw new OverlapError(`Still overlapping "${overlapAfter.title}" after conflict resolution`);
      }

      const program = await tx.program.create({
        data: {
          channel: "ZBCTV",
          title: `${match.homeTeam} vs ${match.awayTeam}`,
          category: "SPORTS",
          blackout: true,
          startTime: start,
          endTime: end,
          matchId,
        },
        select: { id: true },
      });

      return { ok: true as const, programId: program.id, conflictsResolved: conflicts.length };
    }, { isolationLevel: "Serializable" });

    if ("ok" in result && result.ok === false) {
      return NextResponse.json(
        {
          error: result.error,
          protectedConflicts: result.protectedConflicts.map((p) => ({
            ...p,
            startTime: p.startTime.toISOString(),
            endTime: p.endTime.toISOString(),
          })),
          conflicts: result.conflicts.map((p) => ({
            ...p,
            startTime: p.startTime.toISOString(),
            endTime: p.endTime.toISOString(),
          })),
        },
        { status: 409 },
      );
    }

    await invalidateProgramCache();
    try {
      redisPub.publish("zimcast:epg", JSON.stringify({ type: "epg:update" }));
    } catch {}

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OverlapError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return handleApiError(error, "Force-create SPORTS program error");
  }
}

