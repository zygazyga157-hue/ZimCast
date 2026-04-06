import { prisma } from "@/lib/prisma";
import { createProgramSafe, OverlapError, invalidateProgramCache } from "@/lib/program";

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

  try {
    const { programId } = await createProgramSafe({
      channel,
      title: `${homeTeam} vs ${awayTeam}`,
      category: "SPORTS",
      blackout: true,
      startTime,
      endTime,
      matchId,
    });

    await invalidateProgramCache();
    return { programId, warning: null };
  } catch (error) {
    if (error instanceof OverlapError) {
      return {
        programId: null,
        warning: `${error.message}. Create the SPORTS program manually.`,
      };
    }
    throw error;
  }
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
    // Use a serializable transaction for overlap check + update
    try {
      await prisma.$transaction(async (tx) => {
        const overlaps = await tx.$queryRawUnsafe<{ id: string; title: string }[]>(
          `SELECT id, title FROM programs
           WHERE channel = $1 AND id != $2 AND start_time < $3 AND end_time > $4
           FOR UPDATE`,
          channel, existing.id, endTime, startTime,
        );

        if (overlaps.length > 0) {
          throw new OverlapError(
            `Could not update program times — overlap with "${overlaps[0].title}"`,
          );
        }

        await tx.program.update({
          where: { id: existing.id },
          data: {
            title: `${homeTeam} vs ${awayTeam}`,
            startTime,
            endTime,
          },
        });
      }, { isolationLevel: "Serializable" });

      await invalidateProgramCache();
      return { programId: existing.id, warning: null };
    } catch (error) {
      if (error instanceof OverlapError) {
        return {
          programId: existing.id,
          warning: `${error.message}. Update the SPORTS program manually.`,
        };
      }
      throw error;
    }
  }

  // No existing program — create one
  return createMatchProgram(matchId, homeTeam, awayTeam, newKickoff, channel);
}
