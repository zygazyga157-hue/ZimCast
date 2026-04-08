import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApiError, AppError } from "@/lib/errors";
import {
  buildUserMediaKey,
  isAllowedImageContentType,
  presignPutObject,
  type MediaKind,
} from "@/lib/media-storage";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const kind = body?.kind as MediaKind | undefined;
    const contentType = body?.contentType as unknown;

    if (kind !== "avatar" && kind !== "banner") {
      return NextResponse.json(
        { error: "kind must be 'avatar' or 'banner'" },
        { status: 400 },
      );
    }

    if (!isAllowedImageContentType(contentType)) {
      return NextResponse.json(
        { error: "Unsupported contentType" },
        { status: 400 },
      );
    }

    const key = buildUserMediaKey({
      userId: session.user.id,
      kind,
      contentType,
    });

    const { uploadUrl, publicUrl } = await presignPutObject({
      key,
      contentType,
      expiresSeconds: 5 * 60,
    });

    return NextResponse.json({ key, uploadUrl, publicUrl });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    return handleApiError(error, "Media presign error");
  }
}

