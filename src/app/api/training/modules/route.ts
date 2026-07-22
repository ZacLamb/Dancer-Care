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
    const categoryId = req.nextUrl.searchParams.get("categoryId");
    if (!patientId) throw new ApiError(400, "patientId is required");
    await assertPatientAccess(ctx, patientId);
    const modules = await prisma.trainingModule.findMany({
      where: { patientId, categoryId: categoryId || undefined },
      include: { media: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return json(modules);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    const body = await req.json();
    const patientId = String(body.patientId ?? "");
    const categoryId = String(body.categoryId ?? "");
    if (!patientId || !categoryId)
      throw new ApiError(400, "patientId and categoryId are required");
    await assertPatientAccess(ctx, patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    if (!body.name) throw new ApiError(400, "name is required");
    const created = await prisma.trainingModule.create({
      data: {
        patientId,
        categoryId,
        name: String(body.name),
        instructions: body.instructions || null,
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
    const m = await prisma.trainingModule.findUnique({ where: { id } });
    if (!m) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, m.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    const body = await req.json();
    await prisma.trainingModule.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        instructions: body.instructions !== undefined ? body.instructions || null : undefined,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        categoryId: body.categoryId ?? undefined,
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
    const m = await prisma.trainingModule.findUnique({ where: { id } });
    if (!m) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, m.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    await prisma.trainingModule.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
