import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateStreamToken } from "@/lib/tokens";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Free ZTV channel — any authenticated user can access
    const token = generateStreamToken(session.user.id, "ztv", 4 * 60 * 60); // 4 hours
    const streamUrl = `${process.env.STREAM_BASE_URL}/ztv/index.m3u8?token=${token}`;

    return NextResponse.json({ token, streamUrl });
  } catch (error) {
    console.error("ZTV token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
