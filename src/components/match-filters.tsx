"use client";

import { motion } from "framer-motion";

export type MatchFilter = "all" | "live" | "upcoming" | "past";

interface MatchFiltersProps {
  active: MatchFilter;
  onChange: (filter: MatchFilter) => void;
  counts: Record<MatchFilter, number>;
}

const filters: { key: MatchFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

export function MatchFilters({ active, onChange, counts }: MatchFiltersProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
      {filters.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            active === key
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {active === key && (
            <motion.div
              layoutId="match-filter-bg"
              className="absolute inset-0 rounded-md gradient-accent opacity-15"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative">
            {label}
            {counts[key] > 0 && (
              <span className={`ml-1.5 text-[10px] ${
                active === key ? "text-foreground" : "text-muted-foreground"
              }`}>
                {counts[key]}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
