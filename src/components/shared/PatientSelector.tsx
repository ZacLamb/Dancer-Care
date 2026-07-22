"use client";

import { usePatients } from "@/contexts/PatientContext";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function PatientSelector() {
  const { patients, selectedPatient, setSelectedPatientId } = usePatients();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (patients.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="w-full rounded-xl bg-brand-dark-soft px-4 py-3 text-[#B0B0B0] text-sm">
          No patients yet
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative px-4 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-brand-dark-soft rounded-xl px-4 py-3 text-white text-sm font-medium hover:bg-[#3a3a3a] transition-colors"
      >
        <span className="truncate">
          {selectedPatient?.name || "Select Patient"}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-xl shadow-lg border border-brand-border z-50 overflow-hidden max-h-72 overflow-y-auto">
          {patients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => {
                setSelectedPatientId(patient.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                selectedPatient?.id === patient.id
                  ? "bg-brand-lime text-brand-dark font-medium"
                  : "text-brand-dark hover:bg-brand-yellow"
              }`}
            >
              {patient.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
