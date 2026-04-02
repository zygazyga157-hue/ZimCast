import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStreamToken } from "@/lib/tokens";
import { computePassWindow } from "@/lib/match-window";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: "matchId is required" },
        { status: 400 }
      );
    }

    // Verify match exists
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Check user has a valid match pass
    const pass = await prisma.matchPass.findUnique({
      where: {
        userId_matchId: {
          userId: session.user.id,
          matchId,
        },
      },
    });

    if (!pass) {
      return NextResponse.json(
        { error: "No valid match pass. Please purchase access." },
        { status: 403 }
      );
    }

    // Compute pass window from kickoff + linked SPORTS program
    const linkedProgram = await prisma.program.findFirst({
      where: { matchId, category: "SPORTS" },
      select: { endTime: true },
      orderBy: { startTime: "asc" },
    });
    const { passStart, passEnd } = computePassWindow(
      match.kickoff,
      linkedProgram?.endTime ?? null
    );

    const now = Date.now();

    // Enforce time window
    if (now < passStart.getTime()) {
      return NextResponse.json(
        {
          error: `Stream starts at ${passStart.toISOString()}`,
          passStart: passStart.toISOString(),
        },
        { status: 409 }
      );
    }

    if (now >= passEnd.getTime()) {
      return NextResponse.json(
        { error: "Pass expired" },
        { status: 403 }
      );
    }

    // Token TTL = remaining seconds in window (never exceeds passEnd)
    const remainingSeconds = Math.max(
      Math.floor((passEnd.getTime() - now) / 1000),
      1
    );
    const token = generateStreamToken(session.user.id, match.streamKey, remainingSeconds);

    const streamBaseUrl =
      process.env.NEXT_PUBLIC_STREAM_BASE_URL ?? process.env.STREAM_BASE_URL;
    if (!streamBaseUrl) {
      return NextResponse.json(
        { error: "Stream base URL is not configured" },
        { status: 500 }
      );
    }

    const streamUrl = `${streamBaseUrl}/${match.streamKey}/index.m3u8?token=${token}`;

    return NextResponse.json({
      token,
      streamUrl,
      passEnd: passEnd.toISOString(),
      expiresInSeconds: remainingSeconds,
    });
  } catch (error) {
    return handleApiError(error, "Stream token error");
  }
}
