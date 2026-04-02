"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  suffix?: string;
  format?: "time" | "number" | "percent";
  delay?: number;
}

function formatValue(value: number, format?: string): string {
  if (format === "time") {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
  if (format === "percent") return `${value}%`;
  return value.toLocaleString();
}

export function StatsCard({ icon: Icon, label, value, suffix, format, delay = 0 }: StatsCardProps) {
  const numericValue = typeof value === "number" ? value : null;
  const [displayed, setDisplayed] = useState<number>(0);

  useEffect(() => {
    if (numericValue === null) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    const timeout = setTimeout(() => {
      let current = 0;
      setDisplayed(0);

      if (numericValue === 0) return;

      const duration = 1000;
      const steps = 30;
      const increment = numericValue / steps;
      interval = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setDisplayed(numericValue);
          if (interval) clearInterval(interval);
        } else {
          setDisplayed(Math.floor(current));
        }
      }, duration / steps);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [numericValue, delay]);

  const displayedText =
    numericValue === null
      ? String(value)
      : formatValue(numericValue === 0 ? 0 : displayed, format);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">
        {displayedText}
        {suffix && (
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {suffix}
          </span>
        )}
      </p>
    </motion.div>
  );
}
