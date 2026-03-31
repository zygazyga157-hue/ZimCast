"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, Clock, Trophy, Newspaper, Music, Film, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NowPlayingProps {
  program: {
    id: string;
    title: string;
    category: string;
    startTime: string;
    endTime: string;
    match?: { homeTeam: string; awayTeam: string } | null;
  };
}

const categoryConfig: Record<string, { icon: typeof Trophy; color: string; bg: string }> = {
  SPORTS: { icon: Trophy, color: "text-orange-400", bg: "bg-orange-500/15" },
  NEWS: { icon: Newspaper, color: "text-blue-400", bg: "bg-blue-500/15" },
  ENTERTAINMENT: { icon: Film, color: "text-pink-400", bg: "bg-pink-500/15" },
  MUSIC: { icon: Music, color: "text-green-400", bg: "bg-green-500/15" },
  DOCUMENTARY: { icon: Tv, color: "text-purple-400", bg: "bg-purple-500/15" },
  OTHER: { icon: Tv, color: "text-muted-foreground", bg: "bg-muted" },
};

export function NowPlaying({ program }: NowPlayingProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const start = new Date(program.startTime).getTime();
      const end = new Date(program.endTime).getTime();
      const now = Date.now();
      const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
      setProgress(pct);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [program.startTime, program.endTime]);

  const config = categoryConfig[program.category] ?? categoryConfig.OTHER;
  const CategoryIcon = config.icon;

  const startStr = new Date(program.startTime).toLocaleTimeString("en-ZW", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const endStr = new Date(program.endTime).toLocaleTimeString("en-ZW", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  const title = program.match
    ? `${program.match.homeTeam} vs ${program.match.awayTeam}`
    : program.title;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
            <CategoryIcon className={`h-4.5 w-4.5 ${config.color}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{startStr} – {endStr}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`${config.bg} ${config.color} border-0 text-[10px]`}>
            <CategoryIcon className="mr-1 h-2.5 w-2.5" />
            {program.category}
          </Badge>
          <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400 text-[10px]">
            <Radio className="mr-1 h-2.5 w-2.5 animate-pulse" />
            LIVE
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full gradient-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{startStr}</span>
          <span>{Math.round(progress)}%</span>
          <span>{endStr}</span>
        </div>
      </div>
    </motion.div>
  );
}
