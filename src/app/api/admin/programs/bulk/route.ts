import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { createProgramsBulk, type ProgramInput } from "@/lib/program";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { programs } = body;

    if (!Array.isArray(programs) || programs.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty 'programs' array" },
        { status: 400 },
      );
    }

    const inputs: ProgramInput[] = programs.map((p: Record<string, unknown>) => ({
      channel: (p.channel as string) || "ZBCTV",
      title: p.title as string,
      description: (p.description as string) || null,
      category: (p.category as string) || "ENTERTAINMENT",
      startTime: new Date(p.startTime as string),
      endTime: new Date(p.endTime as string),
      matchId: (p.matchId as string) || null,
      blackout: (p.blackout as boolean) ?? false,
    }));

    const result = await createProgramsBulk(inputs);

    const status = result.errors.length > 0 ? 422 : 201;
    return NextResponse.json(result, { status });
  } catch (error) {
    return handleApiError(error, "Bulk program create error");
  }
}
