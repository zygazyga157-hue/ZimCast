import { NextRequest, NextResponse } from "next/server";
import { getFixtures } from "@/lib/zpls";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
    const data = await getFixtures(page);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, "ZPLS fixtures error");
  }
}
