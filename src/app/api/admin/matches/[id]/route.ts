import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

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
      },
    });

    // Invalidate match cache
    const keys = await redis.keys("matches:*");
    if (keys.length > 0) await redis.del(...keys);

    return NextResponse.json(match);
  } catch (error) {
    console.error("Update match error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
