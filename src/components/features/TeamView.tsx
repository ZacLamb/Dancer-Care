"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Ticket, Copy, UserPlus, Mail, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePatients } from "@/contexts/PatientContext";
import {
  PageHeader,
  Spinner,
  EmptyState,
} from "@/components/shared/page-bits";
import { NeedsPatient } from "@/components/features/NeedsPatient";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiSend } from "@/lib/client";
import type { PortalRole } from "@/components/shared/nav-config";

interface TeamProvider {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  teamMemberId?: string;
}
interface PatientRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  agencyName: string | null;
}
interface InviteCode {
  id: string;
  code: string;
  intendedRole: string;
  status: string;
}

function PersonCard({
  name,
  subtitle,
  email,
  phone,
  onRemove,
}: {
  name: string;
  subtitle?: string | null;
  email?: string;
  phone?: string | null;
  onRemove?: () => void;
}) {
  return (
    <div className="bg-white rounded-3xl border border-brand-border p-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-brand-lime flex items-center justify-center font-bold text-brand-dark">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-brand-dark">{name}</p>
          {subtitle && <p className="text-sm text-brand-muted">{subtitle}</p>}
          {email && (
            <p className="text-xs text-brand-muted flex items-center gap-1 mt-1">
              <Mail className="w-3 h-3" /> {email}
            </p>
          )}
          {phone && (
            <p className="text-xs text-brand-muted flex items-center gap-1">
              <Phone className="w-3 h-3" /> {phone}
            </p>
          )}
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-2 rounded-lg text-brand-muted hover:bg-brand-yellow"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function PatientTeam() {
  const { selectedPatientId } = usePatients();
  const { toast } = useToast();
  const [team, setTeam] = useState<TeamProvider[]>([]);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        apiGet<TeamProvider[]>(`/api/providers?patientId=${selectedPatientId}`),
        apiGet<InviteCode[]>(`/api/invite-codes?patientId=${selectedPatientId}`),
      ]);
      setTeam(t);
      setCodes(c.filter((x) => x.status === "ACTIVE"));
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    load();
  }, [load]);

  const removeMember = async (teamMemberId?: string) => {
    if (!teamMemberId) return;
    try {
      await apiSend(`/api/team-members?id=${teamMemberId}`, "DELETE");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const generateInvite = async () => {
    try {
      await apiSend("/api/invite-codes", "POST", {
        patientId: selectedPatientId,
        intendedRole: "PROVIDER",
      });
      toast("Invite code created", "success");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={generateInvite}>
          <Ticket className="w-4 h-4" /> Invite a provider
        </Button>
      </div>
      {codes.length > 0 && (
        <div className="bg-brand-highlight rounded-3xl border border-brand-border p-4 space-y-2">
          <p className="text-sm font-medium text-brand-dark">
            Active invite codes
          </p>
          {codes.map((c) => (
            <InviteRow key={c.id} code={c.code} />
          ))}
        </div>
      )}
      {team.length === 0 ? (
        <EmptyState message="No providers on your care team yet." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {team.map((p) => (
            <PersonCard
              key={p.id}
              name={p.name}
              subtitle={p.title}
              email={p.email}
              phone={p.phone}
              onRemove={() => removeMember(p.teamMemberId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InviteRow({ code }: { code: string }) {
  const { toast } = useToast();
  return (
    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2">
      <code className="font-mono font-semibold text-brand-dark">{code}</code>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(code);
          toast("Copied", "success");
        }}
        className="p-1.5 rounded-lg text-brand-muted hover:bg-brand-yellow"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
}

function ProviderPatients() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<PatientRow[]>("/api/patients")
      .then(setPatients)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (patients.length === 0)
    return (
      <EmptyState message="You are not assigned to any patients yet. Redeem an invite code to join a care team." />
    );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {patients.map((p) => (
        <PersonCard
          key={p.id}
          name={p.name}
          subtitle={p.agencyName}
          email={p.email}
          phone={p.phone}
        />
      ))}
    </div>
  );
}

function AgencyTeam() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [providers, setProviders] = useState<TeamProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"patient" | "provider" | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    title: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pt, pr] = await Promise.all([
        apiGet<PatientRow[]>("/api/patients"),
        apiGet<TeamProvider[]>("/api/providers"),
      ]);
      setPatients(pt);
      setProviders(pr);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.name || !form.email || form.password.length < 8) {
      toast("Name, email and an 8+ char password are required", "error");
      return;
    }
    try {
      const url = modal === "patient" ? "/api/patients" : "/api/providers";
      await apiSend(url, "POST", {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        title: modal === "provider" ? form.title || undefined : undefined,
      });
      toast(`${modal === "patient" ? "Patient" : "Provider"} added`, "success");
      setModal(null);
      setForm({ name: "", email: "", password: "", phone: "", title: "" });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-dark">Patients</h2>
          <Button size="sm" onClick={() => setModal("patient")}>
            <UserPlus className="w-4 h-4" /> Add Patient
          </Button>
        </div>
        {patients.length === 0 ? (
          <EmptyState message="No patients yet." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {patients.map((p) => (
              <PersonCard
                key={p.id}
                name={p.name}
                subtitle="Patient"
                email={p.email}
                phone={p.phone}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-dark">Providers</h2>
          <Button size="sm" onClick={() => setModal("provider")}>
            <UserPlus className="w-4 h-4" /> Add Provider
          </Button>
        </div>
        {providers.length === 0 ? (
          <EmptyState message="No providers yet." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {providers.map((p) => (
              <PersonCard
                key={p.id}
                name={p.name}
                subtitle={p.title}
                email={p.email}
                phone={p.phone}
              />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "patient" ? "Add patient" : "Add provider"}
      >
        <div className="space-y-4">
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
            <Label>Temporary password</Label>
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
          {modal === "provider" && (
            <div>
              <Label>Title (optional)</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Registered Nurse"
              />
            </div>
          )}
          <Button onClick={submit} className="w-full">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function TeamView({ role }: { role: PortalRole }) {
  const titles: Record<PortalRole, { title: string; subtitle: string }> = {
    patient: { title: "My Care Team", subtitle: "Providers caring for you" },
    provider: { title: "My Patients", subtitle: "People in your care" },
    agency: { title: "Team", subtitle: "Patients and providers" },
  };
  const { title, subtitle } = titles[role];

  const body =
    role === "patient" ? (
      <NeedsPatient>
        <PatientTeam />
      </NeedsPatient>
    ) : role === "provider" ? (
      <ProviderPatients />
    ) : (
      <AgencyTeam />
    );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      {body}
    </div>
  );
}
