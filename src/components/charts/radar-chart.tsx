"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Radar } from "react-chartjs-2";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

interface RadarChartProps {
  /** label → value, e.g. { "FOOTBALL": 42, "MUSIC": 30 } */
  data: Record<string, number>;
  /** Chart height in px */
  height?: number;
  /** RGB values for the fill color, e.g. "139,92,246" */
  color?: string;
}

export function RadarChart({
  data,
  height = 260,
  color = "139,92,246",
}: RadarChartProps) {
  const entries = useMemo(
    () =>
      Object.entries(data)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a),
    [data],
  );

  const chartData = useMemo(
    () => ({
      labels: entries.map(([k]) => k),
      datasets: [
        {
          label: "Users",
          data: entries.map(([, v]) => v),
          backgroundColor: `rgba(${color}, 0.2)`,
          borderColor: `rgba(${color}, 0.8)`,
          borderWidth: 2,
          pointBackgroundColor: `rgba(${color}, 1)`,
          pointBorderColor: `rgba(${color}, 1)`,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    }),
    [entries, color],
  );

  const options: ChartOptions<"radar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          titleColor: "#e5e7eb",
          bodyColor: "#e5e7eb",
          padding: 8,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed.r} users`,
          },
        },
      },
      scales: {
        r: {
          angleLines: { color: "rgba(161,161,170,0.15)" },
          grid: { color: "rgba(161,161,170,0.12)" },
          pointLabels: {
            color: "rgba(161,161,170,0.7)",
            font: { size: 9 },
          },
          ticks: {
            display: false,
            stepSize: Math.ceil(Math.max(1, ...entries.map(([, v]) => v)) / 4),
          },
          beginAtZero: true,
        },
      },
    }),
    [entries],
  );

  if (entries.length < 3) {
    return <p className="py-6 text-center text-xs text-muted-foreground">Not enough data for radar chart.</p>;
  }

  return (
    <div style={{ height }}>
      <Radar data={chartData} options={options} />
    </div>
  );
}
