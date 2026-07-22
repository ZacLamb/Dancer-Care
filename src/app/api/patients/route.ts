import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { seedPatientDefaults } from "@/lib/patient-defaults";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  accessiblePatientIds,
  writeAudit,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getContext();
    const ids = await accessiblePatientIds(ctx);
    const patients = await prisma.patientProfile.findMany({
      where: { id: { in: ids } },
      include: { user: true, agency: true },
      orderBy: { user: { name: "asc" } },
    });
    return json(
      patients.map((p) => ({
        id: p.id,
        name: p.user.name,
        email: p.user.email,
        phone: p.user.phone,
        status: p.user.status,
        dateOfBirth: p.dateOfBirth,
        address: p.address,
        notes: p.notes,
        agencyId: p.agencyId,
        agencyName: p.agency?.agencyName ?? null,
      }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    if (!["AGENCY", "ADMIN"].includes(ctx.effective.role))
      throw new ApiError(403, "Only agencies and admins can create patients");

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!name || !email || password.length < 8)
      throw new ApiError(400, "Name, email and an 8+ char password are required");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, "Email already in use");

    let agencyId: string | undefined;
    if (ctx.effective.role === "AGENCY") {
      agencyId = ctx.effective.agencyProfile?.id;
    } else if (body.agencyId) {
      agencyId = String(body.agencyId);
    }

    const passwordHash = await hashPassword(password);
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role: "PATIENT", phone: body.phone ?? undefined },
      });
      const profile = await tx.patientProfile.create({
        data: {
          userId: user.id,
          agencyId,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          address: body.address ?? undefined,
          notes: body.notes ?? undefined,
        },
      });
      await seedPatientDefaults(tx, profile.id);
      return profile;
    });

    await writeAudit(ctx.requester.id, "create_patient", {
      targetType: "PatientProfile",
      targetId: created.id,
      detail: name,
    });

    return json({ id: created.id }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
