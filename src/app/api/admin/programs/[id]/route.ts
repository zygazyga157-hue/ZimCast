import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

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

    return NextResponse.json({ message: "Program deleted" });
  } catch (error) {
    return handleApiError(error, "Admin program delete error");
  }
}
