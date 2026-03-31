"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, Radio, Loader2, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { api, showApiError } from "@/lib/api";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  price: string;
  isLive: boolean;
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

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function SportsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [epgSports, setEpgSports] = useState<EpgProgram[]>([]);
  const [loading, setLoading] = useState(true);

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

  const liveMatches = matches.filter((m) => m.isLive);
  const upcomingMatches = matches.filter((m) => !m.isLive);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-ZW", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-ZW", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <PageTransition>
      <PullToRefresh onRefresh={loadData}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Sports</h1>
        <p className="mt-2 text-muted-foreground">
          Browse live and upcoming matches. Pay per match to stream.
        </p>

        {loading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : matches.length === 0 && epgSports.length === 0 ? (
          <div className="mt-16 text-center text-muted-foreground">
            No matches scheduled right now. Check back later!
          </div>
        ) : (
          <>
            {/* Today on ZimCast */}
            {epgSports.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Tv className="h-4 w-4 text-primary" />
                  Today on ZimCast
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {epgSports.map((prog) => {
                    const now = new Date();
                    const start = new Date(prog.startTime);
                    const end = new Date(prog.endTime);
                    const isNow = start <= now && end > now;
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
            {/* Live Now */}
            {liveMatches.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Radio className="h-4 w-4 animate-pulse text-red-500" />
                  Live Now
                </h2>
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {liveMatches.map((match) => (
                    <MatchCard key={match.id} match={match} formatDate={formatDate} formatTime={formatTime} />
                  ))}
                </motion.div>
              </section>
            )}

            {/* Upcoming */}
            {upcomingMatches.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-lg font-semibold">Upcoming</h2>
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {upcomingMatches.map((match) => (
                    <MatchCard key={match.id} match={match} formatDate={formatDate} formatTime={formatTime} />
                  ))}
                </motion.div>
              </section>
            )}
          </>
        )}
      </div>
      </PullToRefresh>
    </PageTransition>
  );
}

function MatchCard({
  match,
  formatDate,
  formatTime,
}: {
  match: Match;
  formatDate: (iso: string) => string;
  formatTime: (iso: string) => string;
}) {
  return (
    <motion.div variants={item}>
      <Link
        href={`/sports/${match.id}`}
        className="group relative block rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
      >
        {/* Live indicator bar */}
        {match.isLive && (
          <span className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-red-500 to-orange-500" />
        )}

        <div className="flex items-start justify-between gap-3">
          {/* Teams */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold transition-colors group-hover:text-primary">
              {match.homeTeam}
            </p>
            <div className="my-2 flex items-center gap-2">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">VS</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <p className="truncate font-semibold transition-colors group-hover:text-primary">
              {match.awayTeam}
            </p>
          </div>

          {/* Badge */}
          <div className="shrink-0">
            {match.isLive ? (
              <Badge
                variant="outline"
                className="border-red-500/30 bg-red-500/10 text-red-400"
              >
                <Radio className="mr-1 h-3 w-3 animate-pulse" />
                LIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                ${match.price}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(match.kickoff)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(match.kickoff)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
