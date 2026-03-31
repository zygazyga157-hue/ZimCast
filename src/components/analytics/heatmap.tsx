"use client";

import { motion } from "framer-motion";

interface HeatmapProps {
  data: number[][]; // 7 days × 24 hours (minutes)
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Heatmap({ data }: HeatmapProps) {
  // Find max value for scaling
  const max = Math.max(1, ...data.flat());

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Hour labels */}
        <div className="flex pl-10 mb-1">
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="flex-1 text-center text-[9px] text-muted-foreground"
            >
              {h % 3 === 0 ? `${h.toString().padStart(2, "0")}` : ""}
            </div>
          ))}
        </div>

        {/* Grid */}
        {data.map((row, dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-1 mb-0.5">
            <span className="w-9 text-right text-[10px] text-muted-foreground font-medium">
              {DAY_LABELS[dayIdx]}
            </span>
            <div className="flex flex-1 gap-px">
              {row.map((minutes, hourIdx) => {
                const opacity = minutes > 0 ? 0.15 + (minutes / max) * 0.85 : 0;
                return (
                  <motion.div
                    key={hourIdx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (dayIdx * 24 + hourIdx) * 0.002, duration: 0.2 }}
                    className="flex-1 aspect-square rounded-sm cursor-default group relative"
                    style={{
                      backgroundColor:
                        minutes > 0
                          ? `rgba(99, 102, 241, ${opacity})`
                          : "rgba(255, 255, 255, 0.03)",
                    }}
                  >
                    {minutes > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                        <div className="rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-lg border border-border whitespace-nowrap">
                          {DAY_LABELS[dayIdx]} {hourIdx.toString().padStart(2, "0")}:00 — {minutes}min
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-2 pr-1">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {[0.1, 0.3, 0.5, 0.7, 1].map((level) => (
            <div
              key={level}
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: `rgba(99, 102, 241, ${level})` }}
            />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}
