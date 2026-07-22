"use client";

import * as React from "react";

export interface PatientOption {
  id: string;
  name: string;
  email: string;
}

interface PatientContextValue {
  patients: PatientOption[];
  selectedPatient: PatientOption | null;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PatientContext = React.createContext<PatientContextValue | null>(null);

export function usePatients(): PatientContextValue {
  const ctx = React.useContext(PatientContext);
  if (!ctx) throw new Error("usePatients must be used within PatientProvider");
  return ctx;
}

const STORAGE_KEY = "cc_selected_patient";

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [selectedPatientId, setSelected] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/patients", { cache: "no-store" });
      if (!res.ok) {
        setPatients([]);
        return;
      }
      const data: PatientOption[] = await res.json();
      setPatients(data);
      setSelected((current) => {
        if (current && data.some((p) => p.id === current)) return current;
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem(STORAGE_KEY)
            : null;
        if (stored && data.some((p) => p.id === stored)) return stored;
        return data[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const setSelectedPatientId = React.useCallback((id: string) => {
    setSelected(id);
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const selectedPatient =
    patients.find((p) => p.id === selectedPatientId) ?? null;

  return (
    <PatientContext.Provider
      value={{
        patients,
        selectedPatient,
        selectedPatientId,
        setSelectedPatientId,
        loading,
        refresh,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}
