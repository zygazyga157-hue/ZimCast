import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { ProgramCategory } from "@prisma/client";

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
  const category = (input.category?.toUpperCase() || "ENTERTAINMENT") as ProgramCategory;

  return prisma.$transaction(async (tx) => {
    // Serializable isolation detects concurrent overlap conflicts automatically.
    // An explicit findFirst here surfaces the conflict with a friendly error message.
    const overlap = await tx.program.findFirst({
      where: {
        channel: ch,
        startTime: { lt: input.endTime },
        endTime: { gt: input.startTime },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, title: true, startTime: true, endTime: true },
    });

    if (overlap) {
      throw new OverlapError(
        `Time conflict with "${overlap.title}" (${overlap.startTime.toISOString()} – ${overlap.endTime.toISOString()})`,
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
        const category = (input.category?.toUpperCase() || "ENTERTAINMENT") as ProgramCategory;

        // Check DB overlap — serializable isolation throws on concurrent conflict
        const overlap = await tx.program.findFirst({
          where: {
            channel: ch,
            startTime: { lt: input.endTime },
            endTime: { gt: input.startTime },
          },
          select: { id: true, title: true },
        });

        if (overlap) {
          throw new OverlapError(
            `Row ${i + 1}: time conflict with existing "${overlap.title}"`,
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
