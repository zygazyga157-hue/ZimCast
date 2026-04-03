import { NextResponse } from "next/server";
import { getStandings } from "@/lib/zpls";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const data = await getStandings();
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, "ZPLS standings error");
  }
}
