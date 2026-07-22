import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  signSession,
  setSessionCookie,
  clearViewAsCookie,
  dashboardPath,
} from "@/lib/auth";
import { json, errorResponse, ApiError, writeAudit } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password)
      throw new ApiError(400, "Email and password are required");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      throw new ApiError(401, "Invalid email or password");
    if (user.status === "INACTIVE")
      throw new ApiError(403, "Your account has been deactivated");

    const token = await signSession({ sub: user.id, role: user.role });
    await setSessionCookie(token);
    await clearViewAsCookie();

    await writeAudit(user.id, "login", {
      targetType: "User",
      targetId: user.id,
    });

    return json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      redirect: dashboardPath(user.role),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
