"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Radio, Loader2, Tv, Trophy, Calendar as CalendarIcon } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { SportsHero } from "@/components/sports-hero";
import { TeamLogo } from "@/components/team-logo";
import { MatchCard } from "@/components/match-card";
import { MatchFilters, type MatchFilter } from "@/components/match-filters";
import { EmptyMatches } from "@/components/empty-matches";
import type { MatchPhase } from "@/lib/match-window";
import { api, showApiError } from "@/lib/api";

interface ZplsScore {
  score: string;
  ht_score: string;
  ft_score: string;
  status: string;
  time: string;
  home_logo: string;
  away_logo: string;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  price: string;
  isLive: boolean;
  phase?: MatchPhase;
  passStart?: string;
  passEnd?: string;
  zpls?: ZplsScore | null;
}

interface EpgProgram {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  isLive: boolean;
  match?: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    isLive: boolean;
    price: string;
  } | null;
}

interface ZplsFixture {
  id: string;
  home_name: string;
  away_name: string;
  home_logo: string;
  away_logo: string;
  date: string;
  time: string;
  location: string;
  round: string;
}

interface ZplsStanding {
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

export default function SportsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [epgSports, setEpgSports] = useState<EpgProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [zplsFixtures, setZplsFixtures] = useState<ZplsFixture[]>([]);
  const [standings, setStandings] = useState<ZplsStanding[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [matchData, epgData] = await Promise.all([
        api<{ matches: Match[] }>(`/api/matches?date=${new Date().toISOString().slice(0, 10)}`),
        api<{ programs: EpgProgram[] }>("/api/programs"),
      ]);
      setMatches(matchData.matches ?? []);
      setEpgSports(
        (epgData.programs ?? []).filter((p) => p.category === "SPORTS")
      );
    } catch (err) {
      showApiError(err, "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadZpls = useCallback(async () => {
    try {
      const [fixtureData, standingData] = await Promise.all([
        api<{ fixtures: ZplsFixture[] }>("/api/zpls/fixtures").catch(() => ({ fixtures: [] })),
        api<{ table: ZplsStanding[] }>("/api/zpls/standings").catch(() => ({ table: [] })),
      ]);
      setZplsFixtures(fixtureData.fixtures ?? []);
      setStandings(standingData.table ?? []);
    } catch {
      // ZPLS data is supplementary — failing is acceptable
    }
  }, []);

  useEffect(() => {
    loadData();
    loadZpls();
  }, [loadData, loadZpls]);

  const liveMatches = useMemo(
    () => matches.filter((m) => m.phase === "LIVE" || m.phase === "PREGAME" || m.phase === "POSTGAME"),
    [matches]
  );
  const upcomingMatches = useMemo(
    () => matches.filter((m) => m.phase === "UPCOMING"),
    [matches]
  );
  const endedMatches = useMemo(
    () => matches.filter((m) => m.phase === "ENDED"),
    [matches]
  );

  const counts: Record<MatchFilter, number> = {
    all: matches.length,
    live: liveMatches.length,
    upcoming: upcomingMatches.length,
    past: endedMatches.length,
  };

  const filteredMatches = useMemo(() => {
    switch (filter) {
      case "live": return liveMatches;
      case "upcoming": return upcomingMatches;
      case "past": return endedMatches;
      default: return matches;
    }
  }, [filter, matches, liveMatches, upcomingMatches, endedMatches]);

  // Featured match: first live match, or next upcoming
  const heroMatch = liveMatches[0] ?? upcomingMatches[0];

  return (
    <PageTransition>
      <PullToRefresh onRefresh={loadData}>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sports</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live &amp; upcoming matches. Pay per match to stream.
            </p>
          </div>

          {loading ? (
            <div className="mt-16 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Hero */}
              {heroMatch && (
                <section className="mb-8">
                  <SportsHero match={heroMatch} />
                </section>
              )}

              {/* Today on ZimCast (EPG Sports) */}
              {epgSports.length > 0 && (
                <section className="mb-8">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Tv className="h-4 w-4 text-primary" />
                    Today on ZimCast
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {epgSports.map((prog) => {
                      const start = new Date(prog.startTime);
                      const end = new Date(prog.endTime);
                      const isNow = start.getTime() <= Date.now() && end.getTime() > Date.now();
                      const startStr = start.toLocaleTimeString("en-ZW", { hour: "2-digit", minute: "2-digit", hour12: false });
                      const endStr = end.toLocaleTimeString("en-ZW", { hour: "2-digit", minute: "2-digit", hour12: false });

                      return (
                        <motion.div
                          key={prog.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-lg border p-4 ${
                            isNow
                              ? "border-orange-500/40 bg-orange-500/5"
                              : "border-border bg-card"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isNow && (
                              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                                <Radio className="h-2.5 w-2.5 animate-pulse" />
                                LIVE NOW
                              </span>
                            )}
                            <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
                              SPORTS
                            </span>
                          </div>
                          <p className="mt-2 font-medium">
                            {prog.match
                              ? `${prog.match.homeTeam} vs ${prog.match.awayTeam}`
                              : prog.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {startStr} – {endStr}
                          </p>
                          {prog.match && (
                            <Link
                              href={`/sports/${prog.match.id}`}
                              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                            >
                              View Match →
                            </Link>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Filters + Match Grid */}
              <section>
                <div className="mb-6 flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold">Matches</h2>
                  <MatchFilters active={filter} onChange={setFilter} counts={counts} />
                </div>

                {filteredMatches.length === 0 ? (
                  <EmptyMatches filter={filter} />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredMatches.map((match, i) => (
                      <MatchCard key={match.id} match={match} index={i} />
                    ))}
                  </div>
                )}
              </section>

              {/* ZPLS Upcoming Fixtures */}
              {zplsFixtures.length > 0 && (
                <section className="mt-10">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    ZPSL Upcoming Fixtures
                  </h2>
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="divide-y divide-border">
                      {zplsFixtures.slice(0, 10).map((f) => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                          <div className="flex flex-1 items-center gap-2 min-w-0">
                            <TeamLogo src={f.home_logo} name={f.home_name} size={24} />
                            <span className="truncate font-medium">{f.home_name}</span>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground shrink-0">vs</span>
                          <div className="flex flex-1 items-center gap-2 min-w-0 flex-row-reverse">
                            <TeamLogo src={f.away_logo} name={f.away_name} size={24} />
                            <span className="truncate text-right font-medium">{f.away_name}</span>
                          </div>
                          <div className="shrink-0 text-right text-xs text-muted-foreground w-20">
                            <div>{f.date}</div>
                            <div>{f.time?.slice(0, 5)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* ZPSL League Standings */}
              {standings.length > 0 && (
                <section className="mt-10">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Trophy className="h-4 w-4 text-primary" />
                    ZPSL Standings
                  </h2>
                  <div className="rounded-xl border border-border bg-card overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2.5 font-medium w-8">#</th>
                          <th className="px-4 py-2.5 font-medium">Team</th>
                          <th className="px-4 py-2.5 font-medium text-center">P</th>
                          <th className="px-4 py-2.5 font-medium text-center">W</th>
                          <th className="px-4 py-2.5 font-medium text-center">D</th>
                          <th className="px-4 py-2.5 font-medium text-center">L</th>
                          <th className="px-4 py-2.5 font-medium text-center hidden sm:table-cell">GF</th>
                          <th className="px-4 py-2.5 font-medium text-center hidden sm:table-cell">GA</th>
                          <th className="px-4 py-2.5 font-medium text-center hidden sm:table-cell">GD</th>
                          <th className="px-4 py-2.5 font-medium text-center">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((team, i) => (
                          <tr key={team.team_id} className={`border-b border-border last:border-0 ${i < 3 ? "bg-primary/[0.02]" : ""}`}>
                            <td className="px-4 py-2.5 font-medium text-muted-foreground">{team.rank}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <TeamLogo src={team.logo} name={team.name} size={20} />
                                <span className="font-medium truncate max-w-[140px]">{team.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground">{team.matches}</td>
                            <td className="px-4 py-2.5 text-center">{team.won}</td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground">{team.draw}</td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground">{team.lost}</td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground hidden sm:table-cell">{team.goals_scored}</td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground hidden sm:table-cell">{team.goals_conceded}</td>
                            <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                              <span className={team.goal_diff > 0 ? "text-green-400" : team.goal_diff < 0 ? "text-red-400" : "text-muted-foreground"}>
                                {team.goal_diff > 0 ? "+" : ""}{team.goal_diff}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold">{team.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}
