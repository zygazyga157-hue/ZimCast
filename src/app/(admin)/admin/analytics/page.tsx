"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Clock,
  Users,
  BarChart3,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/analytics/stats-card";
import { Heatmap } from "@/components/analytics/heatmap";
import { CategoryChart } from "@/components/analytics/category-chart";
import { AreaChart } from "@/components/charts/area-chart";
import { RadarChart } from "@/components/charts/radar-chart";
import { api, showApiError } from "@/lib/api";

/* ---------- types ---------- */

interface AnalyticsData {
  totalWatchTime: number;
  categoryBreakdown: Record<string, number>;
  weeklyHeatmap: number[][];
  topPrograms: { title: string; seconds: number; category: string }[];
  userGrowth: Record<string, number>;
  revenueTimeline: Record<string, number>;
  activeViewers: number;
  interestDistribution: Record<string, number>;
  demographicBreakdown: { byCity: Record<string, number>; byGender: Record<string, number> };
  peakHour: number;
  avgSession: number;
}

const CATEGORIES = ["", "NEWS", "SPORTS", "ENTERTAINMENT", "MUSIC", "DOCUMENTARY",
  "GAMING", "TRAVEL", "FOOD", "TECH", "FASHION", "FITNESS", "ART"];
const ALL_INTERESTS = [
  "FOOTBALL", "MUSIC", "NEWS", "ENTERTAINMENT", "DOCUMENTARY",
  "COMEDY", "GAMING", "TRAVEL", "FOOD", "TECH", "FASHION",
  "FITNESS", "ART",
];

const selectClass =
  "flex h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [color-scheme:dark]";

/* ---------- component ---------- */

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [interest, setInterest] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (city) params.set("city", city);
      if (gender) params.set("gender", gender);
      if (interest) params.set("interest", interest);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const q = params.toString() ? `?${params}` : "";
      const result = await api<AnalyticsData>(`/api/admin/analytics${q}`);
      setData(result);
    } catch (err) {
      showApiError(err, "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [category, city, gender, interest, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique cities / genders from data
  const cities = data ? Object.keys(data.demographicBreakdown.byCity).sort() : [];
  const genders = data ? Object.keys(data.demographicBreakdown.byGender).sort() : [];

  function formatHour(h: number) {
    const suffix = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:00 ${suffix}`;
  }

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)} className={selectClass}>
          <option value="">All Cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
          <option value="">All Genders</option>
          {genders.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={interest} onChange={(e) => setInterest(e.target.value)} className={selectClass}>
          <option value="">All Interests</option>
          {ALL_INTERESTS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={selectClass}
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={selectClass}
          placeholder="To"
        />
        {(category || city || gender || interest || dateFrom || dateTo) && (
          <button
            onClick={() => { setCategory(""); setCity(""); setGender(""); setInterest(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Clock} label="Total Watch Time" value={data.totalWatchTime > 0 ? Math.round(data.totalWatchTime / 3600) : 0} suffix="h" format="number" delay={0} />
        <StatsCard icon={Users} label="Active Viewers (7d)" value={data.activeViewers} format="number" delay={0.05} />
        <StatsCard icon={BarChart3} label="Avg. Session" value={data.avgSession > 0 ? formatDuration(data.avgSession) : "—"} format="number" delay={0.1} />
        <StatsCard icon={Zap} label="Peak Hour" value={data.totalWatchTime > 0 ? formatHour(data.peakHour) : "—"} format="number" delay={0.15} />
      </div>

      {/* Heatmap + Category Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Platform Activity Heatmap</h3>
          <Heatmap data={data.weeklyHeatmap} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Category Breakdown</h3>
          <CategoryChart data={Object.fromEntries(Object.entries(data.categoryBreakdown).filter(([k]) => k !== "OTHER"))} />
        </div>
      </div>

      {/* User Growth + Revenue Timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
            <TrendingUp className="mr-1.5 inline-block h-3.5 w-3.5" />
            New Users (30d)
          </h3>
          <AreaChart data={data.userGrowth} color="59,130,246" label="New Users" />
        </div>

        {/* Revenue Timeline */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
            <TrendingUp className="mr-1.5 inline-block h-3.5 w-3.5" />
            Revenue (30d)
          </h3>
          <AreaChart data={data.revenueTimeline} color="34,197,94" label="Revenue" prefix="$" />
        </div>
      </div>

      {/* Interest Distribution + Top Programs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Interest Distribution */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Interest Distribution</h3>
          <RadarChart data={data.interestDistribution} />
        </div>

        {/* Top Programs */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Top 10 Programs</h3>
          {data.topPrograms.length === 0 ? (
            <p className="text-xs text-muted-foreground">No programs yet.</p>
          ) : (
            <div className="space-y-2">
              {data.topPrograms.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/50 p-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDuration(p.seconds)}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0">{p.category}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Demographics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By City */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Users by City</h3>
          {Object.keys(data.demographicBreakdown.byCity).length === 0 ? (
            <p className="text-xs text-muted-foreground">No city data.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.demographicBreakdown.byCity)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([c, n]) => (
                  <div key={c} className="flex items-center justify-between text-xs">
                    <span>{c}</span>
                    <Badge variant="outline" className="text-[9px]">{n}</Badge>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* By Gender */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Users by Gender</h3>
          {Object.keys(data.demographicBreakdown.byGender).length === 0 ? (
            <p className="text-xs text-muted-foreground">No gender data.</p>
          ) : (
            <div className="flex items-center gap-4">
              {Object.entries(data.demographicBreakdown.byGender).map(([g, n]) => {
                const total = Object.values(data.demographicBreakdown.byGender).reduce((s, v) => s + v, 0);
                const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                return (
                  <div key={g} className="flex-1 rounded-xl border border-border/50 bg-background/50 p-4 text-center">
                    <p className="text-2xl font-bold">{pct}%</p>
                    <p className="text-xs text-muted-foreground">{g}</p>
                    <p className="text-[10px] text-muted-foreground">{n} users</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
