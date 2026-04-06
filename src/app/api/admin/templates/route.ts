import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

const VALID_CATEGORIES = new Set([
  "NEWS", "SPORTS", "ENTERTAINMENT", "MUSIC", "DOCUMENTARY",
  "GAMING", "TRAVEL", "FOOD", "TECH", "FASHION", "FITNESS", "ART",
]);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const templates = await prisma.programTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { startHour: "asc" }, { startMinute: "asc" }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return handleApiError(error, "List templates error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, channel, title, description, category, blackout, startHour, startMinute, durationMin, daysOfWeek } = body;

    if (!name?.trim() || !title?.trim()) {
      return NextResponse.json({ error: "name and title are required" }, { status: 400 });
    }
    if (startHour == null || startHour < 0 || startHour > 23) {
      return NextResponse.json({ error: "startHour must be 0-23" }, { status: 400 });
    }
    if (startMinute != null && (startMinute < 0 || startMinute > 59)) {
      return NextResponse.json({ error: "startMinute must be 0-59" }, { status: 400 });
    }
    if (!durationMin || durationMin < 1 || durationMin > 1440) {
      return NextResponse.json({ error: "durationMin must be 1-1440" }, { status: 400 });
    }
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0 || daysOfWeek.some((d: number) => d < 0 || d > 6)) {
      return NextResponse.json({ error: "daysOfWeek must be an array of 0-6 (Sun-Sat)" }, { status: 400 });
    }
    if (category && !VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${[...VALID_CATEGORIES].join(", ")}` }, { status: 400 });
    }

    const template = await prisma.programTemplate.create({
      data: {
        name: name.trim(),
        channel: channel?.trim() || "ZBCTV",
        title: title.trim(),
        description: description || null,
        category: category || "ENTERTAINMENT",
        blackout: blackout ?? false,
        startHour: Number(startHour),
        startMinute: Number(startMinute ?? 0),
        durationMin: Number(durationMin),
        daysOfWeek: daysOfWeek.map(Number),
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Create template error");
  }
}
