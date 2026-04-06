import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const date = req.nextUrl.searchParams.get("date");
    const where: Record<string, unknown> = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
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
    const { channel, title, description, category, startTime, endTime, matchId } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "title, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 }
      );
    }

    // Check for time overlap on the same channel
    const ch = channel || "ZBCTV";
    const overlap = await prisma.program.findFirst({
      where: {
        channel: ch,
        OR: [
          { startTime: { lt: end }, endTime: { gt: start } },
        ],
      },
    });

    if (overlap) {
      return NextResponse.json(
        { error: `Time conflict with "${overlap.title}" (${overlap.startTime.toISOString()} - ${overlap.endTime.toISOString()})` },
        { status: 409 }
      );
    }

    const program = await prisma.program.create({
      data: {
        channel: ch,
        title,
        description: description || null,
        category: category || "ENTERTAINMENT",
        startTime: start,
        endTime: end,
        matchId: matchId || null,
      },
      include: { match: { select: { id: true, homeTeam: true, awayTeam: true } } },
    });

    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Admin program create error");
  }
}
