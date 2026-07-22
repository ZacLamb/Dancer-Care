"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Network, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminBar } from "@/components/shared/AdminBar";

const items = [
  { label: "Overview", href: "/admin", icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-5 h-5" /> },
  {
    label: "Care Teams",
    href: "/admin/care-teams",
    icon: <Network className="w-5 h-5" />,
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-brand-cream">
      <aside className="hidden md:flex flex-col w-64 bg-brand-dark text-white h-screen sticky top-0 shrink-0">
        <div className="p-6">
          <Link href="/admin" className="text-xl font-bold">
            CareConnect
          </Link>
          <p className="text-xs text-brand-lime mt-1">Admin</p>
        </div>
        <div className="px-4 pb-4">
          <div className="h-px bg-brand-dark-soft" />
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
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
      <div className="flex-1 flex flex-col min-w-0">
        <AdminBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
