"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
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
  match: string;
}

const statusColors: Record<string, string> = {
  COMPLETED: "border-green-500/30 bg-green-500/10 text-green-400",
  PENDING: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  FAILED: "border-red-500/30 bg-red-500/10 text-red-400",
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");

  const loadPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (providerFilter) params.set("provider", providerFilter);
      const q = params.toString() ? `?${params}` : "";
      const data = await api<{ payments: PaymentRow[] }>(
        `/api/admin/payments${q}`
      );
      setPayments(data.payments ?? []);
    } catch (err) {
      showApiError(err, "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, providerFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const selectClass =
    "flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [color-scheme:dark]";

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Payments ({payments.length})</h2>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setLoading(true);
            }}
            className={selectClass}
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={providerFilter}
            onChange={(e) => {
              setProviderFilter(e.target.value);
              setLoading(true);
            }}
            className={selectClass}
          >
            <option value="">All Providers</option>
            <option value="ECOCASH">EcoCash</option>
            <option value="PAYNOW">Paynow</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {payments.length === 0 ? (
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
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0"
                >
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
                    <Badge variant="outline" className="text-[10px]">
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
                  <td className="px-5 py-3 text-xs text-muted-foreground font-mono">
                    {p.transactionRef ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
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
        )}
      </div>
    </div>
  );
}
