import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, AppError } from "@/lib/errors";
import { deleteObject, type MediaKind } from "@/lib/media-storage";

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const kind = body?.kind as MediaKind | undefined;

    if (kind !== "avatar" && kind !== "banner") {
      return NextResponse.json(
        { error: "kind must be 'avatar' or 'banner'" },
        { status: 400 },
      );
    }

    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarKey: true, bannerKey: true },
    });

    const keyToDelete = kind === "avatar" ? current?.avatarKey : current?.bannerKey;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(kind === "avatar"
          ? { avatarKey: null, avatarUrl: null }
          : { bannerKey: null }),
      },
      select: { id: true },
    });

    if (keyToDelete) {
      void deleteObject(keyToDelete);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    return handleApiError(error, "Media delete error");
  }
}

