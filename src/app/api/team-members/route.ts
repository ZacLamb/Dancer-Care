import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  assertPatientAccess,
  canManage,
  writeAudit,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");
    if (!patientId) throw new ApiError(400, "patientId is required");
    await assertPatientAccess(ctx, patientId);
    const members = await prisma.teamMember.findMany({
      where: { patientId },
      include: { provider: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    });
    return json(
      members.map((m) => ({
        id: m.id,
        providerId: m.providerId,
        notes: m.notes,
        name: m.provider.user.name,
        email: m.provider.user.email,
        title: m.provider.title,
      }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    const body = await req.json();
    const patientId = String(body.patientId ?? "");
    const providerId = String(body.providerId ?? "");
    if (!patientId || !providerId)
      throw new ApiError(400, "patientId and providerId are required");
    await assertPatientAccess(ctx, patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");

    const existing = await prisma.teamMember.findUnique({
      where: { patientId_providerId: { patientId, providerId } },
    });
    if (existing) throw new ApiError(409, "Provider already on this team");

    const created = await prisma.teamMember.create({
      data: { patientId, providerId, notes: body.notes ?? undefined },
    });
    await writeAudit(ctx.requester.id, "team_member_added", {
      targetType: "TeamMember",
      targetId: created.id,
      detail: `patient ${patientId} + provider ${providerId}`,
    });
    return json({ id: created.id }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getContext();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError(400, "id is required");
    const member = await prisma.teamMember.findUnique({ where: { id } });
    if (!member) throw new ApiError(404, "Team member not found");
    await assertPatientAccess(ctx, member.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    await prisma.teamMember.delete({ where: { id } });
    await writeAudit(ctx.requester.id, "team_member_removed", {
      targetType: "TeamMember",
      targetId: id,
    });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
