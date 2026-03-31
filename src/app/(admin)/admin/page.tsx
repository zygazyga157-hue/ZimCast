"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Users,
  Trophy,
  Clock,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api, showApiError } from "@/lib/api";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  liveMatches: number;
  totalMatches: number;
  pendingPayments: number;
  totalRevenue: string;
  recentPayments: {
    id: string;
    amount: string;
    provider: string;
    status: string;
    createdAt: string;
    userEmail: string;
    userName: string | null;
    match: string;
  }[];
}

const statusColors: Record<string, string> = {
  COMPLETED: "border-green-500/30 bg-green-500/10 text-green-400",
  PENDING: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  FAILED: "border-red-500/30 bg-red-500/10 text-red-400",
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Stats>("/api/admin/stats")
      .then(setStats)
      .catch((err) => showApiError(err, "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    {
      label: "Total Revenue",
      value: `$${parseFloat(stats.totalRevenue).toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-400",
    },
    {
      label: "Active Users (30d)",
      value: stats.activeUsers,
      icon: Users,
      color: "text-purple-400",
    },
    {
      label: "Live Matches",
      value: `${stats.liveMatches} / ${stats.totalMatches}`,
      icon: Trophy,
      color: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Pending Payments Alert */}
      {stats.pendingPayments > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-5 py-3">
          <Clock className="h-4 w-4 text-yellow-400" />
          <p className="text-sm">
            <span className="font-semibold text-yellow-400">
              {stats.pendingPayments}
            </span>{" "}
            pending payment{stats.pendingPayments !== 1 && "s"} awaiting
            confirmation.
          </p>
        </div>
      )}

      {/* Recent Payments */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Recent Payments</h2>
        </div>
        {stats.recentPayments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No payments yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">User</th>
                  <th className="px-5 py-2.5 font-medium">Match</th>
                  <th className="px-5 py-2.5 font-medium">Amount</th>
                  <th className="px-5 py-2.5 font-medium">Provider</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium">{p.userName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.userEmail}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {p.match}
                    </td>
                    <td className="px-5 py-3 font-medium">${p.amount}</td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                      >
                        {p.provider}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${statusColors[p.status] ?? ""}`}
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("en-ZW", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
