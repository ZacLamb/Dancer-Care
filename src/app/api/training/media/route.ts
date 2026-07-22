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
import type { MediaType } from "@prisma/client";

export const dynamic = "force-dynamic";

const MEDIA_TYPES: MediaType[] = ["VIDEO", "IMAGE", "PDF", "DOCUMENT", "LINK"];

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");
    const moduleId = req.nextUrl.searchParams.get("moduleId");
    if (!patientId) throw new ApiError(400, "patientId is required");
    await assertPatientAccess(ctx, patientId);
    const media = await prisma.trainingMedia.findMany({
      where: { patientId, moduleId: moduleId || undefined },
      orderBy: { sortOrder: "asc" },
    });
    return json(media);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    const body = await req.json();
    const patientId = String(body.patientId ?? "");
    const moduleId = String(body.moduleId ?? "");
    if (!patientId || !moduleId)
      throw new ApiError(400, "patientId and moduleId are required");
    await assertPatientAccess(ctx, patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    const mediaType = body.mediaType as MediaType;
    if (!body.displayName || !body.url || !MEDIA_TYPES.includes(mediaType))
      throw new ApiError(400, "displayName, url and a valid mediaType are required");
    const created = await prisma.trainingMedia.create({
      data: {
        patientId,
        moduleId,
        displayName: String(body.displayName),
        mediaType,
        url: String(body.url),
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
    const m = await prisma.trainingMedia.findUnique({ where: { id } });
    if (!m) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, m.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    const body = await req.json();
    await prisma.trainingMedia.update({
      where: { id },
      data: {
        displayName: body.displayName ?? undefined,
        url: body.url ?? undefined,
        mediaType: MEDIA_TYPES.includes(body.mediaType) ? body.mediaType : undefined,
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
    const m = await prisma.trainingMedia.findUnique({ where: { id } });
    if (!m) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, m.patientId);
    if (!canManage(ctx)) throw new ApiError(403, "Forbidden");
    await prisma.trainingMedia.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
