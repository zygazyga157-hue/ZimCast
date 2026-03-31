import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date");
    const now = new Date();

    const targetDate = dateParam ? new Date(dateParam) : now;
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const programs = await prisma.program.findMany({
      where: {
        startTime: { lte: dayEnd },
        endTime: { gte: dayStart },
      },
      include: {
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            kickoff: true,
            isLive: true,
            price: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const currentProgram = programs.find(
      (p) => new Date(p.startTime) <= now && new Date(p.endTime) > now
    ) ?? null;

    const nextProgram = programs.find(
      (p) => new Date(p.startTime) > now
    ) ?? null;

    return NextResponse.json({
      programs,
      currentProgram,
      nextProgram,
    });
  } catch (error) {
    return handleApiError(error, "Programs fetch error");
  }
}
