"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, Radio, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  price: string;
  isLive: boolean;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches")
      .then((res) => res.json())
      .then((data) => setMatches(data.matches ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Sports</h1>
        <p className="mt-2 text-muted-foreground">
          Browse live and upcoming matches. Pay per match to stream.
        </p>

        {loading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-16 text-center text-muted-foreground">
            No matches scheduled right now. Check back later!
          </div>
        ) : (
          <>
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
        className="group block rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-semibold group-hover:text-primary transition-colors">
              {match.homeTeam}
            </p>
            <p className="text-sm text-muted-foreground">vs</p>
            <p className="font-semibold group-hover:text-primary transition-colors">
              {match.awayTeam}
            </p>
          </div>
          {match.isLive ? (
            <Badge
              variant="outline"
              className="border-red-500/30 bg-red-500/10 text-red-400"
            >
              <Radio className="mr-1 h-3 w-3 animate-pulse" />
              LIVE
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              ${match.price}
            </Badge>
          )}
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
