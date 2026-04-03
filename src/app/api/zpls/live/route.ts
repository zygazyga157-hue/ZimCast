import { NextResponse } from "next/server";
import { getLiveMatches } from "@/lib/zpls";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const data = await getLiveMatches();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, "ZPLS live matches error");
  }
}
