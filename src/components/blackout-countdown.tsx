"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Timer, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlackoutCountdownProps {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    isLive: boolean;
    price: number | string;
  } | null;
  resumesAt: string;
  programTitle?: string;
}

function formatTimeLeft(ms: number) {
  if (ms <= 0) return { hours: "00", minutes: "00", seconds: "00" };
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return { hours, minutes, seconds };
}

export function BlackoutCountdown({
  match,
  resumesAt,
  programTitle,
}: BlackoutCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() =>
    formatTimeLeft(new Date(resumesAt).getTime() - Date.now())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = new Date(resumesAt).getTime() - Date.now();
      setTimeLeft(formatTimeLeft(ms));
      if (ms <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [resumesAt]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header gradient */}
      <div className="gradient-accent px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2 text-white/80">
          <Tv className="h-4 w-4" />
          <span className="text-sm font-medium">Live TV is currently off-air</span>
        </div>
      </div>

      <div className="p-6 text-center">
        {/* Match promo card */}
        {match && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mb-6"
          >
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-3">
              <Trophy className="h-3 w-3" />
              <span>LIVE SPORT IN PROGRESS</span>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="text-right">
                <p className="text-lg font-bold">{match.homeTeam}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                VS
              </div>
              <div className="text-left">
                <p className="text-lg font-bold">{match.awayTeam}</p>
              </div>
            </div>

            {match.isLive && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE NOW
              </div>
            )}

            <div className="mt-4">
              <Button asChild className="gradient-accent border-0 text-white">
                <Link href={`/sports/${match.id}`}>
                  <Trophy className="mr-1 h-4 w-4" />
                  Get Match Access
                </Link>
              </Button>
            </div>
          </motion.div>
        )}

        {!match && programTitle && (
          <p className="mb-4 text-muted-foreground">
            Currently showing: <strong className="text-foreground">{programTitle}</strong>
          </p>
        )}

        {/* Countdown */}
        <div className="mt-4 border-t border-border pt-6">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-4">
            <Timer className="h-3.5 w-3.5" />
            <span>ZTV returns in</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            {(["hours", "minutes", "seconds"] as const).map((unit, i) => (
              <div key={unit} className="flex items-center gap-3">
                <div className="text-center">
                  <motion.div
                    key={timeLeft[unit]}
                    initial={{ y: -4, opacity: 0.6 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-lg bg-primary/10 px-3 py-2 text-2xl font-mono font-bold tabular-nums text-primary sm:text-3xl"
                  >
                    {timeLeft[unit]}
                  </motion.div>
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                    {unit}
                  </p>
                </div>
                {i < 2 && (
                  <span className="mb-4 text-xl font-bold text-muted-foreground">:</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
