import { redis } from "@/lib/redis";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ZplsTeam {
  id: string;
  name: string;
  short_code: string;
  logo: string;
  country: { id: string; name: string };
}

export interface ZplsFixture {
  id: string;
  home_id: string;
  home_name: string;
  away_id: string;
  away_name: string;
  location: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  round: string;
  home_logo: string;
  away_logo: string;
  competition_id: string;
  competition_name: string;
}

export interface ZplsLiveMatch {
  id: string;
  fixture_id: string;
  home_id: string;
  home_name: string;
  away_id: string;
  away_name: string;
  home_logo: string;
  away_logo: string;
  location: string;
  status: string; // "IN PLAY" | "HALF TIME BREAK" | "ADDED TIME" etc.
  time: string; // match minute e.g. "43" or "HT" or "FT"
  scores: {
    score: string; // "1 - 0"
    ht_score: string;
    ft_score: string;
  };
  round: string;
  competition_id: string;
}

export interface ZplsHistoryMatch {
  id: string;
  fixture_id: string;
  home_id: string;
  home_name: string;
  away_id: string;
  away_name: string;
  home_logo: string;
  away_logo: string;
  location: string;
  score: string;
  ht_score: string;
  ft_score: string;
  status: string; // "FINISHED"
  date: string;
  time: string;
  round: string;
  competition_id: string;
}

export interface ZplsStanding {
  team_id: string;
  name: string;
  short_code: string;
  logo: string;
  rank: number;
  matches: number;
  won: number;
  draw: number;
  lost: number;
  goals_scored: number;
  goals_conceded: number;
  goal_diff: number;
  points: number;
}

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = "https://livescore-api.com/api-client";
const COMPETITION_ID = "85"; // Zimbabwe Premier Soccer League

function getCredentials() {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) {
    throw new Error("LIVESCORE_API_KEY and LIVESCORE_API_SECRET must be set");
  }
  return { key, secret };
}

// ── Fetch helper ────────────────────────────────────────────────────────────

async function zpls<T>(
  path: string,
  params: Record<string, string> = {},
  cacheKey: string,
  ttl: number,
): Promise<T> {
  // Check cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    // Redis may be down — proceed without cache
  }

  const { key, secret } = getCredentials();
  const url = new URL(`${BASE_URL}/${path}`);
  url.searchParams.set("key", key);
  url.searchParams.set("secret", secret);
  url.searchParams.set("competition_id", COMPETITION_ID);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: ttl },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`ZPLS API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(`ZPLS API error: ${json.error ?? "Unknown error"}`);
  }

  const data = json.data as T;

  // Cache the result
  try {
    await redis.set(cacheKey, JSON.stringify(data), "EX", ttl);
  } catch {
    // Cache write failed — acceptable
  }

  return data;
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Upcoming fixtures — cached 5 min */
export async function getFixtures(
  page = 1,
): Promise<{ fixtures: ZplsFixture[]; next_page?: number; total?: number }> {
  return zpls(
    "fixtures/list.json",
    { page: String(page) },
    `zpls:fixtures:${page}`,
    300,
  );
}

/** Live matches — cached 30s */
export async function getLiveMatches(): Promise<{ match: ZplsLiveMatch[] }> {
  return zpls("matches/live.json", {}, "zpls:live", 30);
}

/** Past results — cached 5 min */
export async function getHistory(
  page = 1,
): Promise<{ match: ZplsHistoryMatch[]; next_page?: number; total?: number }> {
  return zpls(
    "matches/history.json",
    { page: String(page) },
    `zpls:history:${page}`,
    300,
  );
}

/** League standings — cached 15 min */
export async function getStandings(): Promise<{ table: ZplsStanding[] }> {
  return zpls("competitions/standings.json", {}, "zpls:standings", 900);
}

/**
 * Get live score data for a specific ZPLS fixture ID.
 * Tries live endpoint first, falls back to history.
 * Returns null if not found.
 */
export async function getFixtureScore(fixtureId: string): Promise<{
  score: string;
  ht_score: string;
  ft_score: string;
  status: string;
  time: string;
  home_logo: string;
  away_logo: string;
} | null> {
  // Check live matches first
  try {
    const live = await getLiveMatches();
    const match = live.match?.find((m) => m.fixture_id === fixtureId);
    if (match) {
      return {
        score: match.scores.score,
        ht_score: match.scores.ht_score,
        ft_score: match.scores.ft_score,
        status: match.status,
        time: match.time,
        home_logo: match.home_logo,
        away_logo: match.away_logo,
      };
    }
  } catch {
    // Live endpoint failed — try history
  }

  // Check history
  try {
    const history = await getHistory();
    const match = history.match?.find((m) => m.fixture_id === fixtureId);
    if (match) {
      return {
        score: match.score,
        ht_score: match.ht_score,
        ft_score: match.ft_score,
        status: match.status,
        time: "FT",
        home_logo: match.home_logo,
        away_logo: match.away_logo,
      };
    }
  } catch {
    // History lookup failed
  }

  return null;
}
