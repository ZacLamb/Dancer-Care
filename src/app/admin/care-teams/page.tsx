"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Building2, Users, UserCog } from "lucide-react";
import { PageHeader, Spinner, EmptyState } from "@/components/shared/page-bits";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiSend } from "@/lib/client";

interface Agency {
  id: string;
  agencyName: string;
  email: string;
  phone: string | null;
  address: string | null;
  patients: number;
  providers: number;
}

export default function AdminCareTeams() {
  const { toast } = useToast();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    agencyName: "",
    phone: "",
    address: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAgencies(await apiGet<Agency[]>("/api/agencies"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (
      !form.name ||
      !form.email ||
      form.password.length < 8 ||
      !form.agencyName
    ) {
      toast("Name, email, agency name and an 8+ char password are required", "error");
      return;
    }
    try {
      await apiSend("/api/agencies", "POST", form);
      toast("Agency created", "success");
      setOpen(false);
      setForm({
        name: "",
        email: "",
        password: "",
        agencyName: "",
        phone: "",
        address: "",
      });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title="Care Teams"
        subtitle="Agencies and their organizations"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Add Agency
          </Button>
        }
      />

      {loading ? (
        <Spinner />
      ) : agencies.length === 0 ? (
        <EmptyState message="No agencies yet." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {agencies.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-3xl border border-brand-border p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-lime text-brand-dark">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-dark">{a.agencyName}</h3>
                  <p className="text-sm text-brand-muted">{a.email}</p>
                </div>
              </div>
              {a.address && (
                <p className="text-sm text-brand-muted">{a.address}</p>
              )}
              <div className="flex gap-4 text-sm text-brand-dark pt-2 border-t border-brand-border">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" /> {a.patients} patients
                </span>
                <span className="flex items-center gap-1">
                  <UserCog className="w-4 h-4" /> {a.providers} providers
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add agency">
        <div className="space-y-4">
          <div>
            <Label>Agency name</Label>
            <Input
              value={form.agencyName}
              onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
            />
          </div>
          <div>
            <Label>Contact name</Label>
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
          <div>
            <Label>Phone (optional)</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Address (optional)</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <Button onClick={create} className="w-full">
            Create Agency
          </Button>
        </div>
      </Modal>
    </div>
  );
}
