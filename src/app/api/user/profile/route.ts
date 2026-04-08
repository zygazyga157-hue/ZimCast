import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { publicUrlForKey } from "@/lib/media-storage";

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
        avatarKey: true,
        bannerKey: true,
        emailVerified: true,
        interests: true,
        language: true,
        notificationPrefs: true,
        lastLoginAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      avatarUrl: publicUrlForKey(user.avatarKey),
      bannerUrl: publicUrlForKey(user.bannerKey),
      avatarKey: undefined,
      bannerKey: undefined,
    });
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
        avatarKey: true,
        bannerKey: true,
        interests: true,
        language: true,
        notificationPrefs: true,
      },
    });

    return NextResponse.json({
      ...user,
      avatarUrl: publicUrlForKey(user.avatarKey),
      bannerUrl: publicUrlForKey(user.bannerKey),
      avatarKey: undefined,
      bannerKey: undefined,
    });
  } catch (error) {
    return handleApiError(error, "Profile update error");
  }
}
