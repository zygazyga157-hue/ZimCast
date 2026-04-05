"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  Activity,
  Star,
  Trophy,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { Heatmap } from "@/components/analytics/heatmap";
import { StatsCard } from "@/components/analytics/stats-card";
import { CategoryChart } from "@/components/analytics/category-chart";
import { api, ApiError } from "@/lib/api";

interface Analytics {
  totalWatchTime: number;
  favoriteCategory: string | null;
  topPrograms: { title: string; totalTime: number }[];
  engagementScore: number;
  weeklyHeatmap: number[][];
  categoryBreakdown: Record<string, number>;
  recentActivity: {
    id: string;
    action: string;
    watchDuration: number;
    title: string | null;
    category: string | null;
    createdAt: string;
  }[];
  insights: string[];
  peakTime: number | null;
  totalMatches: number;
}

function formatWatchTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading" || !session) return;

    let cancelled = false;
    api<Analytics>("/api/user/analytics")
      .then((data) => {
        if (cancelled) return;
        setAnalytics(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load analytics.");
      });

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const isLoading = status === "loading" || (session && !analytics && !error);

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Analytics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your watch time, habits, and insights across ZimCast.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile">Profile</Link>
            </Button>
            <Button size="sm" className="gradient-accent border-0 text-white" asChild>
              <Link href="/sports">Browse Matches</Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !session ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <h2 className="mt-5 text-xl font-bold">Sign in to view analytics</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Track watch time, peak hours, and category breakdowns once you’re signed in.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button className="gradient-accent border-0 text-white" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="mt-5">
              <Button variant="outline" onClick={() => location.reload()}>
                Try again
              </Button>
            </div>
          </div>
        ) : analytics && analytics.totalWatchTime > 0 ? (
          <div className="mt-8 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatsCard
                icon={Clock}
                label="Watch Time"
                value={analytics.totalWatchTime}
                format="time"
                delay={0}
              />
              <StatsCard
                icon={Activity}
                label="Engagement"
                value={analytics.engagementScore}
                format="percent"
                delay={100}
              />
              <StatsCard
                icon={Star}
                label="Favorite"
                value={analytics.favoriteCategory?.toLowerCase() ?? "—"}
                delay={200}
              />
              <StatsCard
                icon={Trophy}
                label="Matches"
                value={analytics.totalMatches}
                format="number"
                delay={300}
              />
            </div>

            {/* Heatmap */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Activity Heatmap
              </h2>
              <Heatmap data={analytics.weeklyHeatmap} />
            </div>

            {/* Breakdown + insights */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="mb-4 text-sm font-semibold">Category Breakdown</h2>
                <CategoryChart data={analytics.categoryBreakdown} />
              </div>

              {analytics.insights.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    Insights
                  </h2>
                  <div className="space-y-3">
                    {analytics.insights.map((insight, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.25 }}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {insight}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top programs */}
            {analytics.topPrograms.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="mb-4 text-sm font-semibold">Top Programs</h2>
                <div className="space-y-3">
                  {analytics.topPrograms.slice(0, 5).map((p, idx) => (
                    <div
                      key={`${idx}-${p.title}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          <span className="mr-2 text-xs text-muted-foreground tabular-nums">
                            #{idx + 1}
                          </span>
                          {p.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatWatchTime(p.totalTime)} watched
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {Math.round(p.totalTime / 60)} min
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent activity */}
            {analytics.recentActivity.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="mb-4 text-sm font-semibold">Recent Activity</h2>
                <div className="space-y-3">
                  {analytics.recentActivity.map((act, i) => (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {act.title ?? "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(act.createdAt).toLocaleDateString("en-ZW", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {act.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {act.category}
                          </Badge>
                        )}
                        {act.watchDuration > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Math.round(act.watchDuration / 60)}min
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">No analytics yet</h2>
                <p className="text-sm text-muted-foreground">
                  Start watching Live TV or matches to generate insights.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button className="gradient-accent border-0 text-white" asChild>
                <Link href="/live-tv">Watch Live TV</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/sports">Browse Sports</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
