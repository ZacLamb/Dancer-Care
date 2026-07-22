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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getContext();
    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) throw new ApiError(404, "Shift not found");
    await assertPatientAccess(ctx, schedule.patientId);

    const body = await req.json();

    // A provider claiming an open shift.
    if (body.claim === true) {
      if (ctx.effective.role !== "PROVIDER" || !ctx.effective.providerProfile)
        throw new ApiError(403, "Only providers can claim shifts");
      if (!schedule.isOpen || schedule.claimed)
        throw new ApiError(400, "This shift is not available to claim");
      await prisma.schedule.update({
        where: { id },
        data: {
          providerId: ctx.effective.providerProfile.id,
          claimed: true,
          isOpen: false,
        },
      });
      return json({ ok: true });
    }

    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");

    await prisma.schedule.update({
      where: { id },
      data: {
        providerId: body.providerId !== undefined ? body.providerId || null : undefined,
        providerNameText:
          body.providerNameText !== undefined ? body.providerNameText || null : undefined,
        shiftDate: body.shiftDate ? new Date(body.shiftDate) : undefined,
        startTime: body.startTime ?? undefined,
        endTime: body.endTime ?? undefined,
        isOpen: body.isOpen !== undefined ? Boolean(body.isOpen) : undefined,
        claimed: body.claimed !== undefined ? Boolean(body.claimed) : undefined,
        notes: body.notes !== undefined ? body.notes || null : undefined,
      },
    });
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
    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) throw new ApiError(404, "Shift not found");
    await assertPatientAccess(ctx, schedule.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    await prisma.schedule.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
