"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Clock, Trophy, Newspaper, Music, Film, Tv, Gamepad2, Plane, UtensilsCrossed, Cpu, Shirt, Dumbbell, Palette } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface RecommendedProgram {
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
}

interface RecommendationsProps {
  currentCategory?: string;
  programs: RecommendedProgram[];
}

const categoryIcons: Record<string, typeof Trophy> = {
  SPORTS: Trophy,
  NEWS: Newspaper,
  ENTERTAINMENT: Film,
  MUSIC: Music,
  DOCUMENTARY: Tv,
  GAMING: Gamepad2,
  TRAVEL: Plane,
  FOOD: UtensilsCrossed,
  TECH: Cpu,
  FASHION: Shirt,
  FITNESS: Dumbbell,
  ART: Palette,
  OTHER: Tv,
};

const categoryColors: Record<string, string> = {
  SPORTS: "bg-orange-500/10 text-orange-400",
  NEWS: "bg-blue-500/10 text-blue-400",
  ENTERTAINMENT: "bg-pink-500/10 text-pink-400",
  MUSIC: "bg-green-500/10 text-green-400",
  DOCUMENTARY: "bg-purple-500/10 text-purple-400",
  GAMING: "bg-indigo-500/10 text-indigo-400",
  TRAVEL: "bg-teal-500/10 text-teal-400",
  FOOD: "bg-amber-500/10 text-amber-400",
  TECH: "bg-slate-500/10 text-slate-400",
  FASHION: "bg-fuchsia-500/10 text-fuchsia-400",
  FITNESS: "bg-lime-500/10 text-lime-400",
  ART: "bg-rose-500/10 text-rose-400",
  OTHER: "bg-muted text-muted-foreground",
};

export function Recommendations({ currentCategory, programs }: RecommendationsProps) {
  const recommended = useMemo(() => {
    const now = new Date();
    // Filter future programs, prioritize same category, limit to 4
    const future = programs.filter((p) => new Date(p.startTime) > now);
    const sameCategory = future.filter((p) => p.category === currentCategory);
    const other = future.filter((p) => p.category !== currentCategory);
    return [...sameCategory, ...other].slice(0, 4);
  }, [programs, currentCategory]);

  if (recommended.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-6 rounded-2xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Recommended for You</h3>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {recommended.map((program, i) => {
          const Icon = categoryIcons[program.category] ?? Tv;
          const colorClass = categoryColors[program.category] ?? categoryColors.OTHER;
          const startStr = new Date(program.startTime).toLocaleTimeString("en-ZW", {
            hour: "2-digit", minute: "2-digit", hour12: false,
          });
          const title = program.match
            ? `${program.match.homeTeam} vs ${program.match.awayTeam}`
            : program.title;
          const isSportsMatch = program.category === "SPORTS" && program.match;

          return (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-3 hover:border-primary/20 transition-colors"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{title}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{startStr}</span>
                  <Badge variant="outline" className={`${colorClass} border-0 text-[9px] px-1 py-0`}>
                    {program.category}
                  </Badge>
                </div>
              </div>
              {isSportsMatch && program.match && (
                <Link
                  href={`/sports/${program.match.id}`}
                  className="shrink-0 text-[10px] font-medium text-primary hover:underline"
                >
                  View &#x2192;
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
