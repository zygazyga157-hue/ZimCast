"use client";

import { DoughnutChart } from "@/components/charts/doughnut-chart";

interface CategoryChartProps {
  data: Record<string, number>; // category → seconds
}

export function CategoryChart({ data }: CategoryChartProps) {
  return <DoughnutChart data={data} asMinutes />;
}
