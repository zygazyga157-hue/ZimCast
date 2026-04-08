import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, AppError } from "@/lib/errors";
import {
  deleteObject,
  headObject,
  isAllowedImageContentType,
  publicUrlForKey,
  type MediaKind,
} from "@/lib/media-storage";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_BANNER_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const kind = body?.kind as MediaKind | undefined;
    const key = body?.key as string | undefined;

    if (kind !== "avatar" && kind !== "banner") {
      return NextResponse.json(
        { error: "kind must be 'avatar' or 'banner'" },
        { status: 400 },
      );
    }

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const requiredPrefix = `user-media/${session.user.id}/${kind}/`;
    if (!key.startsWith(requiredPrefix)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const head = await headObject(key);
    if (!head.contentType || !isAllowedImageContentType(head.contentType)) {
      return NextResponse.json(
        { error: "Uploaded file has an invalid content type" },
        { status: 400 },
      );
    }

    const maxBytes = kind === "avatar" ? MAX_AVATAR_BYTES : MAX_BANNER_BYTES;
    if (head.contentLength != null && head.contentLength > maxBytes) {
      return NextResponse.json(
        { error: "Uploaded file is too large" },
        { status: 413 },
      );
    }

    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarKey: true, bannerKey: true },
    });

    const previousKey = kind === "avatar" ? current?.avatarKey : current?.bannerKey;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(kind === "avatar" ? { avatarKey: key, avatarUrl: null } : { bannerKey: key }),
      },
      select: { avatarKey: true, bannerKey: true },
    });

    // Best-effort cleanup of old objects
    if (previousKey && previousKey !== key) {
      void deleteObject(previousKey);
    }

    return NextResponse.json({
      avatarUrl: publicUrlForKey(user.avatarKey),
      bannerUrl: publicUrlForKey(user.bannerKey),
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    return handleApiError(error, "Media commit error");
  }
}

