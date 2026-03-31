"use client";

import { motion } from "framer-motion";

interface CategoryChartProps {
  data: Record<string, number>; // category → seconds
}

const CATEGORY_COLORS: Record<string, string> = {
  SPORTS: "from-orange-500 to-amber-500",
  NEWS: "from-blue-500 to-cyan-500",
  ENTERTAINMENT: "from-pink-500 to-rose-500",
  MUSIC: "from-green-500 to-emerald-500",
  DOCUMENTARY: "from-violet-500 to-purple-500",
  OTHER: "from-gray-500 to-zinc-500",
};

export function CategoryChart({ data }: CategoryChartProps) {
  const entries = Object.entries(data)
    .map(([category, seconds]) => ({
      category,
      minutes: Math.round(seconds / 60),
    }))
    .filter((e) => e.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  if (entries.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground text-center">
        No viewing data yet.
      </p>
    );
  }

  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
  const maxMinutes = entries[0].minutes;

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => {
        const pct = Math.round((entry.minutes / totalMinutes) * 100);
        const barWidth = (entry.minutes / maxMinutes) * 100;
        const gradientClass = CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.OTHER;

        return (
          <div key={entry.category}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium capitalize">
                {entry.category.toLowerCase()}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {entry.minutes}min ({pct}%)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ delay: i * 0.1 + 0.3, duration: 0.6, ease: "easeOut" }}
                className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
