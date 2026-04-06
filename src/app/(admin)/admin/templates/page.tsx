"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Play,
  Pause,
  CalendarPlus,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, showApiError } from "@/lib/api";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  channel: string;
  title: string;
  description: string | null;
  category: string;
  blackout: boolean;
  startHour: number;
  startMinute: number;
  durationMin: number;
  daysOfWeek: number[];
  isActive: boolean;
}

const categories = [
  "NEWS", "SPORTS", "ENTERTAINMENT", "MUSIC", "DOCUMENTARY",
  "GAMING", "TRAVEL", "FOOD", "TECH", "FASHION", "FITNESS", "ART",
];

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const emptyForm = {
  name: "",
  channel: "ZBCTV",
  title: "",
  description: "",
  category: "ENTERTAINMENT",
  blackout: false,
  startHour: 6,
  startMinute: 0,
  durationMin: 60,
  daysOfWeek: [1, 2, 3, 4, 5] as number[], // Mon-Fri
};

function formatTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Generate dialog
  const [generateId, setGenerateId] = useState<string | null>(null);
  const [genStartDate, setGenStartDate] = useState("");
  const [genEndDate, setGenEndDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{
    created: number;
    errors: { row: number; message: string }[];
    message?: string;
  } | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await api<{ templates: Template[] }>("/api/admin/templates");
      setTemplates(data.templates ?? []);
    } catch (err) {
      showApiError(err, "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setForm({
      name: t.name,
      channel: t.channel,
      title: t.title,
      description: t.description ?? "",
      category: t.category,
      blackout: t.blackout,
      startHour: t.startHour,
      startMinute: t.startMinute,
      durationMin: t.durationMin,
      daysOfWeek: [...t.daysOfWeek],
    });
    setEditingId(t.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleDay(day: number) {
    setForm((prev) => {
      const days = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort();
      return { ...prev, daysOfWeek: days };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.daysOfWeek.length === 0) {
      toast.error("Select at least one day");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        ...form,
        description: form.description || null,
        startHour: Number(form.startHour),
        startMinute: Number(form.startMinute),
        durationMin: Number(form.durationMin),
      };
      if (editingId) {
        await api(`/api/admin/templates/${editingId}`, { method: "PATCH", body });
        toast.success("Template updated");
      } else {
        await api("/api/admin/templates", { method: "POST", body });
        toast.success("Template created");
      }
      closeForm();
      await loadTemplates();
    } catch (err) {
      showApiError(err, "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await api(`/api/admin/templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch (err) {
      showApiError(err, "Failed to delete template");
    }
  }

  async function toggleActive(t: Template) {
    try {
      await api(`/api/admin/templates/${t.id}`, {
        method: "PATCH",
        body: { isActive: !t.isActive },
      });
      setTemplates((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, isActive: !x.isActive } : x))
      );
      toast.success(t.isActive ? "Template paused" : "Template activated");
    } catch (err) {
      showApiError(err, "Failed to toggle template");
    }
  }

  function openGenerate(id: string) {
    // Default: next 7 days
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 6);
    setGenStartDate(today.toISOString().slice(0, 10));
    setGenEndDate(nextWeek.toISOString().slice(0, 10));
    setGenResult(null);
    setGenerateId(id);
  }

  async function handleGenerate() {
    if (!generateId) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const data = await api<{
        created: number;
        errors: { row: number; message: string }[];
        message?: string;
      }>(`/api/admin/templates/${generateId}/generate`, {
        method: "POST",
        body: { startDate: genStartDate, endDate: genEndDate },
      });
      setGenResult(data);
      if (data.created > 0) {
        toast.success(`Generated ${data.created} program(s)`);
      } else if (data.message) {
        toast.info(data.message);
      }
    } catch (err) {
      showApiError(err, "Failed to generate programs");
    } finally {
      setGenerating(false);
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
        <h2 className="text-lg font-semibold">Recurring Templates</h2>
        <Button
          size="sm"
          className="gradient-accent border-0 text-white"
          onClick={openCreate}
        >
          <Plus className="mr-1 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Generate Dialog */}
      {generateId && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" />
              Generate Programs
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setGenerateId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={genStartDate}
                onChange={(e) => setGenStartDate(e.target.value)}
                className="h-9 w-auto"
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input
                type="date"
                value={genEndDate}
                onChange={(e) => setGenEndDate(e.target.value)}
                className="h-9 w-auto"
              />
            </div>
            <Button
              size="sm"
              className="gradient-accent border-0 text-white"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </div>
          {genResult && (
            <div className="mt-3 flex items-center gap-3 text-sm">
              {genResult.created > 0 && (
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {genResult.created} created
                </span>
              )}
              {genResult.errors.length > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  {genResult.errors.length} error(s): {genResult.errors[0].message}
                </span>
              )}
              {genResult.message && (
                <span className="text-muted-foreground">{genResult.message}</span>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Form Panel */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {editingId ? "Edit Template" : "New Template"}
            </h3>
            <Button variant="ghost" size="icon" onClick={closeForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Template Name</Label>
              <Input
                id="tpl-name"
                placeholder='e.g. "Morning News Block"'
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-title">Program Title</Label>
              <Input
                id="tpl-title"
                placeholder="Title for generated programs"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-channel">Channel</Label>
              <Input
                id="tpl-channel"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-category">Category</Label>
              <select
                id="tpl-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring scheme-dark"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Time <span className="text-xs text-muted-foreground">(CAT)</span></Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={form.startHour}
                  onChange={(e) => setForm({ ...form, startHour: Number(e.target.value) })}
                  className="w-20"
                  placeholder="HH"
                />
                <span className="text-muted-foreground">:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  value={form.startMinute}
                  onChange={(e) => setForm({ ...form, startMinute: Number(e.target.value) })}
                  className="w-20"
                  placeholder="MM"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-duration">Duration (minutes)</Label>
              <Input
                id="tpl-duration"
                type="number"
                min={1}
                max={1440}
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-1.5">
                {dayLabels.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      form.daysOfWeek.includes(i)
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tpl-desc">Description</Label>
              <Input
                id="tpl-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.blackout}
                  onChange={(e) => setForm({ ...form, blackout: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <div>
                  <span className="text-sm font-medium">Blackout ZTV</span>
                  <p className="text-xs text-muted-foreground">Block free-to-air ZTV stream during generated programs</p>
                </div>
              </label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting} className="gradient-accent border-0 text-white">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Save Changes" : "Create Template"}
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Templates Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {templates.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No templates yet. Create one to auto-generate recurring programs.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Title</th>
                <th className="px-5 py-2.5 font-medium">Time</th>
                <th className="px-5 py-2.5 font-medium">Duration</th>
                <th className="px-5 py-2.5 font-medium">Days</th>
                <th className="px-5 py-2.5 font-medium">Category</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{t.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{t.title}</td>
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                    {formatTime(t.startHour, t.startMinute)}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{t.durationMin}m</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-0.5">
                      {dayLabels.map((label, i) => (
                        <span
                          key={i}
                          className={`inline-block w-6 text-center text-[10px] rounded ${
                            t.daysOfWeek.includes(i)
                              ? "bg-primary/20 text-primary font-medium"
                              : "text-muted-foreground/40"
                          }`}
                        >
                          {label.charAt(0)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        t.isActive
                          ? "border-green-500/30 bg-green-500/10 text-green-400"
                          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
                      }`}
                    >
                      {t.isActive ? "Active" : "Paused"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Generate programs"
                        onClick={() => openGenerate(t.id)}
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={t.isActive ? "Pause" : "Activate"}
                        onClick={() => toggleActive(t)}
                      >
                        {t.isActive ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteTemplate(t.id)}
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
