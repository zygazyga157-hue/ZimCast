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

// ── Normalisers (raw API → our flat interfaces) ─────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFixture(r: any): ZplsFixture {
  return {
    id: String(r.id),
    home_id: String(r.home?.id ?? ""),
    home_name: r.home?.name ?? "",
    home_logo: r.home?.logo ?? "",
    away_id: String(r.away?.id ?? ""),
    away_name: r.away?.name ?? "",
    away_logo: r.away?.logo ?? "",
    location: r.location ?? "",
    date: r.date ?? "",
    time: r.time ?? "",
    round: String(r.round ?? ""),
    competition_id: String(r.competition?.id ?? r.competition_id ?? ""),
    competition_name: r.competition?.name ?? r.competition_name ?? "",
  };
}

/** Derive a 3-letter short code from a team name */
function deriveShortCode(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  // Multi-word: take first letter of each word (up to 3)
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeStanding(r: any): ZplsStanding {
  return {
    team_id: String(r.team_id ?? ""),
    name: r.name ?? "",
    short_code: r.short_code ?? "",
    logo: r.logo ?? "",
    rank: parseInt(r.rank, 10) || 0,
    matches: parseInt(r.matches, 10) || 0,
    won: parseInt(r.won, 10) || 0,
    draw: parseInt(r.drawn ?? r.draw, 10) || 0,
    lost: parseInt(r.lost, 10) || 0,
    goals_scored: parseInt(r.goals_scored, 10) || 0,
    goals_conceded: parseInt(r.goals_conceded, 10) || 0,
    goal_diff: parseInt(r.goal_diff, 10) || 0,
    points: parseInt(r.points, 10) || 0,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Upcoming fixtures — cached 5 min */
export async function getFixtures(
  page = 1,
): Promise<{ fixtures: ZplsFixture[]; next_page?: number; total?: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await zpls<any>(
    "fixtures/list.json",
    { page: String(page) },
    `zpls:fixtures:${page}`,
    300,
  );
  return {
    fixtures: (raw.fixtures ?? []).map(normalizeFixture),
    total: raw.total,
  };
}

/** Live matches — cached 30s */
export async function getLiveMatches(): Promise<{ match: ZplsLiveMatch[] }> {
  return zpls("scores/live.json", {}, "zpls:live", 30);
}

/** Past results — cached 5 min */
export async function getHistory(
  page = 1,
): Promise<{ match: ZplsHistoryMatch[]; next_page?: number; total?: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await zpls<any>(
    "scores/history.json",
    { page: String(page) },
    `zpls:history:${page}`,
    300,
  );
  const match: ZplsHistoryMatch[] = (raw.match ?? []).map((m: ZplsHistoryMatch) => ({
    ...m,
    id: String(m.id),
    fixture_id: String(m.fixture_id),
    home_id: String(m.home_id),
    away_id: String(m.away_id),
    competition_id: String(m.competition_id),
    home_logo: m.home_logo ?? "",
    away_logo: m.away_logo ?? "",
    round: String(m.round ?? ""),
  }));
  return { match, total: raw.total_pages };
}

/** League standings — cached 15 min, enriched with logos from fixtures */
export async function getStandings(): Promise<{ table: ZplsStanding[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [raw, fixtureData] = await Promise.all([
    zpls<any>("leagues/table.json", {}, "zpls:standings", 900),
    getFixtures(1).catch(() => ({ fixtures: [] })),
  ]);

  // Build teamId → logo map from fixtures (covers all teams seen in round 1)
  const teamLogoMap = new Map<string, string>();
  for (const f of fixtureData.fixtures) {
    if (f.home_id && f.home_logo) teamLogoMap.set(f.home_id, f.home_logo);
    if (f.away_id && f.away_logo) teamLogoMap.set(f.away_id, f.away_logo);
  }

  const table = (raw.table ?? []).map((r: any) => {
    const standing = normalizeStanding(r);
    return {
      ...standing,
      logo: teamLogoMap.get(standing.team_id) ?? "",
      short_code: deriveShortCode(standing.name),
    };
  });

  return { table };
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
    const match = live.match?.find((m) => String(m.fixture_id) === String(fixtureId));
    if (match) {
      return {
        score: match.scores?.score ?? "",
        ht_score: match.scores?.ht_score ?? "",
        ft_score: match.scores?.ft_score ?? "",
        status: match.status,
        time: match.time,
        home_logo: match.home_logo ?? "",
        away_logo: match.away_logo ?? "",
      };
    }
  } catch {
    // Live endpoint failed — try history
  }

  // Check history
  try {
    const history = await getHistory();
    const match = history.match?.find((m) => String(m.fixture_id) === String(fixtureId));
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
