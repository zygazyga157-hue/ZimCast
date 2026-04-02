"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trophy, Newspaper, Music, Film, Tv, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface EpgFullScheduleProps {
  programs: Program[];
  currentProgramId?: string | null;
}

const categoryIcons: Record<string, typeof Trophy> = {
  SPORTS: Trophy,
  NEWS: Newspaper,
  ENTERTAINMENT: Film,
  MUSIC: Music,
  DOCUMENTARY: Tv,
  OTHER: Tv,
};

const categoryColors: Record<string, string> = {
  SPORTS: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  NEWS: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  ENTERTAINMENT: "border-pink-500/40 bg-pink-500/10 text-pink-400",
  MUSIC: "border-green-500/40 bg-green-500/10 text-green-400",
  DOCUMENTARY: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  OTHER: "border-border bg-muted text-muted-foreground",
};

export function EpgFullSchedule({ programs, currentProgramId }: EpgFullScheduleProps) {
  const [expanded, setExpanded] = useState(false);

  if (programs.length === 0) return null;

  const now = new Date();

  return (
    <div className="mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="mb-2 text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={`mr-1.5 h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "Hide" : "View"} Full Day Schedule
      </Button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="relative border-l-2 border-border/50 pl-4 ml-3 space-y-1">
              {programs.map((program) => {
                const start = new Date(program.startTime);
                const end = new Date(program.endTime);
                const isCurrent = program.id === currentProgramId;
                const isPast = end < now;
                const Icon = categoryIcons[program.category] ?? Tv;
                const colorClass = categoryColors[program.category] ?? categoryColors.OTHER;

                const startStr = start.toLocaleTimeString("en-ZW", {
                  hour: "2-digit", minute: "2-digit", hour12: false,
                });
                const endStr = end.toLocaleTimeString("en-ZW", {
                  hour: "2-digit", minute: "2-digit", hour12: false,
                });

                const title = program.match
                  ? `${program.match.homeTeam} vs ${program.match.awayTeam}`
                  : program.title;

                return (
                  <motion.div
                    key={program.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`relative flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      isCurrent
                        ? "border-primary/40 bg-primary/5"
                        : isPast
                          ? "border-transparent bg-transparent opacity-40"
                          : "border-border/30 bg-card/40"
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className={`absolute -left-[21px] h-2.5 w-2.5 rounded-full border-2 ${
                      isCurrent
                        ? "border-primary bg-primary animate-pulse"
                        : isPast
                          ? "border-muted-foreground/30 bg-muted"
                          : "border-border bg-card"
                    }`} />

                    {/* Time */}
                    <div className="w-20 shrink-0 text-xs text-muted-foreground">
                      <span className="font-medium">{startStr}</span>
                      <span className="mx-1">–</span>
                      <span>{endStr}</span>
                    </div>

                    {/* Category icon */}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${colorClass}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    {/* Title */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{title}</p>
                    </div>

                    {/* Live badge */}
                    {isCurrent && (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                        <Radio className="h-2.5 w-2.5 animate-pulse" />
                        NOW
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
