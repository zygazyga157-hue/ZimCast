"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Trophy,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, showApiError } from "@/lib/api";
import { toast } from "sonner";

/* ---------- types ---------- */

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  gender: string | null;
  city: string | null;
  interests: string[];
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  passCount: number;
  paymentCount: number;
}

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  city: string | null;
  country: string | null;
  role: string;
  isActive: boolean;
  interests: string[];
  lastLoginAt: string | null;
  createdAt: string;
  passes: { matchId: string; expiresAt: string; createdAt: string; match: { id: string; homeTeam: string; awayTeam: string; kickoff: string; isLive: boolean } }[];
  payments: { id: string; amount: string; provider: string; status: string; createdAt: string; match: string }[];
  watchStats: { totalWatchTime: number; sessionCount: number; favoriteCategory: string };
}

interface Summary {
  total: number;
  activeCount: number;
  byCity: Record<string, number>;
  byGender: Record<string, number>;
}

const ALL_INTERESTS = [
  "FOOTBALL", "MUSIC", "NEWS", "ENTERTAINMENT", "DOCUMENTARY",
  "COMEDY", "GAMING", "TRAVEL", "FOOD", "TECH", "FASHION",
  "FITNESS", "ART",
];

const statusColors: Record<string, string> = {
  COMPLETED: "border-green-500/30 bg-green-500/10 text-green-400",
  PENDING: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  FAILED: "border-red-500/30 bg-red-500/10 text-red-400",
};

/* ---------- select style ---------- */
const selectClass =
  "flex h-8 rounded-lg border border-input bg-transparent px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [color-scheme:dark]";

/* ---------- component ---------- */

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [interestFilter, setInterestFilter] = useState("");

  // Detail panel
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Editing
  const [editForm, setEditForm] = useState<{
    name: string;
    phone: string;
    city: string;
    gender: string;
    role: string;
    isActive: boolean;
    interests: string[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (cityFilter) params.set("city", cityFilter);
      if (genderFilter) params.set("gender", genderFilter);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("isActive", statusFilter);
      if (interestFilter) params.set("interest", interestFilter);
      params.set("page", String(page));
      params.set("limit", "50");
      const q = params.toString() ? `?${params}` : "";
      const data = await api<{
        users: AdminUser[];
        total: number;
        page: number;
        totalPages: number;
        summary: Summary;
      }>(`/api/admin/users${q}`);
      setUsers(data.users ?? []);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSummary(data.summary);
    } catch (err) {
      showApiError(err, "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, cityFilter, genderFilter, roleFilter, statusFilter, interestFilter, page]);

  useEffect(() => {
    setLoading(true);
    loadUsers();
  }, [loadUsers]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setSearchInput("");
    setCityFilter("");
    setGenderFilter("");
    setRoleFilter("");
    setStatusFilter("");
    setInterestFilter("");
    setPage(1);
  }

  const hasFilters = search || cityFilter || genderFilter || roleFilter || statusFilter || interestFilter;

  // Load user detail
  async function openDetail(userId: string) {
    setSelectedUserId(userId);
    setDetailLoading(true);
    setDetail(null);
    setEditForm(null);
    try {
      const data = await api<UserDetail>(`/api/admin/users/${userId}`);
      setDetail(data);
      setEditForm({
        name: data.name ?? "",
        phone: data.phone ?? "",
        city: data.city ?? "",
        gender: data.gender ?? "",
        role: data.role,
        isActive: data.isActive,
        interests: data.interests ?? [],
      });
    } catch (err) {
      showApiError(err, "Failed to load user detail");
      setSelectedUserId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveProfile() {
    if (!selectedUserId || !editForm || !detail) return;
    // Confirm role demotion
    if (detail.role === "ADMIN" && editForm.role === "USER") {
      if (!confirm(`Demote ${detail.email} from ADMIN to USER?`)) return;
    }
    setSaving(true);
    try {
      await api(`/api/admin/users/${selectedUserId}`, {
        method: "PATCH",
        body: editForm,
      });
      toast.success("Profile updated");
      // Refresh
      loadUsers();
      openDetail(selectedUserId);
    } catch (err) {
      showApiError(err, "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRole(user: AdminUser) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (newRole === "USER" && !confirm(`Demote ${user.email} from ADMIN to USER?`)) return;
    try {
      await api(`/api/admin/users/${user.id}`, { method: "PATCH", body: { role: newRole } });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      toast.success(`${user.email} set to ${newRole}`);
    } catch (err) {
      showApiError(err, "Failed to update role");
    }
  }

  async function toggleActive(user: AdminUser) {
    try {
      await api(`/api/admin/users/${user.id}`, { method: "PATCH", body: { isActive: !user.isActive } });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
      toast.success(user.isActive ? `${user.email} deactivated` : `${user.email} activated`);
    } catch (err) {
      showApiError(err, "Failed to update user");
    }
  }

  // Unique cities for filter dropdown
  const cities = summary ? Object.keys(summary.byCity).sort() : [];
  const genders = summary ? Object.keys(summary.byGender).sort() : [];

  function formatWatchTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Users", value: summary.total, color: "text-blue-400" },
            { label: "Active", value: summary.activeCount, color: "text-green-400" },
            { label: "Top City", value: Object.entries(summary.byCity).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—", color: "text-purple-400" },
            {
              label: "Gender Split",
              value: Object.entries(summary.byGender).map(([g, c]) => `${g}: ${c}`).join(", ") || "—",
              color: "text-amber-400",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-medium text-muted-foreground">{s.label}</p>
              <p className={`mt-1 text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search email or name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-8 w-44 text-xs"
          />
          <Button type="submit" variant="outline" size="sm" className="h-8">
            <Search className="h-3.5 w-3.5" />
          </Button>
        </form>

        <select value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All Cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All Genders</option>
          {genders.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <select value={interestFilter} onChange={(e) => { setInterestFilter(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All Interests</option>
          {ALL_INTERESTS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
            Clear
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {total} user{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        {users.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No users found.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">City</th>
                <th className="px-4 py-2.5 font-medium">Gender</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Interests</th>
                <th className="px-4 py-2.5 font-medium">Passes</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-border last:border-0 ${!u.isActive ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.city ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.gender ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${u.role === "ADMIN" ? "border-primary/30 bg-primary/10 text-primary" : ""}`}
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${u.isActive ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.interests.slice(0, 3).map((i) => (
                        <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">
                          {i}
                        </Badge>
                      ))}
                      {u.interests.length > 3 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          +{u.interests.length - 3}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.passCount}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("en-ZW", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(u.id)} title="View details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleRole(u)} title={u.role === "ADMIN" ? "Demote" : "Promote"}>
                        {u.role === "ADMIN" ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${u.isActive ? "text-destructive hover:text-destructive" : "text-green-500 hover:text-green-500"}`}
                        onClick={() => toggleActive(u)}
                        title={u.isActive ? "Deactivate" : "Activate"}
                      >
                        {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Slide-out Detail Panel */}
      <AnimatePresence>
        {selectedUserId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setSelectedUserId(null)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-border bg-background shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-5 py-3 backdrop-blur-xl">
                <h3 className="text-sm font-semibold">User Details</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUserId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {detailLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : detail && editForm ? (
                <div className="space-y-5 p-5">
                  {/* Profile header */}
                  <div>
                    <h4 className="text-lg font-bold">{detail.name ?? detail.email}</h4>
                    <p className="text-xs text-muted-foreground">{detail.email}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline" className={`text-[10px] ${detail.role === "ADMIN" ? "border-primary/30 bg-primary/10 text-primary" : ""}`}>
                        {detail.role}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${detail.isActive ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
                        {detail.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* Watch Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Watch Time", value: formatWatchTime(detail.watchStats.totalWatchTime), icon: Clock },
                      { label: "Sessions", value: detail.watchStats.sessionCount, icon: Trophy },
                      { label: "Fav. Category", value: detail.watchStats.favoriteCategory, icon: Heart },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-border bg-card/50 p-3 text-center">
                        <s.icon className="mx-auto h-4 w-4 text-muted-foreground" />
                        <p className="mt-1 text-sm font-bold">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Editable Profile */}
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground">Edit Profile</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Name</label>
                        <Input className="h-8 text-xs" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Phone</label>
                        <Input className="h-8 text-xs" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">City</label>
                        <Input className="h-8 text-xs" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Gender</label>
                        <select className={`${selectClass} w-full`} value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                          <option value="">—</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Role</label>
                        <select className={`${selectClass} w-full`} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Status</label>
                        <select className={`${selectClass} w-full`} value={editForm.isActive ? "active" : "inactive"} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "active" })}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Interests</label>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {ALL_INTERESTS.map((i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setEditForm((prev) => {
                                if (!prev) return prev;
                                const has = prev.interests.includes(i);
                                return { ...prev, interests: has ? prev.interests.filter((x) => x !== i) : [...prev.interests, i] };
                              });
                            }}
                            className={`rounded-lg border px-2 py-0.5 text-[10px] transition-colors ${
                              editForm.interests.includes(i)
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" className="w-full gradient-accent border-0 text-white" onClick={saveProfile} disabled={saving}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
                    </Button>
                  </div>

                  {/* Passes */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Trophy className="h-3.5 w-3.5" /> Passes ({detail.passes.length})
                    </h4>
                    {detail.passes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No passes.</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.passes.map((p) => (
                          <div key={p.matchId} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2.5 text-xs">
                            <div>
                              <p className="font-medium">{p.match.homeTeam} vs {p.match.awayTeam}</p>
                              <p className="text-muted-foreground">
                                {new Date(p.match.kickoff).toLocaleDateString("en-ZW", { month: "short", day: "numeric" })}
                              </p>
                            </div>
                            <Badge variant="outline" className={`text-[9px] ${new Date(p.expiresAt) > new Date() ? "border-green-500/30 bg-green-500/10 text-green-400" : "text-muted-foreground"}`}>
                              {new Date(p.expiresAt) > new Date() ? "Active" : "Expired"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payments */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5" /> Payments ({detail.payments.length})
                    </h4>
                    {detail.payments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No payments.</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2.5 text-xs">
                            <div>
                              <p className="font-medium">${p.amount} — {p.match}</p>
                              <p className="text-muted-foreground">
                                {p.provider} • {new Date(p.createdAt).toLocaleDateString("en-ZW", { month: "short", day: "numeric" })}
                              </p>
                            </div>
                            <Badge variant="outline" className={`text-[9px] ${statusColors[p.status] ?? ""}`}>
                              {p.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="text-[10px] text-muted-foreground space-y-1">
                    <p>Joined: {new Date(detail.createdAt).toLocaleDateString("en-ZW", { dateStyle: "medium" })}</p>
                    <p>Last login: {detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleDateString("en-ZW", { dateStyle: "medium" }) : "Never"}</p>
                    {detail.dateOfBirth && <p>DOB: {new Date(detail.dateOfBirth).toLocaleDateString("en-ZW", { dateStyle: "medium" })}</p>}
                    {detail.country && <p>Country: {detail.country}</p>}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
