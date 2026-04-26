import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { handleApiError } from "@/lib/errors";

/**
 * Real-time viewer counter backed by Redis sorted sets.
 *
 * Each viewer sends a heartbeat every ~15 seconds. The sorted set
 * `viewers:{channel}` stores `userId` as member and the heartbeat
 * timestamp as score. Stale entries (>30 s) are pruned on every read
 * so the count stays accurate even if a client disconnects without
 * sending a leave request.
 */

const STALE_THRESHOLD_S = 30; // seconds before a viewer is considered gone
const VIEWER_KEY_PREFIX = "viewers:";

function viewerKey(channel: string): string {
  return `${VIEWER_KEY_PREFIX}${channel}`;
}

/** POST — Heartbeat: register or refresh a viewer session. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const channel: string | undefined = body.channel;

    if (!channel || typeof channel !== "string") {
      return NextResponse.json(
        { error: "channel is required" },
        { status: 400 },
      );
    }

    // Sanitize channel name — alphanumeric, underscores, hyphens only
    if (!/^[a-zA-Z0-9_-]+$/.test(channel)) {
      return NextResponse.json(
        { error: "Invalid channel name" },
        { status: 400 },
      );
    }

    const now = Date.now();
    const key = viewerKey(channel);

    let count = 0;
    try {
      // ZADD with current timestamp as score
      await redis.zadd(key, now, session.user.id);
      // Set TTL on the key so it auto-cleans if no viewers heartbeat
      await redis.expire(key, STALE_THRESHOLD_S * 3);

      // Prune stale entries
      const cutoff = now - STALE_THRESHOLD_S * 1000;
      await redis.zremrangebyscore(key, "-inf", cutoff);

      // Return current count
      count = await redis.zcard(key);
    } catch {
      // Redis may be misconfigured/down (e.g. NOAUTH). Viewer counter is best-effort.
      count = 0;
    }

    return NextResponse.json({ channel, viewers: count });
  } catch (error) {
    return handleApiError(error, "Viewer heartbeat error");
  }
}

/** GET — Fetch current viewer count for a channel. */
export async function GET(req: NextRequest) {
  try {
    const channel = req.nextUrl.searchParams.get("channel");

    if (!channel) {
      return NextResponse.json(
        { error: "channel query param is required" },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(channel)) {
      return NextResponse.json(
        { error: "Invalid channel name" },
        { status: 400 },
      );
    }

    const key = viewerKey(channel);
    const now = Date.now();

    let count = 0;
    try {
      // Prune stale entries before counting
      const cutoff = now - STALE_THRESHOLD_S * 1000;
      await redis.zremrangebyscore(key, "-inf", cutoff);
      count = await redis.zcard(key);
    } catch {
      count = 0;
    }

    return NextResponse.json({ channel, viewers: count });
  } catch (error) {
    return handleApiError(error, "Viewer count error");
  }
}

/** DELETE — Explicit leave: remove viewer from the set. */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const channel: string | undefined = body.channel;

    if (!channel || typeof channel !== "string") {
      return NextResponse.json(
        { error: "channel is required" },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(channel)) {
      return NextResponse.json(
        { error: "Invalid channel name" },
        { status: 400 },
      );
    }

    const key = viewerKey(channel);
    let count = 0;
    try {
      await redis.zrem(key, session.user.id);
      count = await redis.zcard(key);
    } catch {
      count = 0;
    }

    return NextResponse.json({ channel, viewers: count });
  } catch (error) {
    return handleApiError(error, "Viewer leave error");
  }
}
