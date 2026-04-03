import { prisma } from "@/lib/prisma";

const PREGAME_BUFFER_MS = 15 * 60 * 1000;
const COVERAGE_DURATION_MS = 210 * 60 * 1000; // 15m pregame + 150m match + 60m postgame

interface AutoProgramResult {
  programId: string | null;
  warning: string | null;
}

/**
 * Auto-create a SPORTS program linked to a match.
 * Coverage window: kickoff - 15m → kickoff + 210m (3.5h total).
 * Returns null programId + warning string if there's a channel overlap.
 */
export async function createMatchProgram(
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  kickoff: Date,
  channel = "ZBCTV",
): Promise<AutoProgramResult> {
  const startTime = new Date(kickoff.getTime() - PREGAME_BUFFER_MS);
  const endTime = new Date(kickoff.getTime() + COVERAGE_DURATION_MS - PREGAME_BUFFER_MS);

  // Check for channel overlap
  const overlap = await prisma.program.findFirst({
    where: {
      channel,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: { id: true, title: true, startTime: true, endTime: true },
  });

  if (overlap) {
    return {
      programId: null,
      warning: `Program overlap with "${overlap.title}" (${overlap.startTime.toISOString()} – ${overlap.endTime.toISOString()}). Create the SPORTS program manually.`,
    };
  }

  const program = await prisma.program.create({
    data: {
      channel,
      title: `${homeTeam} vs ${awayTeam}`,
      category: "SPORTS",
      startTime,
      endTime,
      matchId,
    },
  });

  return { programId: program.id, warning: null };
}

/**
 * Update the linked SPORTS program when a match's kickoff changes.
 * If no linked program exists, creates one.
 */
export async function updateMatchProgram(
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  newKickoff: Date,
  channel = "ZBCTV",
): Promise<AutoProgramResult> {
  const startTime = new Date(newKickoff.getTime() - PREGAME_BUFFER_MS);
  const endTime = new Date(newKickoff.getTime() + COVERAGE_DURATION_MS - PREGAME_BUFFER_MS);

  // Find existing linked SPORTS program
  const existing = await prisma.program.findFirst({
    where: { matchId, category: "SPORTS" },
    select: { id: true },
  });

  if (existing) {
    // Check for overlap (excluding this program)
    const overlap = await prisma.program.findFirst({
      where: {
        channel,
        id: { not: existing.id },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true, title: true, startTime: true, endTime: true },
    });

    if (overlap) {
      return {
        programId: existing.id,
        warning: `Could not update program times — overlap with "${overlap.title}". Update the SPORTS program manually.`,
      };
    }

    await prisma.program.update({
      where: { id: existing.id },
      data: {
        title: `${homeTeam} vs ${awayTeam}`,
        startTime,
        endTime,
      },
    });

    return { programId: existing.id, warning: null };
  }

  // No existing program — create one
  return createMatchProgram(matchId, homeTeam, awayTeam, newKickoff, channel);
}
