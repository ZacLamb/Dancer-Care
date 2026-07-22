import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  assertPatientAccess,
  accessiblePatientIds,
  generateInviteCode,
  writeAudit,
} from "@/lib/api";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");

    let where = {};
    if (patientId) {
      await assertPatientAccess(ctx, patientId);
      where = { patientId };
    } else if (ctx.effective.role === "ADMIN") {
      where = {};
    } else if (ctx.effective.role === "AGENCY" && ctx.effective.agencyProfile) {
      where = { agencyId: ctx.effective.agencyProfile.id };
    } else {
      const ids = await accessiblePatientIds(ctx);
      where = { patientId: { in: ids } };
    }

    const codes = await prisma.inviteCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return json(codes);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    const body = await req.json();
    const intendedRole = body.intendedRole as Role;
    if (!["PATIENT", "PROVIDER"].includes(intendedRole))
      throw new ApiError(400, "intendedRole must be PATIENT or PROVIDER");

    let patientId: string | undefined;
    let agencyId: string | undefined;

    if (body.patientId) {
      patientId = String(body.patientId);
      await assertPatientAccess(ctx, patientId);
    }

    if (ctx.effective.role === "AGENCY") {
      agencyId = ctx.effective.agencyProfile?.id;
    } else if (body.agencyId) {
      agencyId = String(body.agencyId);
    }

    // A PROVIDER invite that joins a team requires a patient; patient invites
    // may be produced by an agency/admin to attach a new patient to the org.
    if (intendedRole === "PROVIDER" && !patientId && !agencyId)
      throw new ApiError(400, "Provider invites need a patient or agency");
    if (!["PATIENT", "AGENCY", "ADMIN"].includes(ctx.effective.role))
      throw new ApiError(403, "Forbidden");

    let code = generateInviteCode();
    while (await prisma.inviteCode.findUnique({ where: { code } })) {
      code = generateInviteCode();
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const created = await prisma.inviteCode.create({
      data: {
        code,
        intendedRole,
        patientId,
        agencyId,
        expiresAt,
        createdByUserId: ctx.requester.id,
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
    const code = await prisma.inviteCode.findUnique({ where: { id } });
    if (!code) throw new ApiError(404, "Not found");
    if (!["AGENCY", "ADMIN", "PATIENT"].includes(ctx.effective.role))
      throw new ApiError(403, "Forbidden");
    await prisma.inviteCode.update({
      where: { id },
      data: { status: "EXPIRED" },
    });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
