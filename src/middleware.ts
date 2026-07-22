import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, VIEW_AS_COOKIE, verifySession } from "@/lib/auth";
import type { Role } from "@prisma/client";

const sectionByRole: Record<Exclude<Role, "ADMIN">, string> = {
  PATIENT: "/patient",
  PROVIDER: "/provider",
  AGENCY: "/agency",
};

function dashboardPath(role: Role): string {
  if (role === "ADMIN") return "/admin";
  return `${sectionByRole[role]}/dashboard`;
}

const PROTECTED = ["/patient", "/provider", "/agency", "/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const matched = PROTECTED.find(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!matched) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = session.role;

  // Admins may access every section. If viewing-as, ensure the target section
  // matches the view-as role; otherwise send them back to /admin.
  if (role === "ADMIN") {
    const raw = req.cookies.get(VIEW_AS_COOKIE)?.value;
    if (matched !== "/admin" && raw) {
      try {
        const viewAs = JSON.parse(raw) as { role: Role };
        if (sectionByRole[viewAs.role as Exclude<Role, "ADMIN">] !== matched) {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
      } catch {
        /* ignore malformed cookie */
      }
    }
    return NextResponse.next();
  }

  // Non-admin: must be in their own section.
  const ownSection = sectionByRole[role as Exclude<Role, "ADMIN">];
  if (matched !== ownSection) {
    return NextResponse.redirect(new URL(dashboardPath(role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/patient/:path*", "/provider/:path*", "/agency/:path*", "/admin/:path*"],
};
