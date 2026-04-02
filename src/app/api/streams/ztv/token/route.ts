import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateStreamToken } from "@/lib/tokens";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Free ZTV channel — any authenticated user can access
    const token = generateStreamToken(session.user.id, "ztv", 4 * 60 * 60); // 4 hours

    const streamBaseUrl =
      process.env.NEXT_PUBLIC_STREAM_BASE_URL ?? process.env.STREAM_BASE_URL;
    if (!streamBaseUrl) {
      return NextResponse.json(
        { error: "Stream base URL is not configured" },
        { status: 500 }
      );
    }

    const streamUrl = `${streamBaseUrl}/ztv/index.m3u8?token=${token}`;

    return NextResponse.json({ token, streamUrl });
  } catch (error) {
    return handleApiError(error, "ZTV token error");
  }
}
