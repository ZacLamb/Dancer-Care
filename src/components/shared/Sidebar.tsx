"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PatientSelector } from "@/components/shared/PatientSelector";
import { navItems, roleLabels, type PortalRole } from "./nav-config";

export function Sidebar({
  role,
  showSelector = false,
}: {
  role: PortalRole;
  showSelector?: boolean;
}) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const items = navItems(role);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-brand-dark text-white h-screen sticky top-0 shrink-0">
      <div className="p-6">
        <Link href={`/${role}/dashboard`} className="text-xl font-bold">
          CareConnect
        </Link>
      </div>

      {showSelector && <PatientSelector />}

      <div className="px-4 pb-4">
        <div className="h-px bg-brand-dark-soft" />
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                active
                  ? "bg-brand-lime text-brand-dark font-semibold"
                  : "text-[#B0B0B0] hover:bg-brand-dark-soft hover:text-white"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-3">
        <div className="h-px bg-brand-dark-soft" />
        <div className="px-2">
          <p className="text-sm text-[#B0B0B0] truncate">{user?.email}</p>
          <span className="inline-block mt-1 text-xs font-medium bg-brand-lime text-brand-dark rounded-full px-3 py-0.5">
            {user ? roleLabels[user.role] : ""}
          </span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 text-sm text-[#B0B0B0] hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
