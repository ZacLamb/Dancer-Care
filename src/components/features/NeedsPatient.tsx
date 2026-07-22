"use client";

import { usePatients } from "@/contexts/PatientContext";
import { Spinner } from "@/components/shared/page-bits";

export function NeedsPatient({ children }: { children: React.ReactNode }) {
  const { selectedPatientId, loading } = usePatients();
  if (loading) return <Spinner />;
  if (!selectedPatientId)
    return (
      <div className="p-4 md:p-8">
        <div className="bg-white rounded-3xl border border-brand-border p-8 text-center text-brand-muted">
          No patient selected. Choose a patient from the sidebar, or you may not
          be linked to any patients yet.
        </div>
      </div>
    );
  return <>{children}</>;
}
