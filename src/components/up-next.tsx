"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";

interface UpNextProps {
  program: {
    id: string;
    title: string;
    category: string;
    startTime: string;
    endTime: string;
    match?: {
      id: string;
      homeTeam: string;
      awayTeam: string;
    } | null;
  };
}

export function UpNext({ program }: UpNextProps) {
  const [timeUntil, setTimeUntil] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(program.startTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeUntil("Starting now");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 0) {
        setTimeUntil(`in ${h}h ${m}m`);
      } else {
        const s = Math.floor((diff % 60000) / 1000);
        setTimeUntil(`in ${m}m ${s}s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [program.startTime]);

  const title = program.match
    ? `${program.match.homeTeam} vs ${program.match.awayTeam}`
    : program.title;

  const startStr = new Date(program.startTime).toLocaleTimeString("en-ZW", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  const isSports = program.category === "SPORTS" && program.match;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mt-2 rounded-2xl border border-border/60 bg-card/60 p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Up Next
              </span>
            </div>
            <p className="truncate text-sm font-medium">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{startStr}</span>
          <span className="text-primary/80 font-medium">{timeUntil}</span>
        </div>
      </div>

      {/* Sports match CTA */}
      {isSports && program.match && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-orange-500/5 px-3 py-2 border border-orange-500/10">
          <div className="flex items-center gap-2 text-xs text-orange-400">
            <Trophy className="h-3.5 w-3.5" />
            <span>Sports match up next</span>
          </div>
          <Link
            href={`/sports/${program.match.id}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            View Match →
          </Link>
        </div>
      )}
    </motion.div>
  );
}
