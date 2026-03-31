"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Radio, Trophy, Newspaper, Music, Film, Tv } from "lucide-react";

interface Program {
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
  } | null;
}

interface EpgStripProps {
  programs: Program[];
  currentProgramId?: string | null;
}

export function EpgStrip({ programs, currentProgramId }: EpgStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = currentRef.current;
      const offset = element.offsetLeft - container.offsetWidth / 2 + element.offsetWidth / 2;
      container.scrollTo({ left: offset, behavior: "smooth" });
    }
  }, [currentProgramId]);

  if (programs.length === 0) return null;

  const now = new Date();

  const categoryIcons: Record<string, typeof Trophy> = {
    SPORTS: Trophy,
    NEWS: Newspaper,
    ENTERTAINMENT: Film,
    MUSIC: Music,
    DOCUMENTARY: Tv,
    OTHER: Tv,
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="font-medium">Today&apos;s Schedule</span>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {programs.map((program, i) => {
          const start = new Date(program.startTime);
          const end = new Date(program.endTime);
          const isCurrent = program.id === currentProgramId;
          const isPast = end < now;
          const startStr = start.toLocaleTimeString("en-ZW", { hour: "2-digit", minute: "2-digit", hour12: false });
          const endStr = end.toLocaleTimeString("en-ZW", { hour: "2-digit", minute: "2-digit", hour12: false });
          const CatIcon = categoryIcons[program.category] ?? Tv;

          return (
            <motion.div
              key={program.id}
              ref={isCurrent ? currentRef : undefined}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`flex-none rounded-lg border p-3 transition-colors ${
                isCurrent
                  ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/5"
                  : isPast
                    ? "border-border/50 bg-card/50 opacity-50"
                    : "border-border bg-card hover:border-primary/30"
              }`}
              style={{ minWidth: "160px" }}
            >
              <div className="flex items-center gap-1.5">
                {isCurrent && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    <Radio className="h-2.5 w-2.5 animate-pulse" />
                    NOW
                  </span>
                )}
                <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  program.category === "SPORTS"
                    ? "bg-orange-500/15 text-orange-400"
                    : program.category === "NEWS"
                      ? "bg-blue-500/15 text-blue-400"
                      : program.category === "ENTERTAINMENT"
                        ? "bg-pink-500/15 text-pink-400"
                        : program.category === "MUSIC"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-muted text-muted-foreground"
                }`}>
                  <CatIcon className="h-2.5 w-2.5" />
                  {program.category}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-medium leading-tight line-clamp-2">
                {program.match
                  ? `${program.match.homeTeam} vs ${program.match.awayTeam}`
                  : program.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {startStr} – {endStr}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
