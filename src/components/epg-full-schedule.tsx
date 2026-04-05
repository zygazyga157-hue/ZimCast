"use client";

import { Trophy, Newspaper, Music, Film, Tv, Radio, Gamepad2, Plane, UtensilsCrossed, Cpu, Shirt, Dumbbell, Palette } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  SPORTS: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  NEWS: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  ENTERTAINMENT: "border-pink-500/40 bg-pink-500/10 text-pink-400",
  MUSIC: "border-green-500/40 bg-green-500/10 text-green-400",
  DOCUMENTARY: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  GAMING: "border-indigo-500/40 bg-indigo-500/10 text-indigo-400",
  TRAVEL: "border-teal-500/40 bg-teal-500/10 text-teal-400",
  FOOD: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  TECH: "border-slate-500/40 bg-slate-500/10 text-slate-400",
  FASHION: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-400",
  FITNESS: "border-lime-500/40 bg-lime-500/10 text-lime-400",
  ART: "border-rose-500/40 bg-rose-500/10 text-rose-400",
  OTHER: "border-border bg-muted text-muted-foreground",
};

export function EpgFullSchedule({ programs, currentProgramId }: EpgFullScheduleProps) {
  if (programs.length === 0) return null;

  const now = new Date();

  return (
    <div className="mt-4">
      <Accordion type="single" collapsible>
        <AccordionItem value="schedule" className="border-0">
          <AccordionTrigger className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:no-underline">
            Full Day Schedule
          </AccordionTrigger>
          <AccordionContent>
            <div className="relative border-l-2 border-border/50 pl-4 ml-3 space-y-1 pt-2">
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
                  <div
                    key={program.id}
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
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
