"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Power, Trash2 } from "lucide-react";
import { PageHeader, Spinner, EmptyState } from "@/components/shared/page-bits";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiSend } from "@/lib/client";
import { roleLabels } from "@/components/shared/nav-config";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  agencyName: string | null;
  title: string | null;
}

const roleFilters = ["", "PATIENT", "PROVIDER", "AGENCY", "ADMIN"];

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "PATIENT",
    agencyName: "",
    title: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      if (q) params.set("q", q);
      setUsers(await apiGet<AdminUser[]>(`/api/admin/users?${params}`));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const create = async () => {
    if (!form.name || !form.email || form.password.length < 8) {
      toast("Name, email and an 8+ char password are required", "error");
      return;
    }
    try {
      await apiSend("/api/admin/users", "POST", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        agencyName: form.role === "AGENCY" ? form.agencyName : undefined,
        title: form.role === "PROVIDER" ? form.title : undefined,
      });
      toast("User created", "success");
      setAddOpen(false);
      setForm({
        name: "",
        email: "",
        password: "",
        role: "PATIENT",
        agencyName: "",
        title: "",
      });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const toggleStatus = async (u: AdminUser) => {
    try {
      await apiSend(`/api/admin/users/${u.id}`, "PATCH", {
        status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const remove = async (u: AdminUser) => {
    try {
      await apiSend(`/api/admin/users/${u.id}`, "DELETE");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title="Users"
        subtitle="All accounts across the platform"
        action={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add User
          </Button>
        }
      />

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-brand-muted" />
          <Input
            placeholder="Search by name or email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="max-w-[180px]"
        >
          {roleFilters.map((r) => (
            <option key={r} value={r}>
              {r ? roleLabels[r] : "All roles"}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <div className="bg-white rounded-3xl border border-brand-border overflow-hidden">
          <ul className="divide-y divide-brand-border">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-brand-dark truncate">
                    {u.name}
                    <span className="ml-2 text-xs font-medium bg-brand-yellow text-brand-dark rounded-full px-2 py-0.5">
                      {roleLabels[u.role]}
                    </span>
                    {u.status === "INACTIVE" && (
                      <span className="ml-2 text-xs font-medium bg-brand-error/15 text-brand-error rounded-full px-2 py-0.5">
                        Inactive
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-brand-muted truncate">
                    {u.email}
                    {u.agencyName ? ` · ${u.agencyName}` : ""}
                    {u.title ? ` · ${u.title}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    title={u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    onClick={() => toggleStatus(u)}
                    className="p-2 rounded-lg text-brand-muted hover:bg-brand-yellow"
                  >
                    <Power className="w-5 h-5" />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => remove(u)}
                    className="p-2 rounded-lg text-brand-error hover:bg-brand-error/10"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add user">
        <div className="space-y-4">
          <div>
            <Label>Role</Label>
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="PATIENT">Patient</option>
              <option value="PROVIDER">Provider</option>
              <option value="AGENCY">Agency</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
          </div>
          {form.role === "AGENCY" && (
            <div>
              <Label>Agency name</Label>
              <Input
                value={form.agencyName}
                onChange={(e) =>
                  setForm({ ...form, agencyName: e.target.value })
                }
              />
            </div>
          )}
          {form.role === "PROVIDER" && (
            <div>
              <Label>Title (optional)</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
          )}
          <Button onClick={create} className="w-full">
            Create User
          </Button>
        </div>
      </Modal>
    </div>
  );
}
