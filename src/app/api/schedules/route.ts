import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  assertPatientAccess,
  accessiblePatientIds,
  canManage,
} from "@/lib/api";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const scheduleInclude = {
  provider: { include: { user: { select: { name: true } } } },
  _count: { select: { shiftTasks: true } },
} as const;

function shape(s: Prisma.ScheduleGetPayload<{ include: typeof scheduleInclude }>) {
  return {
    id: s.id,
    patientId: s.patientId,
    providerId: s.providerId,
    providerName: s.provider?.user.name ?? s.providerNameText ?? null,
    shiftDate: s.shiftDate,
    startTime: s.startTime,
    endTime: s.endTime,
    isOpen: s.isOpen,
    claimed: s.claimed,
    notes: s.notes,
    taskCount: s._count.shiftTasks,
  };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");

    if (patientId) {
      await assertPatientAccess(ctx, patientId);
      const schedules = await prisma.schedule.findMany({
        where: { patientId },
        include: scheduleInclude,
        orderBy: { shiftDate: "asc" },
      });
      return json(schedules.map(shape));
    }

    // Provider view: own + open shifts across their patients.
    if (ctx.effective.role === "PROVIDER" && ctx.effective.providerProfile) {
      const ids = await accessiblePatientIds(ctx);
      const schedules = await prisma.schedule.findMany({
        where: {
          patientId: { in: ids },
          OR: [
            { providerId: ctx.effective.providerProfile.id },
            { isOpen: true, claimed: false },
          ],
        },
        include: scheduleInclude,
        orderBy: { shiftDate: "asc" },
      });
      return json(schedules.map(shape));
    }

    const ids = await accessiblePatientIds(ctx);
    const schedules = await prisma.schedule.findMany({
      where: { patientId: { in: ids } },
      include: scheduleInclude,
      orderBy: { shiftDate: "asc" },
    });
    return json(schedules.map(shape));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    const body = await req.json();
    const patientId = String(body.patientId ?? "");
    if (!patientId) throw new ApiError(400, "patientId is required");
    await assertPatientAccess(ctx, patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");

    if (!body.shiftDate || !body.startTime || !body.endTime)
      throw new ApiError(400, "shiftDate, startTime and endTime are required");

    const created = await prisma.schedule.create({
      data: {
        patientId,
        providerId: body.providerId || null,
        providerNameText: body.providerNameText || null,
        shiftDate: new Date(body.shiftDate),
        startTime: String(body.startTime),
        endTime: String(body.endTime),
        isOpen: Boolean(body.isOpen),
        claimed: Boolean(body.providerId) && !body.isOpen,
        notes: body.notes || null,
      },
    });
    return json({ id: created.id }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
