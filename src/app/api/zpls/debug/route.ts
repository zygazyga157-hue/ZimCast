import { NextResponse } from "next/server";

const BASE_URL = "https://livescore-api.com/api-client";

async function probe(label: string, url: string) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* keep raw text */ }
    return {
      label,
      httpStatus: res.status,
      httpStatusText: res.statusText,
      ms: Date.now() - start,
      body,
    };
  } catch (err: unknown) {
    return {
      label,
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - start,
    };
  }
}

export async function GET() {
  const key = process.env.LIVESCORE_API_KEY ?? "";
  const secret = process.env.LIVESCORE_API_SECRET ?? "";

  const results = await Promise.all([
    // 1. Competitions list — no competition_id, validates credentials only
    probe(
      "competitions/list (no competition_id)",
      `${BASE_URL}/competitions/list.json?key=${key}&secret=${secret}`,
    ),
    // 2. Fixtures with competition_id=85
    probe(
      "fixtures/list competition_id=85",
      `${BASE_URL}/fixtures/list.json?key=${key}&secret=${secret}&competition_id=85&page=1`,
    ),
    // 3. Live scores with competition_id=85
    probe(
      "scores/live competition_id=85",
      `${BASE_URL}/scores/live.json?key=${key}&secret=${secret}&competition_id=85`,
    ),
    // 4. standings with competition_id=85
    probe(
      "leagues/table competition_id=85",
      `${BASE_URL}/leagues/table.json?key=${key}&secret=${secret}&competition_id=85`,
    ),
  ]);

  return NextResponse.json({
    credentials: {
      keyPresent: !!key,
      secretPresent: !!secret,
      keyPrefix: key.slice(0, 4) + "...",
    },
    results,
  });
}
