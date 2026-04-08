"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface AreaChartProps {
  /** Record of label → value, e.g. { "2026-03-10": 5, ... } */
  data: Record<string, number>;
  /** CSS color for the line/fill, e.g. "59,130,246" (rgb values) */
  color?: string;
  /** Dataset label shown in tooltip */
  label?: string;
  /** Chart height in px */
  height?: number;
  /** Value prefix in tooltip, e.g. "$" */
  prefix?: string;
}

export function AreaChart({
  data,
  color = "59,130,246",
  label = "Value",
  height = 180,
  prefix = "",
}: AreaChartProps) {
  const sorted = useMemo(
    () => Object.entries(data).sort(([a], [b]) => a.localeCompare(b)),
    [data],
  );

  const chartData = useMemo(
    () => ({
      labels: sorted.map(([k]) => k.slice(5)), // "MM-DD"
      datasets: [
        {
          label,
          data: sorted.map(([, v]) => v),
          borderColor: `rgba(${color}, 1)`,
          backgroundColor: (ctx: { chart: ChartJS }) => {
            const { chart } = ctx;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return `rgba(${color}, 0.15)`;
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, `rgba(${color}, 0.35)`);
            gradient.addColorStop(1, `rgba(${color}, 0.02)`);
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: `rgba(${color}, 1)`,
          borderWidth: 2,
        },
      ],
    }),
    [sorted, color, label],
  );

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          titleColor: "#e5e7eb",
          bodyColor: "#e5e7eb",
          padding: 8,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => {
              const y = typeof ctx.parsed.y === "number" ? ctx.parsed.y : 0;
              return `${label}: ${prefix}${y.toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "rgba(161,161,170,0.6)", font: { size: 9 }, maxRotation: 0, maxTicksLimit: 8 },
          border: { display: false },
        },
        y: {
          grid: { color: "rgba(161,161,170,0.1)" },
          ticks: { color: "rgba(161,161,170,0.6)", font: { size: 9 }, maxTicksLimit: 5 },
          border: { display: false },
          beginAtZero: true,
        },
      },
    }),
    [label, prefix],
  );

  if (sorted.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No data yet.</p>;
  }

  return (
    <div style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
