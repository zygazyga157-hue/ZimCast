"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutChartProps {
  /** category → seconds (or any numeric value) */
  data: Record<string, number>;
  /** Optional color map: category → CSS color string */
  colors?: Record<string, string>;
  /** Chart height in px */
  height?: number;
  /** If true, format values as minutes (÷ 60) */
  asMinutes?: boolean;
}

const DEFAULT_COLORS: string[] = [
  "rgba(249,115,22,0.85)",  // orange – SPORTS
  "rgba(59,130,246,0.85)",  // blue – NEWS
  "rgba(236,72,153,0.85)",  // pink – ENTERTAINMENT
  "rgba(34,197,94,0.85)",   // green – MUSIC
  "rgba(139,92,246,0.85)",  // violet – DOCUMENTARY
  "rgba(99,102,241,0.85)",  // indigo – GAMING
  "rgba(20,184,166,0.85)",  // teal – TRAVEL
  "rgba(245,158,11,0.85)",  // amber – FOOD
  "rgba(148,163,184,0.85)", // slate – TECH
  "rgba(217,70,239,0.85)",  // fuchsia – FASHION
  "rgba(132,204,22,0.85)",  // lime – FITNESS
  "rgba(244,63,94,0.85)",   // rose – ART
  "rgba(113,113,122,0.85)", // gray – OTHER
];

const CATEGORY_COLOR_MAP: Record<string, string> = {
  SPORTS: DEFAULT_COLORS[0],
  NEWS: DEFAULT_COLORS[1],
  ENTERTAINMENT: DEFAULT_COLORS[2],
  MUSIC: DEFAULT_COLORS[3],
  DOCUMENTARY: DEFAULT_COLORS[4],
  GAMING: DEFAULT_COLORS[5],
  TRAVEL: DEFAULT_COLORS[6],
  FOOD: DEFAULT_COLORS[7],
  TECH: DEFAULT_COLORS[8],
  FASHION: DEFAULT_COLORS[9],
  FITNESS: DEFAULT_COLORS[10],
  ART: DEFAULT_COLORS[11],
  OTHER: DEFAULT_COLORS[12],
};

export function DoughnutChart({
  data,
  colors,
  height = 240,
  asMinutes = true,
}: DoughnutChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      Object.entries(data)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a),
    [data],
  );

  const total = useMemo(() => entries.reduce((s, [, v]) => s + v, 0), [entries]);

  const chartData = useMemo(() => {
    const colorMap = colors ?? CATEGORY_COLOR_MAP;
    return {
      labels: entries.map(([k]) => k),
      datasets: [
        {
          data: entries.map(([, v]) => v),
          backgroundColor: entries.map(([k], i) => colorMap[k] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]),
          borderColor: "rgba(0,0,0,0.3)",
          borderWidth: 1,
          hoverBorderColor: "rgba(255,255,255,0.6)",
          hoverBorderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [entries, colors]);

  const options: ChartOptions<"doughnut"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          titleColor: "#e5e7eb",
          bodyColor: "#e5e7eb",
          padding: 8,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed;
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              const display = asMinutes ? `${Math.round(val / 60)}min` : val.toLocaleString();
              return ` ${ctx.label}: ${display} (${pct}%)`;
            },
          },
        },
      },
      onHover: (_event, elements) => {
        if (elements.length > 0) {
          setHovered(entries[elements[0].index]?.[0] ?? null);
        } else {
          setHovered(null);
        }
      },
    }),
    [entries, total, asMinutes],
  );

  if (entries.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No viewing data yet.</p>;
  }

  const centerLabel = asMinutes
    ? `${Math.round(total / 60)}m`
    : total.toLocaleString();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ height, width: height }}>
        <Doughnut data={chartData} options={options} />
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{centerLabel}</span>
          <span className="text-[10px] text-muted-foreground">total</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {entries.map(([cat, val], i) => {
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          const colorMap = colors ?? CATEGORY_COLOR_MAP;
          const color = colorMap[cat] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <div
              key={cat}
              className={`flex items-center gap-1.5 text-[10px] transition-opacity ${
                hovered && hovered !== cat ? "opacity-40" : ""
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize text-muted-foreground">
                {cat.toLowerCase()} {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
