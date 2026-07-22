"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { PatientProvider } from "@/contexts/PatientContext";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <PatientProvider>{children}</PatientProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
