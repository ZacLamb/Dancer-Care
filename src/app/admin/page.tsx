"use client";

import { useEffect, useState } from "react";
import { Users, Building2, UserCog, AlertTriangle, Ticket } from "lucide-react";
import { PageHeader, StatCard, Spinner } from "@/components/shared/page-bits";
import { apiGet } from "@/lib/client";

interface AdminStats {
  stats: {
    totalPatients: number;
    totalProviders: number;
    totalAgencies: number;
    openShifts: number;
    activeInvites: number;
  };
  recentLogs: {
    id: string;
    action: string;
    detail: string | null;
    actorName: string;
    actorRole: string | null;
    createdAt: string;
  }[];
}

export default function AdminOverview() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<AdminStats>("/api/admin/stats")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title="Platform Overview"
        subtitle="System-wide metrics and recent activity"
      />
      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              label="Patients"
              value={data.stats.totalPatients}
              icon={<Users className="w-6 h-6" />}
              color="info"
            />
            <StatCard
              label="Providers"
              value={data.stats.totalProviders}
              icon={<UserCog className="w-6 h-6" />}
              color="success"
            />
            <StatCard
              label="Agencies"
              value={data.stats.totalAgencies}
              icon={<Building2 className="w-6 h-6" />}
              color="lime"
            />
            <StatCard
              label="Open Shifts"
              value={data.stats.openShifts}
              icon={<AlertTriangle className="w-6 h-6" />}
              color="warning"
            />
            <StatCard
              label="Active Invites"
              value={data.stats.activeInvites}
              icon={<Ticket className="w-6 h-6" />}
              color="error"
            />
          </div>

          <div className="bg-white rounded-3xl border border-brand-border p-5">
            <h2 className="font-bold text-brand-dark mb-4">Recent Activity</h2>
            {data.recentLogs.length === 0 ? (
              <p className="text-brand-muted text-sm">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-brand-border">
                {data.recentLogs.map((l) => (
                  <li
                    key={l.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-brand-dark">
                        {l.action.replace(/_/g, " ")}
                        {l.detail ? ` — ${l.detail}` : ""}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {l.actorName}
                        {l.actorRole ? ` (${l.actorRole})` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-brand-muted whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
