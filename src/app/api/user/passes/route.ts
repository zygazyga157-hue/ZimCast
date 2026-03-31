import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const passes = await prisma.matchPass.findMany({
      where: { userId: session.user.id },
      include: {
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            kickoff: true,
            isLive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(passes);
  } catch (error) {
    return handleApiError(error, "Passes fetch error");
  }
}
