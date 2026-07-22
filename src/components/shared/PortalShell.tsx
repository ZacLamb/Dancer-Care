"use client";

import { Sidebar } from "@/components/shared/Sidebar";
import { MobileNav } from "@/components/shared/MobileNav";
import { AdminBar } from "@/components/shared/AdminBar";
import type { PortalRole } from "./nav-config";

export function PortalShell({
  role,
  showSelector = false,
  children,
}: {
  role: PortalRole;
  showSelector?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-brand-cream">
      <Sidebar role={role} showSelector={showSelector} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminBar />
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
      </div>
      <MobileNav role={role} />
    </div>
  );
}
