import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStreamToken } from "@/lib/tokens";

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

    // Verify match exists and is live
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

    if (!pass || pass.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "No valid match pass. Please purchase access." },
        { status: 403 }
      );
    }

    // Generate stream token
    const remainingSeconds = Math.max(
      Math.floor((pass.expiresAt.getTime() - Date.now()) / 1000),
      600 // minimum 10 minutes
    );
    const token = generateStreamToken(session.user.id, matchId, remainingSeconds);

    const streamUrl = `${process.env.STREAM_BASE_URL}/${match.streamKey}/index.m3u8?token=${token}`;

    return NextResponse.json({ token, streamUrl });
  } catch (error) {
    console.error("Stream token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
