import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { generateAvatar } from "@/lib/avatar";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        city: true,
        country: true,
        avatarUrl: true,
        emailVerified: true,
        interests: true,
        language: true,
        notificationPrefs: true,
        lastLoginAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error, "Profile fetch error");
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const allowedFields = [
      "name", "phone", "dateOfBirth", "gender", "city", "country",
      "interests", "language", "notificationPrefs",
    ];
    const data: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "dateOfBirth") {
          data[field] = body[field] ? new Date(body[field]) : null;
        } else if (field === "interests") {
          data[field] = Array.isArray(body[field]) ? body[field] : [];
        } else {
          data[field] = body[field];
        }
      }
    }

    // Regenerate avatar when name or interests change
    if (data.name !== undefined || data.interests !== undefined) {
      const current = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, interests: true },
      });
      const avatarName = (data.name as string | undefined) ?? current?.name;
      const avatarInterests = (data.interests as string[] | undefined) ?? current?.interests ?? [];
      const { dataUrl } = generateAvatar({
        name: avatarName,
        email: current?.email,
        interests: avatarInterests,
      });
      data.avatarUrl = dataUrl;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        city: true,
        country: true,
        avatarUrl: true,
        interests: true,
        language: true,
        notificationPrefs: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error, "Profile update error");
  }
}
