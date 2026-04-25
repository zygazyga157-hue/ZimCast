import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { handleApiError } from "@/lib/errors";
import { updateMatchProgram } from "@/lib/match-program";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.match.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const match = await prisma.match.update({
      where: { id },
      data: {
        ...(body.homeTeam !== undefined && { homeTeam: body.homeTeam }),
        ...(body.awayTeam !== undefined && { awayTeam: body.awayTeam }),
        ...(body.kickoff !== undefined && { kickoff: new Date(body.kickoff) }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.streamKey !== undefined && { streamKey: body.streamKey }),
        ...(body.isLive !== undefined && { isLive: body.isLive }),
        ...(body.zplsFixtureId !== undefined && { zplsFixtureId: body.zplsFixtureId }),
      },
    });

    // Invalidate match cache
    const keys = await redis.keys("matches:*");
    if (keys.length > 0) await redis.del(...keys);

    // Sync linked program when kickoff or teams change
    let programWarning: string | undefined;
    if (body.kickoff !== undefined || body.homeTeam !== undefined || body.awayTeam !== undefined) {
      const result = await updateMatchProgram(
        match.id,
        match.homeTeam,
        match.awayTeam,
        new Date(match.kickoff),
        "ZBCTV"
      );
      programWarning = result.warning ?? undefined;
    }

    return NextResponse.json({ ...match, programWarning });
  } catch (error) {
    return handleApiError(error, "Update match error");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.match.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    await prisma.match.delete({ where: { id } });

    // Invalidate match cache
    const keys = await redis.keys("matches:*");
    if (keys.length > 0) await redis.del(...keys);

    return NextResponse.json({ message: "Match deleted" });
  } catch (error) {
    return handleApiError(error, "Delete match error");
  }
}
