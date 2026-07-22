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

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");
    const scheduleId = req.nextUrl.searchParams.get("scheduleId");
    const status = req.nextUrl.searchParams.get("status");

    if (!patientId) throw new ApiError(400, "patientId is required");
    await assertPatientAccess(ctx, patientId);

    const tasks = await prisma.shiftTask.findMany({
      where: {
        patientId,
        scheduleId: scheduleId || undefined,
        status: (status as "PENDING" | "COMPLETED" | "INCOMPLETE") || undefined,
      },
      include: {
        schedule: { select: { shiftDate: true, startTime: true, endTime: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return json(tasks);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    const body = await req.json();
    const patientId = String(body.patientId ?? "");
    const scheduleId = String(body.scheduleId ?? "");
    if (!patientId || !scheduleId)
      throw new ApiError(400, "patientId and scheduleId are required");
    await assertPatientAccess(ctx, patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    if (!body.title) throw new ApiError(400, "title is required");

    const created = await prisma.shiftTask.create({
      data: {
        patientId,
        scheduleId,
        taskTemplateId: body.taskTemplateId || null,
        title: String(body.title),
      },
    });
    return json(created, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

// Providers, patients, agencies and admins may update task status/notes.
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getContext();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError(400, "id is required");
    const task = await prisma.shiftTask.findUnique({ where: { id } });
    if (!task) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, task.patientId);

    const body = await req.json();
    const status = body.status as "PENDING" | "COMPLETED" | "INCOMPLETE" | undefined;
    await prisma.shiftTask.update({
      where: { id },
      data: {
        status: status ?? undefined,
        completionNote: body.completionNote !== undefined ? body.completionNote || null : undefined,
        completedAt:
          status === "COMPLETED"
            ? new Date()
            : status === "PENDING"
            ? null
            : undefined,
        title: body.title ?? undefined,
      },
    });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getContext();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError(400, "id is required");
    const task = await prisma.shiftTask.findUnique({ where: { id } });
    if (!task) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, task.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    await prisma.shiftTask.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
