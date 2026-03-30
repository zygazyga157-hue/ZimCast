import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { homeTeam, awayTeam, kickoff, price, streamKey } = body;

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
      },
    });

    // Invalidate match cache
    const keys = await redis.keys("matches:*");
    if (keys.length > 0) await redis.del(...keys);

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error("Create match error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
