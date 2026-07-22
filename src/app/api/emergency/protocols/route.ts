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

function toSteps(input: unknown): string[] {
  if (Array.isArray(input))
    return input.map((s) => String(s)).filter((s) => s.trim().length > 0);
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");
    if (!patientId) throw new ApiError(400, "patientId is required");
    await assertPatientAccess(ctx, patientId);
    const protocols = await prisma.emergencyProtocol.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
    });
    return json(protocols);
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
    if (!body.title) throw new ApiError(400, "title is required");
    const created = await prisma.emergencyProtocol.create({
      data: {
        patientId,
        title: String(body.title),
        steps: toSteps(body.steps),
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
    const p = await prisma.emergencyProtocol.findUnique({ where: { id } });
    if (!p) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, p.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    const body = await req.json();
    await prisma.emergencyProtocol.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        steps: body.steps !== undefined ? toSteps(body.steps) : undefined,
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
    const p = await prisma.emergencyProtocol.findUnique({ where: { id } });
    if (!p) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, p.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    await prisma.emergencyProtocol.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
