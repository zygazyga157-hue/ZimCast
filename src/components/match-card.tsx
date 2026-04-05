"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, Radio, Timer, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/team-logo";
import type { MatchPhase } from "@/lib/match-window";

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
  zpls?: ZplsScore | null;
}

interface MatchCardProps {
  match: Match;
  index?: number;
}

export function MatchCard({ match, index = 0 }: MatchCardProps) {
  const [countdown, setCountdown] = useState("");
  const phase = match.phase;
  const isLive = phase === "LIVE" || phase === "POSTGAME" || match.isLive;
  const isEnded = phase === "ENDED";
  const isPregame = phase === "PREGAME";

  useEffect(() => {
    if (isLive || isEnded) return;
    const diff = new Date(match.kickoff).getTime() - Date.now();
    if (diff <= 0) return;

    const update = () => {
      const d = new Date(match.kickoff).getTime() - Date.now();
      if (d <= 0) { setCountdown("Starting now"); return; }
      const days = Math.floor(d / 86400000);
      const h = Math.floor((d % 86400000) / 3600000);
      const m = Math.floor((d % 3600000) / 60000);
      if (days > 0) setCountdown(`${days}d ${h}h`);
      else if (h > 0) setCountdown(`${h}h ${m}m`);
      else {
        const s = Math.floor((d % 60000) / 1000);
        setCountdown(`${m}m ${s}s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [match.kickoff, isLive, isEnded]);

  const kickoff = new Date(match.kickoff);
  const dateStr = kickoff.toLocaleDateString("en-ZW", {
    weekday: "short", month: "short", day: "numeric",
  });
  const timeStr = kickoff.toLocaleTimeString("en-ZW", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        href={`/sports/${match.id}`}
        className="group relative block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
      >
        {/* Live accent bar */}
        {isLive && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
        )}

        <div className="p-5">
          {/* Teams VS layout */}
          <div className="flex items-center gap-4">
            {/* Home */}
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <TeamLogo src={match.zpls?.home_logo} name={match.homeTeam} size={40} />
              <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                {match.homeTeam}
              </p>
            </div>

            {/* VS / Score */}
            {match.zpls?.score ? (
              <div className="flex shrink-0 flex-col items-center">
                <span className="text-base font-bold tabular-nums">{match.zpls.score}</span>
                {(match.zpls.status === "IN PLAY" || match.zpls.status === "HALF TIME BREAK" || match.zpls.status === "ADDED TIME") && (
                  <span className="text-[9px] font-medium text-red-400">{match.zpls.time}&apos;</span>
                )}
              </div>
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                VS
              </div>
            )}

            {/* Away */}
            <div className="flex flex-1 items-center gap-3 min-w-0 flex-row-reverse">
              <TeamLogo src={match.zpls?.away_logo} name={match.awayTeam} size={40} />
              <p className="truncate text-right text-sm font-semibold transition-colors group-hover:text-primary">
                {match.awayTeam}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeStr}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isLive ? (
                <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400 text-[10px]">
                  <Radio className="mr-1 h-2.5 w-2.5 animate-pulse" />
                  LIVE
                </Badge>
              ) : isEnded ? (
                <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-[10px]">
                  <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                  ENDED
                </Badge>
              ) : isPregame ? (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px]">
                  STARTING SOON
                </Badge>
              ) : countdown ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                  <Timer className="h-3 w-3" />
                  {countdown}
                </span>
              ) : null}
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px]">
                ${match.price}
              </Badge>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
