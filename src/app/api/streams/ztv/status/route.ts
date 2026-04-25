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
        category: "SPORTS",
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
      return NextResponse.json({
        available: false,
        currentProgram: sportsProgram,
        blackoutMatch: sportsProgram.match,
        // Blackout ends when the SPORTS coverage window ends (not when the next
        // non-blackout program begins, which could be many hours later).
        resumesAt: sportsProgram.endTime.toISOString(),
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
