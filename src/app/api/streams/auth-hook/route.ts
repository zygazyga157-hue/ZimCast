import { NextRequest, NextResponse } from "next/server";
import { verifyStreamToken } from "@/lib/tokens";
import { handleApiError } from "@/lib/errors";

/**
 * MediaMTX external authentication hook.
 * Called by MediaMTX before allowing a client to read a stream.
 * Must return 200 to allow, or non-200 to deny.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, path, query } = body;

    // Allow publish actions (from SRT sources)
    if (action === "publish") {
      return NextResponse.json({ ok: true });
    }

    // For read actions, validate the token
    if (action === "read") {
      const token = query?.token || new URLSearchParams(query).get("token");

      if (!token) {
        return NextResponse.json({ error: "No token" }, { status: 401 });
      }

      const payload = verifyStreamToken(token);
      if (!payload) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }

      // For ZTV, require a token minted for the ZTV path
      if (path === "ztv" && payload.path === "ztv") {
        return NextResponse.json({ ok: true });
      }

      if (path.startsWith("match_")) {
        if (payload.path === path) {
          return NextResponse.json({ ok: true });
        }
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Allow other actions by default
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "Stream auth hook error");
  }
}
