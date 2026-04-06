import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const VALID_CATEGORIES = new Set([
  "NEWS", "SPORTS", "ENTERTAINMENT", "MUSIC", "DOCUMENTARY",
  "GAMING", "TRAVEL", "FOOD", "TECH", "FASHION", "FITNESS", "ART",
]);

export interface ProgramInput {
  channel?: string;
  title: string;
  description?: string | null;
  category?: string;
  startTime: Date;
  endTime: Date;
  matchId?: string | null;
  blackout?: boolean;
}

export interface ProgramCreateResult {
  programId: string;
}

export interface BulkRowError {
  row: number;
  message: string;
}

export interface BulkCreateResult {
  created: number;
  errors: BulkRowError[];
}

/** Validate a single program input. Returns an error message or null. */
export function validateProgramInput(input: ProgramInput): string | null {
  if (!input.title?.trim()) return "title is required";
  if (!input.startTime || isNaN(input.startTime.getTime())) return "invalid startTime";
  if (!input.endTime || isNaN(input.endTime.getTime())) return "invalid endTime";
  if (input.endTime <= input.startTime) return "endTime must be after startTime";
  if (input.category && !VALID_CATEGORIES.has(input.category.toUpperCase())) {
    return `invalid category "${input.category}". Must be one of: ${[...VALID_CATEGORIES].join(", ")}`;
  }
  return null;
}

/**
 * Create a single program inside a serializable transaction.
 * Prevents overlap race conditions by holding a row-level lock on conflicting programs.
 */
export async function createProgramSafe(
  input: ProgramInput,
  excludeId?: string,
): Promise<ProgramCreateResult> {
  const ch = input.channel || "ZBCTV";
  const category = (input.category?.toUpperCase() || "ENTERTAINMENT") as string;

  return prisma.$transaction(async (tx) => {
    // FOR UPDATE locks any overlapping rows, blocking concurrent inserts until this tx commits
    const overlaps = await tx.$queryRawUnsafe<{ id: string; title: string; start_time: Date; end_time: Date }[]>(
      `SELECT id, title, start_time, end_time FROM programs
       WHERE channel = $1
         AND start_time < $2
         AND end_time > $3
         ${excludeId ? `AND id != $4` : ""}
       FOR UPDATE`,
      ...[ch, input.endTime, input.startTime, ...(excludeId ? [excludeId] : [])],
    );

    if (overlaps.length > 0) {
      const o = overlaps[0];
      throw new OverlapError(
        `Time conflict with "${o.title}" (${o.start_time.toISOString()} – ${o.end_time.toISOString()})`,
      );
    }

    const program = await tx.program.create({
      data: {
        channel: ch,
        title: input.title.trim(),
        description: input.description || null,
        category,
        blackout: input.blackout ?? false,
        startTime: input.startTime,
        endTime: input.endTime,
        matchId: input.matchId || null,
      },
    });

    return { programId: program.id };
  }, { isolationLevel: "Serializable" });
}

/**
 * Create multiple programs in a single transaction.
 * Validates all rows first, then inserts. Returns per-row errors.
 */
export async function createProgramsBulk(inputs: ProgramInput[]): Promise<BulkCreateResult> {
  if (inputs.length === 0) return { created: 0, errors: [] };
  if (inputs.length > 200) {
    return { created: 0, errors: [{ row: 0, message: "Maximum 200 programs per batch" }] };
  }

  // Pre-validate all rows
  const errors: BulkRowError[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const err = validateProgramInput(inputs[i]);
    if (err) errors.push({ row: i + 1, message: err });
  }
  if (errors.length > 0) return { created: 0, errors };

  // Check for intra-batch overlaps (same channel, overlapping times)
  for (let i = 0; i < inputs.length; i++) {
    const a = inputs[i];
    const chA = a.channel || "ZBCTV";
    for (let j = i + 1; j < inputs.length; j++) {
      const b = inputs[j];
      const chB = b.channel || "ZBCTV";
      if (chA === chB && a.startTime < b.endTime && a.endTime > b.startTime) {
        errors.push({ row: j + 1, message: `Overlaps with row ${i + 1} ("${a.title}")` });
      }
    }
  }
  if (errors.length > 0) return { created: 0, errors };

  // Insert all in a serializable transaction
  try {
    const created = await prisma.$transaction(async (tx) => {
      let count = 0;

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const ch = input.channel || "ZBCTV";
        const category = (input.category?.toUpperCase() || "ENTERTAINMENT") as string;

        // Check DB overlap with lock
        const overlaps = await tx.$queryRawUnsafe<{ id: string; title: string }[]>(
          `SELECT id, title FROM programs
           WHERE channel = $1 AND start_time < $2 AND end_time > $3
           FOR UPDATE`,
          ch, input.endTime, input.startTime,
        );

        if (overlaps.length > 0) {
          throw new OverlapError(
            `Row ${i + 1}: time conflict with existing "${overlaps[0].title}"`,
          );
        }

        await tx.program.create({
          data: {
            channel: ch,
            title: input.title.trim(),
            description: input.description || null,
            category,
            blackout: input.blackout ?? false,
            startTime: input.startTime,
            endTime: input.endTime,
            matchId: input.matchId || null,
          },
        });
        count++;
      }

      return count;
    }, { isolationLevel: "Serializable" });

    await invalidateProgramCache();
    return { created, errors: [] };
  } catch (error) {
    if (error instanceof OverlapError) {
      return { created: 0, errors: [{ row: 0, message: error.message }] };
    }
    throw error;
  }
}

/** Bust Redis cache for public program endpoints. */
export async function invalidateProgramCache() {
  try {
    const keys = await redis.keys("programs:*");
    if (keys.length > 0) await redis.del(...keys);
    // Also bust EPG summary cache
    await redis.del("epg:summary:ZBCTV");
  } catch {
    // Cache failures are non-fatal
  }
}

export class OverlapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverlapError";
  }
}
