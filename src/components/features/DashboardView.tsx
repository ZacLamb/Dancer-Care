"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Users,
  AlertTriangle,
  Building2,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePatients } from "@/contexts/PatientContext";
import { PageHeader, StatCard, Spinner } from "@/components/shared/page-bits";
import { apiGet } from "@/lib/client";
import type { PortalRole } from "@/components/shared/nav-config";

export function DashboardView({ role }: { role: PortalRole }) {
  const { user } = useAuth();
  const { selectedPatientId, selectedPatient, loading: patientsLoading } =
    usePatients();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  const isAgency = role === "agency";

  useEffect(() => {
    if (isAgency) {
      apiGet<Record<string, number>>("/api/dashboard/stats")
        .then(setStats)
        .finally(() => setLoading(false));
      return;
    }
    if (!selectedPatientId) {
      if (!patientsLoading) setLoading(false);
      return;
    }
    setLoading(true);
    apiGet<Record<string, number>>(
      `/api/dashboard/stats?patientId=${selectedPatientId}`
    )
      .then(setStats)
      .finally(() => setLoading(false));
  }, [isAgency, selectedPatientId, patientsLoading]);

  const subtitle = isAgency
    ? "Your organization at a glance"
    : selectedPatient
    ? `Care overview for ${selectedPatient.name}`
    : "Your care overview";

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title={`Welcome back${user ? `, ${user.name.split(" ")[0]}` : ""}`}
        subtitle={subtitle}
      />

      {loading ? (
        <Spinner />
      ) : !stats ? (
        <p className="text-brand-muted">No data available yet.</p>
      ) : isAgency ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Patients"
            value={stats.totalPatients ?? 0}
            icon={<Users className="w-6 h-6" />}
            color="info"
          />
          <StatCard
            label="Total Providers"
            value={stats.totalProviders ?? 0}
            icon={<Building2 className="w-6 h-6" />}
            color="success"
          />
          <StatCard
            label="Open Shifts"
            value={stats.openShifts ?? 0}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="warning"
          />
          <StatCard
            label="Pending Invites"
            value={stats.pendingInvites ?? 0}
            icon={<Ticket className="w-6 h-6" />}
            color="error"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Today's Shifts"
            value={stats.todayShifts ?? 0}
            icon={<Calendar className="w-6 h-6" />}
            color="info"
          />
          <StatCard
            label="Pending Tasks"
            value={stats.pendingTasks ?? 0}
            icon={<CheckSquare className="w-6 h-6" />}
            color="warning"
          />
          <StatCard
            label={role === "provider" ? "My Patients" : "Care Team"}
            value={stats.teamMembers ?? 0}
            icon={<Users className="w-6 h-6" />}
            color="success"
          />
          <StatCard
            label="Open Shifts"
            value={stats.openShifts ?? 0}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="error"
          />
        </div>
      )}

      {!isAgency && !selectedPatientId && !patientsLoading && (
        <div className="bg-white rounded-3xl border border-brand-border p-6 text-brand-muted">
          {role === "provider"
            ? "You are not on any care teams yet. Redeem an invite code from the My Patients page."
            : "No patient selected yet."}
        </div>
      )}
    </div>
  );
}
