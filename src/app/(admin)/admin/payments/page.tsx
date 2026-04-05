"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, DollarSign, TrendingUp, CreditCard, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api, showApiError } from "@/lib/api";

interface PaymentRow {
  id: string;
  amount: string;
  provider: string;
  status: string;
  transactionRef: string | null;
  createdAt: string;
  userEmail: string;
  userName: string | null;
  userCity: string | null;
  userGender: string | null;
  match: string;
}

interface Summary {
  totalRevenue: number;
  avgPayment: number;
  providerSplit: Record<string, number>;
  completedCount: number;
}

const statusColors: Record<string, string> = {
  COMPLETED: "border-green-500/30 bg-green-500/10 text-green-400",
  PENDING: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  FAILED: "border-red-500/30 bg-red-500/10 text-red-400",
};

const selectClass =
  "flex h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [color-scheme:dark]";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (providerFilter) params.set("provider", providerFilter);
      if (cityFilter) params.set("city", cityFilter);
      if (genderFilter) params.set("gender", genderFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("page", String(page));
      const q = `?${params}`;
      const data = await api<{
        payments: PaymentRow[];
        total: number;
        totalPages: number;
        summary: Summary;
      }>(`/api/admin/payments${q}`);
      setPayments(data.payments ?? []);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSummary(data.summary);
    } catch (err) {
      showApiError(err, "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, providerFilter, cityFilter, genderFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, providerFilter, cityFilter, genderFilter, dateFrom, dateTo]);

  const hasFilters = statusFilter || providerFilter || cityFilter || genderFilter || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {summary && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Total Revenue
            </div>
            <p className="text-xl font-bold">${summary.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Avg. Payment
            </div>
            <p className="text-xl font-bold">${summary.avgPayment.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Hash className="h-3.5 w-3.5" /> Completed
            </div>
            <p className="text-xl font-bold">{summary.completedCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CreditCard className="h-3.5 w-3.5" /> Provider Split
            </div>
            <div className="flex gap-2 mt-1">
              {Object.entries(summary.providerSplit).map(([prov, amt]) => (
                <Badge key={prov} variant="outline" className="text-[9px]">
                  {prov}: ${amt.toFixed(0)}
                </Badge>
              ))}
              {Object.keys(summary.providerSplit).length === 0 && (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          Payments
          <span className="ml-2 text-sm font-normal text-muted-foreground">({total})</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className={selectClass}>
            <option value="">All Providers</option>
            <option value="ECOCASH">EcoCash</option>
            <option value="PAYNOW">Paynow</option>
          </select>
          <input type="text" placeholder="City" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={`${selectClass} w-24`} />
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className={selectClass}>
            <option value="">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={selectClass} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={selectClass} />
          {hasFilters && (
            <button
              onClick={() => { setStatusFilter(""); setProviderFilter(""); setCityFilter(""); setGenderFilter(""); setDateFrom(""); setDateTo(""); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No payments found.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">User</th>
                <th className="px-5 py-2.5 font-medium">Match</th>
                <th className="px-5 py-2.5 font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Provider</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Ref</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium">{p.userName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.userEmail}</p>
                    {p.userCity && <p className="text-[10px] text-muted-foreground">{p.userCity}</p>}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.match}</td>
                  <td className="px-5 py-3 font-medium">${p.amount}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className="text-[10px]">{p.provider}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[p.status] ?? ""}`}>{p.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{p.transactionRef ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString("en-ZW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border px-3 py-1 text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-border px-3 py-1 text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
