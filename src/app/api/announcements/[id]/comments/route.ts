import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  assertPatientAccess,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getContext();
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, announcement.patientId);
    const comments = await prisma.announcementComment.findMany({
      where: { announcementId: id },
      orderBy: { createdAt: "asc" },
    });
    return json(comments);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getContext();
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new ApiError(404, "Not found");
    await assertPatientAccess(ctx, announcement.patientId);
    const body = await req.json();
    if (!body.body) throw new ApiError(400, "body is required");
    const created = await prisma.announcementComment.create({
      data: {
        announcementId: id,
        authorId: ctx.effective.id,
        authorName: ctx.effective.name,
        body: String(body.body),
      },
    });
    return json(created, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
