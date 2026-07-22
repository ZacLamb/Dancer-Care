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
    if (!patientId) throw new ApiError(400, "patientId is required");
    await assertPatientAccess(ctx, patientId);
    const categories = await prisma.trainingCategory.findMany({
      where: { patientId },
      include: {
        modules: {
          orderBy: { sortOrder: "asc" },
          include: { media: { orderBy: { sortOrder: "asc" } } },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    return json(categories);
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
    if (!body.name) throw new ApiError(400, "name is required");
    const created = await prisma.trainingCategory.create({
      data: {
        patientId,
        name: String(body.name),
        icon: body.icon || null,
        color: body.color || "#D4E157",
        sortOrder: Number(body.sortOrder ?? 0),
      },
    });
    return json(created, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getContext();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError(400, "id is required");
    const c = await prisma.trainingCategory.findUnique({ where: { id } });
    if (!c) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, c.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    const body = await req.json();
    await prisma.trainingCategory.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        icon: body.icon !== undefined ? body.icon || null : undefined,
        color: body.color ?? undefined,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
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
    const c = await prisma.trainingCategory.findUnique({ where: { id } });
    if (!c) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, c.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    await prisma.trainingCategory.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
