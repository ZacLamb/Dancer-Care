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
    const hospitals = await prisma.emergencyHospital.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
    });
    return json(hospitals);
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
    const created = await prisma.emergencyHospital.create({
      data: {
        patientId,
        name: String(body.name),
        address: body.address || null,
        distance: body.distance || null,
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
    const h = await prisma.emergencyHospital.findUnique({ where: { id } });
    if (!h) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, h.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    const body = await req.json();
    await prisma.emergencyHospital.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        address: body.address !== undefined ? body.address || null : undefined,
        distance: body.distance !== undefined ? body.distance || null : undefined,
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
    const h = await prisma.emergencyHospital.findUnique({ where: { id } });
    if (!h) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, h.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    await prisma.emergencyHospital.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
