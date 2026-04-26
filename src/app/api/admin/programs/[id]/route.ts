import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { invalidateProgramCache } from "@/lib/program";
import { isNaiveLocalDateTimeString } from "@/lib/cat-time";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const allowedFields = ["channel", "title", "description", "category", "startTime", "endTime", "isLive", "blackout", "matchId"];
    const data: Record<string, unknown> = {};

    if (body.startTime !== undefined && isNaiveLocalDateTimeString(body.startTime)) {
      return NextResponse.json(
        { error: "startTime must include timezone (send an ISO string ending in Z or with an offset)" },
        { status: 400 }
      );
    }
    if (body.endTime !== undefined && isNaiveLocalDateTimeString(body.endTime)) {
      return NextResponse.json(
        { error: "endTime must include timezone (send an ISO string ending in Z or with an offset)" },
        { status: 400 }
      );
    }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "startTime" || field === "endTime") {
          data[field] = new Date(body[field]);
        } else {
          data[field] = body[field];
        }
      }
    }

    const program = await prisma.program.update({
      where: { id },
      data,
      include: { match: { select: { id: true, homeTeam: true, awayTeam: true } } },
    });

    await invalidateProgramCache();
    return NextResponse.json(program);
  } catch (error) {
    return handleApiError(error, "Admin program update error");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.program.delete({ where: { id } });

    await invalidateProgramCache();
    return NextResponse.json({ message: "Program deleted" });
  } catch (error) {
    return handleApiError(error, "Admin program delete error");
  }
}
