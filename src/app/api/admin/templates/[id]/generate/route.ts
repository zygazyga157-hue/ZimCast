import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { createProgramsBulk, invalidateProgramCache, type ProgramInput } from "@/lib/program";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required (YYYY-MM-DD)" }, { status: 400 });
    }

    const start = new Date(startDate + "T00:00:00+02:00"); // CAT timezone
    const end = new Date(endDate + "T00:00:00+02:00");

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
    }
    if (end < start) {
      return NextResponse.json({ error: "endDate must be on or after startDate" }, { status: 400 });
    }

    // Max 60 days to prevent abuse
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 60) {
      return NextResponse.json({ error: "Maximum date range is 60 days" }, { status: 400 });
    }

    const template = await prisma.programTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (!template.isActive) {
      return NextResponse.json({ error: "Template is inactive" }, { status: 400 });
    }

    const daysSet = new Set(template.daysOfWeek);
    const programs: ProgramInput[] = [];

    // Iterate day by day
    const cursor = new Date(start);
    while (cursor <= end) {
      const dayOfWeek = cursor.getDay(); // 0=Sun

      if (daysSet.has(dayOfWeek)) {
        const progStart = new Date(cursor);
        progStart.setHours(template.startHour, template.startMinute, 0, 0);

        const progEnd = new Date(progStart.getTime() + template.durationMin * 60 * 1000);

        programs.push({
          channel: template.channel,
          title: template.title,
          description: template.description,
          category: template.category,
          blackout: template.blackout,
          startTime: progStart,
          endTime: progEnd,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    if (programs.length === 0) {
      return NextResponse.json({
        created: 0,
        errors: [],
        message: "No matching days in the selected date range",
      });
    }

    const result = await createProgramsBulk(programs);

    if (result.created > 0) {
      await invalidateProgramCache();
    }

    const status = result.errors.length > 0 ? 422 : 201;
    return NextResponse.json(result, { status });
  } catch (error) {
    return handleApiError(error, "Generate from template error");
  }
}
