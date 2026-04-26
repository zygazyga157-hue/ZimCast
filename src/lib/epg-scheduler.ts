import { prisma } from "./prisma";
import { redis } from "./redis";
import { redisPub } from "./redis-pubsub";

const CHANNEL = "ZBCTV";
const CACHE_KEY = `epg:summary:${CHANNEL}`;
const CACHE_TTL = 30;

let timer: ReturnType<typeof setTimeout> | null = null;

/** Build the same EPG summary payload the /api/epg/summary route returns. */
async function buildSummary() {
  const now = new Date();
  const include = {
    match: { select: { id: true, homeTeam: true, awayTeam: true } },
  } as const;

  const sportsProgram = await prisma.program.findFirst({
    where: { channel: CHANNEL, blackout: true, startTime: { lte: now }, endTime: { gt: now } },
    include,
    orderBy: { startTime: "asc" },
  });

  let ztvAvailable = true;
  let currentProgram: typeof sportsProgram | null = null;
  let nextProgram: typeof sportsProgram | null = null;
  let resumesAt: string | null = null;
  let blackoutMatch: { id: string; homeTeam: string; awayTeam: string } | null = null;

  if (sportsProgram) {
    ztvAvailable = false;
    currentProgram = sportsProgram;
    blackoutMatch = sportsProgram.match
      ? { id: sportsProgram.match.id, homeTeam: sportsProgram.match.homeTeam, awayTeam: sportsProgram.match.awayTeam }
      : null;

    const nextNonSports = await prisma.program.findFirst({
      where: { channel: CHANNEL, startTime: { gte: sportsProgram.endTime }, blackout: { not: true } },
      include,
      orderBy: { startTime: "asc" },
    });
    nextProgram = nextNonSports ?? null;
    // Blackout ends when the SPORTS coverage window ends, regardless of when the next
    // non-blackout program begins.
    resumesAt = sportsProgram.endTime.toISOString();
  } else {
    currentProgram = await prisma.program.findFirst({
      where: { channel: CHANNEL, startTime: { lte: now }, endTime: { gt: now } },
      include,
      orderBy: { startTime: "asc" },
    });
    nextProgram = await prisma.program.findFirst({
      where: { channel: CHANNEL, startTime: { gt: now } },
      include,
      orderBy: { startTime: "asc" },
    });
  }

  const fmt = (p: typeof currentProgram) =>
    p
      ? {
          id: p.id,
          title: p.title,
          category: p.category,
          startTime: p.startTime.toISOString(),
          endTime: p.endTime.toISOString(),
          match: p.match ? { id: p.match.id, homeTeam: p.match.homeTeam, awayTeam: p.match.awayTeam } : null,
        }
      : null;

  return {
    channel: CHANNEL,
    channelLabel: "ZTV",
    currentProgram: fmt(currentProgram),
    nextProgram: fmt(nextProgram),
    ztvAvailable,
    resumesAt,
    blackoutMatch,
  };
}

/** Schedule next tick at the program boundary (endTime of current, or startTime of next). */
function scheduleNext() {
  if (timer) clearTimeout(timer);

  // Compute delay from whichever program boundary is soonest
  buildSummary()
    .then(async (summary) => {
      // Write cache + publish
      try {
        await redis.set(CACHE_KEY, JSON.stringify(summary), "EX", CACHE_TTL);
      } catch {}
      try {
        redisPub.publish("zimcast:epg", JSON.stringify({ type: "epg:update", data: summary }));
      } catch {}

      // Determine next boundary
      const now = Date.now();
      let nextMs: number | null = null;

      if (summary.currentProgram) {
        const endMs = new Date(summary.currentProgram.endTime).getTime() - now;
        if (endMs > 0) nextMs = endMs;
      }
      if (summary.nextProgram && nextMs === null) {
        const startMs = new Date(summary.nextProgram.startTime).getTime() - now;
        if (startMs > 0) nextMs = startMs;
      }

      // Fallback: if no upcoming boundary, re-check every 60s
      const delayMs = nextMs ?? 60_000;
      // Add 500ms buffer so the boundary has definitely passed
      timer = setTimeout(scheduleNext, delayMs + 500);
      console.log(`[EPG Scheduler] next tick in ${Math.round(delayMs / 1000)}s`);
    })
    .catch((err) => {
      console.error("[EPG Scheduler] error:", err);
      timer = setTimeout(scheduleNext, 30_000);
    });
}

/** Call once at server startup. Fires immediately, then self-schedules. */
export function startEpgScheduler() {
  console.log("[EPG Scheduler] starting");
  scheduleNext();
}

/** Force an immediate re-publish (call after admin creates/deletes programs). */
export function triggerEpgRefresh() {
  scheduleNext();
}
