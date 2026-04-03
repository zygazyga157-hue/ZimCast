"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Trophy, Radio, Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface SportsHeroProps {
  match: Match;
}

function getInitials(team: string): string {
  const words = team.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

export function SportsHero({ match }: SportsHeroProps) {
  const [countdown, setCountdown] = useState("");
  const phase = match.phase;
  const isLive = phase === "LIVE" || phase === "POSTGAME" || match.isLive;

  useEffect(() => {
    if (isLive) return;
    const update = () => {
      const diff = new Date(match.kickoff).getTime() - Date.now();
      if (diff <= 0) { setCountdown("Starting now"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setCountdown(`${d}d ${h}h ${m}m`);
      else if (h > 0) setCountdown(`${h}h ${m}m ${s}s`);
      else setCountdown(`${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [match.kickoff, isLive]);

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
      className="relative overflow-hidden rounded-2xl border border-border"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a12] via-card to-[#120a1a]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,65,108,0.12),transparent_60%)]" />

      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {isLive ? "Live Now" : phase === "PREGAME" ? "Starting Soon" : "Featured Match"}
          </span>
        </div>

        {/* Teams VS Display */}
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {/* Home Team */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex flex-col items-center gap-3"
          >
            {match.zpls?.home_logo ? (
              <Image
                src={match.zpls.home_logo}
                alt={match.homeTeam}
                width={80}
                height={80}
                className="h-16 w-16 rounded-full object-contain sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-lg font-bold text-primary sm:h-20 sm:w-20 sm:text-xl">
                {getInitials(match.homeTeam)}
              </div>
            )}
            <p className="max-w-[120px] text-center text-sm font-semibold sm:text-base">
              {match.homeTeam}
            </p>
          </motion.div>

          {/* VS Divider / Score */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="flex flex-col items-center gap-2"
          >
            {match.zpls?.score ? (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black tabular-nums sm:text-3xl">{match.zpls.score}</span>
                {(match.zpls.status === "IN PLAY" || match.zpls.status === "HALF TIME BREAK" || match.zpls.status === "ADDED TIME") && (
                  <span className="text-xs font-medium text-red-400 animate-pulse">{match.zpls.time}&apos;</span>
                )}
                {match.zpls.ht_score && (
                  <span className="text-[10px] text-muted-foreground mt-1">HT: {match.zpls.ht_score}</span>
                )}
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-accent text-sm font-black text-white shadow-lg shadow-primary/20">
                VS
              </div>
            )}
          </motion.div>

          {/* Away Team */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex flex-col items-center gap-3"
          >
            {match.zpls?.away_logo ? (
              <Image
                src={match.zpls.away_logo}
                alt={match.awayTeam}
                width={80}
                height={80}
                className="h-16 w-16 rounded-full object-contain sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent/30 bg-accent/10 text-lg font-bold text-accent sm:h-20 sm:w-20 sm:text-xl">
                {getInitials(match.awayTeam)}
              </div>
            )}
            <p className="max-w-[120px] text-center text-sm font-semibold sm:text-base">
              {match.awayTeam}
            </p>
          </motion.div>
        </div>

        {/* Status / Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          {isLive ? (
            <Badge className="border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-1">
              <Radio className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
              LIVE NOW
            </Badge>
          ) : phase === "PREGAME" ? (
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm px-4 py-1">
              STARTING SOON
            </Badge>
          ) : (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {dateStr} • {timeStr}
              </span>
              <span className="flex items-center gap-1.5 font-medium text-primary">
                <Timer className="h-3.5 w-3.5" />
                {countdown}
              </span>
            </div>
          )}

          {/* CTA */}
          <div className="mt-2 flex items-center gap-3">
            <Button asChild className="gradient-accent border-0 text-white px-6">
              <Link href={`/sports/${match.id}`}>
                {isLive ? "Watch Now" : "Get Match Pass"}
              </Link>
            </Button>
            {!isLive && (
              <span className="text-sm font-medium text-muted-foreground">
                ${match.price}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
