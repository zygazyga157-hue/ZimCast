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

    const activity = await prisma.viewingActivity.create({
      data: {
        userId: session.user.id,
        programId: programId || null,
        matchId: matchId || null,
        action: action || "WATCH",
        watchDuration: watchDuration || 0,
        sessionStart: sessionStart ? new Date(sessionStart) : new Date(),
        sessionEnd: new Date(),
      },
    });

    return NextResponse.json({ id: activity.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Activity tracking error");
  }
}
