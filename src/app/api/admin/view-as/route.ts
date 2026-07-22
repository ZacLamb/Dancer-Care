import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setViewAsCookie } from "@/lib/auth";
import { getContext, json, errorResponse, ApiError, writeAudit } from "@/lib/api";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    if (ctx.requester.role !== "ADMIN")
      throw new ApiError(403, "Only admins can preview other portals");

    const body = await req.json();
    const role = body.role as Role;
    const targetUserId = String(body.targetUserId ?? "");
    if (!["PATIENT", "PROVIDER", "AGENCY"].includes(role))
      throw new ApiError(400, "Invalid role");

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target || target.role !== role)
      throw new ApiError(404, "Target account not found for that role");

    await setViewAsCookie({ role, targetUserId });
    await writeAudit(ctx.requester.id, "admin_view_as_start", {
      targetType: "User",
      targetId: targetUserId,
      detail: `${target.name} (${role})`,
    });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
