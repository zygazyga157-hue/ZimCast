"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Search,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, showApiError } from "@/lib/api";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  passCount: number;
  paymentCount: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await api<{ users: AdminUser[] }>(`/api/admin/users${q}`);
      setUsers(data.users ?? []);
    } catch (err) {
      showApiError(err, "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setLoading(true);
  }

  async function toggleRole(user: AdminUser) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (
      newRole === "USER" &&
      !confirm(`Demote ${user.email} from ADMIN to USER?`)
    )
      return;
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: { role: newRole },
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      toast.success(`${user.email} set to ${newRole}`);
    } catch (err) {
      showApiError(err, "Failed to update role");
    }
  }

  async function toggleActive(user: AdminUser) {
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: { isActive: !user.isActive },
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u
        )
      );
      toast.success(
        user.isActive ? `${user.email} deactivated` : `${user.email} activated`
      );
    } catch (err) {
      showApiError(err, "Failed to update user");
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
        <h2 className="text-lg font-semibold">Users ({users.length})</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search email or name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-8 w-48 text-xs"
          />
          <Button type="submit" variant="outline" size="sm" className="h-8">
            <Search className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {users.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No users found.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">User</th>
                <th className="px-5 py-2.5 font-medium">Role</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Passes</th>
                <th className="px-5 py-2.5 font-medium">Last Login</th>
                <th className="px-5 py-2.5 font-medium">Joined</th>
                <th className="px-5 py-2.5 font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-border last:border-0 ${
                    !u.isActive ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <p className="font-medium">{u.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        u.role === "ADMIN"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : ""
                      }`}
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        u.isActive
                          ? "border-green-500/30 bg-green-500/10 text-green-400"
                          : "border-red-500/30 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {u.passCount}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString("en-ZW", {
                          month: "short",
                          day: "numeric",
                        })
                      : "Never"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("en-ZW", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleRole(u)}
                        title={
                          u.role === "ADMIN"
                            ? "Demote to User"
                            : "Promote to Admin"
                        }
                      >
                        {u.role === "ADMIN" ? (
                          <ShieldOff className="h-3.5 w-3.5" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${
                          u.isActive
                            ? "text-destructive hover:text-destructive"
                            : "text-green-500 hover:text-green-500"
                        }`}
                        onClick={() => toggleActive(u)}
                        title={u.isActive ? "Deactivate" : "Activate"}
                      >
                        {u.isActive ? (
                          <UserX className="h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
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
