"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, X, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import type { Role } from "@prisma/client";

interface Account {
  id: string;
  name: string;
  email: string;
}

const tabs: { label: string; role: Role }[] = [
  { label: "Admin", role: "ADMIN" },
  { label: "Patient", role: "PATIENT" },
  { label: "Provider", role: "PROVIDER" },
  { label: "Agency", role: "AGENCY" },
];

export function AdminBar() {
  const { requesterRole, isViewingAs, viewAs, refresh } = useAuth();
  const router = useRouter();
  const [pickerRole, setPickerRole] = useState<Role | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  if (requesterRole !== "ADMIN") return null;

  const openPicker = async (role: Role) => {
    setPickerRole(role);
    setQuery("");
    const res = await fetch(`/api/admin/accounts?role=${role}`, {
      cache: "no-store",
    });
    setAccounts(res.ok ? await res.json() : []);
  };

  const enterAs = async (targetUserId: string, role: Role) => {
    setBusy(true);
    await fetch("/api/admin/view-as", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, targetUserId }),
    });
    const path =
      role === "PATIENT"
        ? "/patient/dashboard"
        : role === "PROVIDER"
        ? "/provider/dashboard"
        : "/agency/dashboard";
    window.location.href = path;
  };

  const exitToAdmin = async () => {
    setBusy(true);
    await fetch("/api/admin/view-as/exit", { method: "POST" });
    await refresh();
    window.location.href = "/admin";
  };

  const currentRole: Role = isViewingAs && viewAs ? viewAs.role : "ADMIN";
  const filtered = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <div className="sticky top-0 z-40 bg-brand-dark text-white">
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-lime">
            Admin Console
          </span>
          <div className="flex items-center gap-1 ml-2">
            {tabs.map((t) => {
              const active = currentRole === t.role;
              return (
                <button
                  key={t.role}
                  disabled={busy}
                  onClick={() =>
                    t.role === "ADMIN" ? exitToAdmin() : openPicker(t.role)
                  }
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-lime text-brand-dark"
                      : "bg-brand-dark-soft text-[#B0B0B0] hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {isViewingAs && viewAs && (
          <div className="flex items-center justify-between gap-3 bg-brand-warning text-brand-dark px-4 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Eye className="w-4 h-4" />
              Previewing as {viewAs.name} ({viewAs.role})
            </div>
            <button
              onClick={exitToAdmin}
              disabled={busy}
              className="flex items-center gap-1 text-sm font-semibold underline"
            >
              <X className="w-4 h-4" />
              Exit to Admin
            </button>
          </div>
        )}
      </div>

      <Modal
        open={pickerRole !== null}
        onClose={() => setPickerRole(null)}
        title={`Preview as ${pickerRole ?? ""}`}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-brand-muted" />
            <Input
              placeholder="Search accounts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <p className="text-sm text-brand-muted py-4 text-center">
                No accounts found.
              </p>
            )}
            {filtered.map((a) => (
              <button
                key={a.id}
                disabled={busy}
                onClick={() => pickerRole && enterAs(a.id, pickerRole)}
                className="w-full text-left px-4 py-3 rounded-2xl hover:bg-brand-yellow transition-colors"
              >
                <p className="font-medium text-brand-dark">{a.name}</p>
                <p className="text-sm text-brand-muted">{a.email}</p>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
