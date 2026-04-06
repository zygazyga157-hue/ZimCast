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

interface Program {
  id: string;
  channel: string;
  title: string;
  description: string | null;
  category: string;
  startTime: string;
  endTime: string;
  isLive: boolean;
  matchId: string | null;
  match?: { id: string; homeTeam: string; awayTeam: string } | null;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
}

const categories = [
  "NEWS",
  "SPORTS",
  "ENTERTAINMENT",
  "MUSIC",
  "DOCUMENTARY",
  "GAMING",
  "TRAVEL",
  "FOOD",
  "TECH",
  "FASHION",
  "FITNESS",
  "ART",
];

const emptyForm = {
  channel: "ZBCTV",
  title: "",
  description: "",
  category: "ENTERTAINMENT",
  startTime: "",
  endTime: "",
  matchId: "",
};

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadPrograms = useCallback(async () => {
    try {
      const data = await api<{ programs: Program[] }>(
        `/api/admin/programs?date=${dateFilter}`
      );
      setPrograms(data.programs ?? []);
    } catch (err) {
      showApiError(err, "Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    api<{ matches: Match[] }>("/api/matches")
      .then((d) => setMatches(d.matches ?? []))
      .catch(() => {});
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(p: Program) {
    setForm({
      channel: p.channel,
      title: p.title,
      description: p.description ?? "",
      category: p.category,
      startTime: p.startTime.slice(0, 16),
      endTime: p.endTime.slice(0, 16),
      matchId: p.matchId ?? "",
    });
    setEditingId(p.id);
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
      const body = {
        ...form,
        matchId: form.matchId || null,
        description: form.description || null,
      };
      if (editingId) {
        await api(`/api/admin/programs/${editingId}`, {
          method: "PATCH",
          body,
        });
        toast.success("Program updated");
      } else {
        await api("/api/admin/programs", { method: "POST", body });
        toast.success("Program created");
      }
      closeForm();
      await loadPrograms();
    } catch (err) {
      showApiError(err, "Failed to save program");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteProgram(id: string) {
    if (!confirm("Delete this program?")) return;
    try {
      await api(`/api/admin/programs/${id}`, { method: "DELETE" });
      setPrograms((prev) => prev.filter((p) => p.id !== id));
      toast.success("Program deleted");
    } catch (err) {
      showApiError(err, "Failed to delete program");
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Programs</h2>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setLoading(true);
            }}
            className="h-8 w-auto text-xs"
          />
        </div>
        <Button
          size="sm"
          className="gradient-accent border-0 text-white"
          onClick={openCreate}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Program
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
              {editingId ? "Edit Program" : "New Program"}
            </h3>
            <Button variant="ghost" size="icon" onClick={closeForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="channel">Channel</Label>
              <Input
                id="channel"
                value={form.channel}
                onChange={(e) =>
                  setForm({ ...form, channel: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [color-scheme:dark]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="matchId">Linked Match (optional)</Label>
              <select
                id="matchId"
                value={form.matchId}
                onChange={(e) =>
                  setForm({ ...form, matchId: e.target.value })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [color-scheme:dark]"
              >
                <option value="">None</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.homeTeam} vs {m.awayTeam}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={form.endTime}
                onChange={(e) =>
                  setForm({ ...form, endTime: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
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
                {editingId ? "Save Changes" : "Create Program"}
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {programs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No programs for this date.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Time</th>
                <th className="px-5 py-2.5 font-medium">Title</th>
                <th className="px-5 py-2.5 font-medium">Category</th>
                <th className="px-5 py-2.5 font-medium">Channel</th>
                <th className="px-5 py-2.5 font-medium">Match</th>
                <th className="px-5 py-2.5 font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => {
                const start = new Date(p.startTime);
                const end = new Date(p.endTime);
                const now = new Date();
                const isNow = start <= now && end > now;
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-0 ${
                      isNow ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {start.toLocaleTimeString("en-ZW", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}{" "}
                      –{" "}
                      {end.toLocaleTimeString("en-ZW", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                      {isNow && (
                        <Radio className="ml-1.5 inline h-3 w-3 animate-pulse text-red-400" />
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium">{p.title}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {p.category}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {p.channel}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {p.match
                        ? `${p.match.homeTeam} vs ${p.match.awayTeam}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteProgram(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
