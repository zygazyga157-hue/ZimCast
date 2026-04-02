"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Radio, Loader2, Tv } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { SportsHero } from "@/components/sports-hero";
import { MatchCard } from "@/components/match-card";
import { MatchFilters, type MatchFilter } from "@/components/match-filters";
import { EmptyMatches } from "@/components/empty-matches";
import type { MatchPhase } from "@/lib/match-window";
import { api, showApiError } from "@/lib/api";

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

export default function SportsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [epgSports, setEpgSports] = useState<EpgProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MatchFilter>("all");

  const loadData = useCallback(async () => {
    try {
      const [matchData, epgData] = await Promise.all([
        api<{ matches: Match[] }>("/api/matches"),
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
            </>
          )}
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}
