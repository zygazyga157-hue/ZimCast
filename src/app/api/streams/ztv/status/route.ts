import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const now = new Date();

    // Check if there's a program with blackout active
    const sportsProgram = await prisma.program.findFirst({
      where: {
        blackout: true,
        startTime: { lte: now },
        endTime: { gt: now },
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
    });

    if (sportsProgram) {
      // Find next non-blackout program to determine when Live TV resumes
      const nextNonSports = await prisma.program.findFirst({
        where: {
          startTime: { gte: sportsProgram.endTime },
          blackout: { not: true },
        },
        orderBy: { startTime: "asc" },
      });

      return NextResponse.json({
        available: false,
        currentProgram: sportsProgram,
        blackoutMatch: sportsProgram.match,
        resumesAt: nextNonSports?.startTime?.toISOString() ?? sportsProgram.endTime.toISOString(),
      });
    }

    // No sports blackout — live TV is available
    const currentProgram = await prisma.program.findFirst({
      where: {
        startTime: { lte: now },
        endTime: { gt: now },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({
      available: true,
      currentProgram: currentProgram ?? null,
      blackoutMatch: null,
      resumesAt: null,
    });
  } catch (error) {
    return handleApiError(error, "ZTV status check error");
  }
}
