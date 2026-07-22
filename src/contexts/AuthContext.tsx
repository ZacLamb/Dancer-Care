"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";

export interface MeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface MeResponse {
  user: MeUser;
  requesterRole: Role;
  isViewingAs: boolean;
  viewAs: { name: string; role: Role } | null;
}

interface AuthContextValue {
  user: MeUser | null;
  requesterRole: Role | null;
  isViewingAs: boolean;
  viewAs: { name: string; role: Role } | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<MeResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        setState(await res.json());
      } else {
        setState(null);
      }
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = React.useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user: state?.user ?? null,
        requesterRole: state?.requesterRole ?? null,
        isViewingAs: state?.isViewingAs ?? false,
        viewAs: state?.viewAs ?? null,
        loading,
        refresh,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
