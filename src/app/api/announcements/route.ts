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
import type { AnnouncementLabel } from "@prisma/client";

export const dynamic = "force-dynamic";

const LABELS: AnnouncementLabel[] = [
  "COVERAGE",
  "REMINDER",
  "ANNOUNCEMENT",
  "UPDATE",
  "GENERAL",
];

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");
    if (!patientId) throw new ApiError(400, "patientId is required");
    await assertPatientAccess(ctx, patientId);
    const announcements = await prisma.announcement.findMany({
      where: { patientId },
      include: { comments: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return json(announcements);
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
    if (!body.title) throw new ApiError(400, "title is required");
    const label = LABELS.includes(body.label) ? body.label : "GENERAL";
    const created = await prisma.announcement.create({
      data: {
        patientId,
        authorId: ctx.effective.id,
        authorName: ctx.effective.name,
        label,
        title: String(body.title),
        body: body.body || null,
      },
    });
    return json(created, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getContext();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError(400, "id is required");
    const a = await prisma.announcement.findUnique({ where: { id } });
    if (!a) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, a.patientId);
    if (a.authorId !== ctx.effective.id && !canManage(ctx))
      throw new ApiError(403, "Forbidden");
    await prisma.announcement.delete({ where: { id } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
