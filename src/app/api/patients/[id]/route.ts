import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  assertPatientAccess,
  canManage,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getContext();
    await assertPatientAccess(ctx, id);
    const p = await prisma.patientProfile.findUnique({
      where: { id },
      include: { user: true, agency: true },
    });
    if (!p) throw new ApiError(404, "Patient not found");
    return json({
      id: p.id,
      name: p.user.name,
      email: p.user.email,
      phone: p.user.phone,
      dateOfBirth: p.dateOfBirth,
      address: p.address,
      notes: p.notes,
      agencyId: p.agencyId,
      agencyName: p.agency?.agencyName ?? null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getContext();
    await assertPatientAccess(ctx, id);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");

    const body = await req.json();
    const profile = await prisma.patientProfile.update({
      where: { id },
      data: {
        dateOfBirth:
          body.dateOfBirth !== undefined
            ? body.dateOfBirth
              ? new Date(body.dateOfBirth)
              : null
            : undefined,
        address: body.address ?? undefined,
        notes: body.notes ?? undefined,
        agencyId:
          ctx.effective.role === "ADMIN" && body.agencyId !== undefined
            ? body.agencyId || null
            : undefined,
      },
    });

    if (body.name || body.phone !== undefined) {
      await prisma.user.update({
        where: { id: profile.userId },
        data: { name: body.name ?? undefined, phone: body.phone ?? undefined },
      });
    }
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getContext();
    if (ctx.effective.role !== "ADMIN")
      throw new ApiError(403, "Only admins can delete patients");
    const p = await prisma.patientProfile.findUnique({ where: { id } });
    if (!p) throw new ApiError(404, "Patient not found");
    await prisma.user.delete({ where: { id: p.userId } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
