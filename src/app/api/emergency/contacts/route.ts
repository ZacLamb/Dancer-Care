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
import type { ContactType } from "@prisma/client";

export const dynamic = "force-dynamic";

const TYPES: ContactType[] = ["EMERGENCY", "MEDICAL", "FAMILY"];

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");
    if (!patientId) throw new ApiError(400, "patientId is required");
    await assertPatientAccess(ctx, patientId);
    const contacts = await prisma.emergencyContact.findMany({
      where: { patientId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return json(contacts);
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
    if (!body.name || !body.phone)
      throw new ApiError(400, "name and phone are required");
    const created = await prisma.emergencyContact.create({
      data: {
        patientId,
        name: String(body.name),
        phone: String(body.phone),
        contactType: TYPES.includes(body.contactType) ? body.contactType : "EMERGENCY",
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
    const c = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!c) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, c.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    const body = await req.json();
    await prisma.emergencyContact.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        phone: body.phone ?? undefined,
        contactType: TYPES.includes(body.contactType) ? body.contactType : undefined,
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
    const c = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!c) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, c.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    await prisma.emergencyContact.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
