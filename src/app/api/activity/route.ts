import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { programId, matchId, action, watchDuration, sessionStart } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // Validate duration: must be a positive integer, at least 5 seconds
    const duration = typeof watchDuration === "number" ? Math.max(0, Math.round(watchDuration)) : 0;
    if (duration < 5) {
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
    }

    // Require at least one content reference to avoid orphan records
    if (!programId && !matchId) {
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
    }

    const activity = await prisma.viewingActivity.create({
      data: {
        userId: session.user.id,
        programId: programId || null,
        matchId: matchId || null,
        action: action || "WATCH",
        watchDuration: duration,
        sessionStart: sessionStart ? new Date(sessionStart) : new Date(),
        sessionEnd: new Date(),
      },
    });

    return NextResponse.json({ id: activity.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Activity tracking error");
  }
}
