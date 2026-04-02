"use client";

import { motion } from "framer-motion";
import { Trophy, Calendar, Clock, Search } from "lucide-react";
import type { MatchFilter } from "@/components/match-filters";

interface EmptyMatchesProps {
  filter: MatchFilter;
}

const emptyStates: Record<MatchFilter, { icon: typeof Trophy; title: string; description: string }> = {
  all: {
    icon: Calendar,
    title: "No matches scheduled",
    description: "Check back later for upcoming fixtures and live matches.",
  },
  live: {
    icon: Trophy,
    title: "No live matches right now",
    description: "There are no matches being played at the moment. Check the schedule for upcoming games.",
  },
  upcoming: {
    icon: Clock,
    title: "No upcoming matches",
    description: "All scheduled matches have already started or ended. New fixtures will appear here.",
  },
  past: {
    icon: Search,
    title: "No ended matches",
    description: "Completed matches will appear here for reference.",
  },
};

export function EmptyMatches({ filter }: EmptyMatchesProps) {
  const state = emptyStates[filter];
  const Icon = state.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{state.title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {state.description}
      </p>
    </motion.div>
  );
}
