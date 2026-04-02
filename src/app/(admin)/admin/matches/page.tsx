"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Plus,
  Radio,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, showApiError } from "@/lib/api";
import { toast } from "sonner";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  price: string;
  streamKey: string;
  isLive: boolean;
}

const emptyForm = {
  homeTeam: "",
  awayTeam: "",
  kickoff: "",
  price: "",
  streamKey: "",
};

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadMatches = useCallback(async () => {
    try {
      const data = await api<{ matches: Match[] }>("/api/matches");
      setMatches(data.matches ?? []);
    } catch (err) {
      showApiError(err, "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(m: Match) {
    setForm({
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoff: m.kickoff.slice(0, 16),
      price: m.price,
      streamKey: m.streamKey,
    });
    setEditingId(m.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api(`/api/admin/matches/${editingId}`, {
          method: "PATCH",
          body: { ...form, price: parseFloat(form.price) },
        });
        toast.success("Match updated");
      } else {
        await api("/api/admin/matches", {
          method: "POST",
          body: { ...form, price: parseFloat(form.price) },
        });
        toast.success("Match created");
      }
      closeForm();
      await loadMatches();
    } catch (err) {
      showApiError(err, "Failed to save match");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLive(m: Match) {
    try {
      await api(`/api/admin/matches/${m.id}`, {
        method: "PATCH",
        body: { isLive: !m.isLive },
      });
      setMatches((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, isLive: !x.isLive } : x))
      );
      toast.success(m.isLive ? "Match set offline" : "Match set live");
    } catch (err) {
      showApiError(err, "Failed to toggle live");
    }
  }

  async function deleteMatch(id: string) {
    if (!confirm("Delete this match? This will also remove associated passes and payments."))
      return;
    try {
      await api(`/api/admin/matches/${id}`, { method: "DELETE" });
      setMatches((prev) => prev.filter((m) => m.id !== id));
      toast.success("Match deleted");
    } catch (err) {
      showApiError(err, "Failed to delete match");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Matches ({matches.length})</h2>
        <Button
          size="sm"
          className="gradient-accent border-0 text-white"
          onClick={openCreate}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Match
        </Button>
      </div>

      {/* Form Panel */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {editingId ? "Edit Match" : "New Match"}
            </h3>
            <Button variant="ghost" size="icon" onClick={closeForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="homeTeam">Home Team</Label>
              <Input
                id="homeTeam"
                value={form.homeTeam}
                onChange={(e) =>
                  setForm({ ...form, homeTeam: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="awayTeam">Away Team</Label>
              <Input
                id="awayTeam"
                value={form.awayTeam}
                onChange={(e) =>
                  setForm({ ...form, awayTeam: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kickoff">Kickoff</Label>
              <Input
                id="kickoff"
                type="datetime-local"
                value={form.kickoff}
                onChange={(e) =>
                  setForm({ ...form, kickoff: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="streamKey">Stream Key</Label>
              <Input
                id="streamKey"
                value={form.streamKey}
                onChange={(e) =>
                  setForm({ ...form, streamKey: e.target.value })
                }
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={submitting}
                className="gradient-accent border-0 text-white"
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId ? "Save Changes" : "Create Match"}
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {matches.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No matches. Click &quot;Add Match&quot; to create one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Match</th>
                <th className="px-5 py-2.5 font-medium">Kickoff</th>
                <th className="px-5 py-2.5 font-medium">Price</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-5 py-3 font-medium">
                    {m.homeTeam} vs {m.awayTeam}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(m.kickoff).toLocaleDateString("en-ZW", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3">${m.price}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleLive(m)}>
                      {m.isLive ? (
                        <Badge
                          variant="outline"
                          className="cursor-pointer border-red-500/30 bg-red-500/10 text-red-400 text-[10px]"
                        >
                          <Radio className="mr-1 h-2.5 w-2.5 animate-pulse" />
                          LIVE
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="cursor-pointer text-[10px]"
                        >
                          OFFLINE
                        </Badge>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(m)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMatch(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
