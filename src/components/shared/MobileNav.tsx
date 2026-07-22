"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { navItems, type PortalRole } from "./nav-config";

export function MobileNav({ role }: { role: PortalRole }) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const items = navItems(role);
  const mainItems = items.slice(0, 4);
  const moreItems = items.slice(4);

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-3xl border-t border-brand-border p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            {moreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  pathname === item.href
                    ? "bg-brand-lime text-brand-dark font-semibold"
                    : "text-[#5A5A5A] hover:bg-brand-yellow"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-border z-50 md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {mainItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[60px] transition-all ${
                pathname === item.href ? "text-brand-dark" : "text-[#8A8A8A]"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
              {pathname === item.href && (
                <div className="w-1 h-1 rounded-full bg-brand-lime" />
              )}
            </Link>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[60px] transition-all ${
              showMore || moreItems.some((i) => pathname === i.href)
                ? "text-brand-dark"
                : "text-[#8A8A8A]"
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
