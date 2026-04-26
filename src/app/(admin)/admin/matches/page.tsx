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
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, showApiError } from "@/lib/api";
import { toast } from "sonner";
import type { MatchPhase } from "@/lib/match-window";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  price: string;
  streamKey: string;
  isLive: boolean;
  phase?: MatchPhase;
  zplsFixtureId?: string | null;
}

interface ZplsFixture {
  id: string;
  home_name: string;
  away_name: string;
  date: string;
  time: string;
  location: string;
  round: string;
}

interface ConflictProgram {
  id: string;
  title: string;
  category: string;
  blackout: boolean;
  matchId: string | null;
  startTime: string;
  endTime: string;
}

interface ConflictSummary {
  match: { id: string; title: string; kickoff: string };
  window: { start: string; end: string };
  conflicts: ConflictProgram[];
}

const emptyForm = {
  homeTeam: "",
  awayTeam: "",
  kickoff: "",
  price: "",
  streamKey: "",
  zplsFixtureId: "",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoToLocalInputValue(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [resolverOpen, setResolverOpen] = useState(false);
  const [resolverLoading, setResolverLoading] = useState(false);
  const [resolverError, setResolverError] = useState<string | null>(null);
  const [resolverData, setResolverData] = useState<ConflictSummary | null>(null);
  const [resolverAction, setResolverAction] = useState<"delete" | "shift">("delete");
  const [shiftMinutes, setShiftMinutes] = useState(60);
  const [zplsFixtures, setZplsFixtures] = useState<ZplsFixture[]>([]);
  const [zplsLoading, setZplsLoading] = useState(false);
  const [zplsSearch, setZplsSearch] = useState("");

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
      kickoff: isoToLocalInputValue(m.kickoff),
      price: m.price,
      streamKey: m.streamKey,
      zplsFixtureId: m.zplsFixtureId ?? "",
    });
    setEditingId(m.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function openResolver(matchId: string) {
    setResolverOpen(true);
    setResolverLoading(true);
    setResolverError(null);
    setResolverData(null);
    try {
      const data = await api<ConflictSummary>(
        `/api/admin/force-create-program?matchId=${encodeURIComponent(matchId)}`
      );
      setResolverData(data);
    } catch (err) {
      setResolverError((err as Error)?.message ?? "Failed to load conflicts");
    } finally {
      setResolverLoading(false);
    }
  }

  async function applyResolver() {
    if (!resolverData) return;
    setResolverLoading(true);
    setResolverError(null);
    try {
      const payload = {
        matchId: resolverData.match.id,
        action: resolverAction,
        ...(resolverAction === "shift"
          ? { shiftForwardMs: shiftMinutes * 60_000 }
          : {}),
      };
      const res = await api<{ programId?: string; conflictsResolved?: number }>(
        "/api/admin/force-create-program",
        { method: "POST", body: payload }
      );
      toast.success("SPORTS program created");
      if (typeof res.conflictsResolved === "number" && res.conflictsResolved > 0) {
        toast.message(`Resolved ${res.conflictsResolved} conflict(s)`);
      }
      setResolverOpen(false);
      setResolverData(null);
      await loadMatches();
    } catch (err) {
      setResolverError((err as Error)?.message ?? "Failed to apply resolution");
    } finally {
      setResolverLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        kickoff: new Date(form.kickoff).toISOString(),
        price: parseFloat(form.price),
        zplsFixtureId: form.zplsFixtureId || null,
      };
      if (editingId) {
        const result = await api<{ id: string; programWarning?: string }>(`/api/admin/matches/${editingId}`, {
          method: "PATCH",
          body: payload,
        });
        toast.success("Match updated");
        if (result.programWarning) {
          toast.warning(result.programWarning);
          void openResolver(result.id);
        }
      } else {
        const result = await api<{ id: string; programWarning?: string }>("/api/admin/matches", {
          method: "POST",
          body: payload,
        });
        toast.success("Match created — program auto-linked");
        if (result.programWarning) {
          toast.warning(result.programWarning);
          void openResolver(result.id);
        }
      }
      closeForm();
      await loadMatches();
    } catch (err) {
      showApiError(err, "Failed to save match");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadZplsFixtures() {
    setZplsLoading(true);
    try {
      const data = await api<{ fixtures: ZplsFixture[] }>("/api/zpls/fixtures");
      setZplsFixtures(data.fixtures ?? []);
    } catch {
      toast.error("Failed to load ZPLS fixtures");
    } finally {
      setZplsLoading(false);
    }
  }

  function selectFixture(fixture: ZplsFixture) {
    setForm({
      ...form,
      homeTeam: fixture.home_name,
      awayTeam: fixture.away_name,
      kickoff: `${fixture.date}T${fixture.time.slice(0, 5)}`,
      zplsFixtureId: fixture.id,
    });
    setZplsSearch("");
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
            {/* ZPLS Fixture Picker */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Link ZPLS Fixture (optional)</Label>
              {form.zplsFixtureId ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm">
                  <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400 text-[10px]">
                    LINKED
                  </Badge>
                  <span className="text-muted-foreground">Fixture #{form.zplsFixtureId}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6"
                    onClick={() => setForm({ ...form, zplsFixtureId: "" })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadZplsFixtures}
                      disabled={zplsLoading}
                    >
                      {zplsLoading ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Search className="mr-1 h-3 w-3" />
                      )}
                      Load ZPLS Fixtures
                    </Button>
                    {zplsFixtures.length > 0 && (
                      <Input
                        placeholder="Filter fixtures..."
                        className="max-w-[200px] h-8 text-xs"
                        value={zplsSearch}
                        onChange={(e) => setZplsSearch(e.target.value)}
                      />
                    )}
                  </div>
                  {zplsFixtures.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                      {zplsFixtures
                        .filter((f) => {
                          if (!zplsSearch) return true;
                          const q = zplsSearch.toLowerCase();
                          return f.home_name.toLowerCase().includes(q) || f.away_name.toLowerCase().includes(q);
                        })
                        .map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/50 border-b border-border last:border-0"
                            onClick={() => selectFixture(f)}
                          >
                            <span className="font-medium">{f.home_name} vs {f.away_name}</span>
                            <span className="text-muted-foreground">{f.date} • R{f.round}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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

      {/* Conflict Resolver */}
      {resolverOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            if (!resolverLoading) {
              setResolverOpen(false);
              setResolverData(null);
              setResolverError(null);
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl rounded-xl border border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Scheduling Conflict</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (!resolverLoading) {
                    setResolverOpen(false);
                    setResolverData(null);
                    setResolverError(null);
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {resolverLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading conflicts...
              </div>
            )}

            {!resolverLoading && resolverData && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  The match{" "}
                  <span className="font-medium text-foreground">{resolverData.match.title}</span>{" "}
                  overlaps{" "}
                  <span className="font-medium text-foreground">{resolverData.conflicts.length}</span>{" "}
                  program(s).
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={resolverAction === "delete"}
                      onChange={() => setResolverAction("delete")}
                    />
                    Delete conflicts
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={resolverAction === "shift"}
                      onChange={() => setResolverAction("shift")}
                    />
                    Shift conflicts
                  </label>
                  {resolverAction === "shift" && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">by</span>
                      <Input
                        type="number"
                        min="5"
                        step="5"
                        value={shiftMinutes}
                        onChange={(e) =>
                          setShiftMinutes(parseInt(e.target.value || "60", 10))
                        }
                        className="h-8 w-20"
                      />
                      <span className="text-muted-foreground">minutes</span>
                    </div>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
                  {resolverData.conflicts.map((c) => (
                    <div
                      key={c.id}
                      className="border-b border-border px-3 py-2 last:border-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.startTime).toLocaleString()} →{" "}
                            {new Date(c.endTime).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {c.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resolverError && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {resolverError}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={resolverLoading}
                onClick={() => {
                  setResolverOpen(false);
                  setResolverData(null);
                  setResolverError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="gradient-accent border-0 text-white"
                disabled={resolverLoading || !resolverData}
                onClick={applyResolver}
              >
                {resolverLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Apply
              </Button>
            </div>
          </motion.div>
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
                    <div className="flex flex-col gap-1">
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
                      {m.phase && m.phase !== "UPCOMING" && (
                        <span className={`text-[10px] ${
                          m.phase === "LIVE" && !m.isLive
                            ? "font-semibold text-amber-400"
                            : "text-muted-foreground"
                        }`}>
                          {m.phase === "LIVE" && !m.isLive
                            ? "⚠ Should be live"
                            : m.phase}
                        </span>
                      )}
                    </div>
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
