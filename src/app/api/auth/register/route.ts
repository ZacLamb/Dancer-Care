import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signSession, setSessionCookie, dashboardPath } from "@/lib/auth";
import { json, errorResponse, ApiError, writeAudit } from "@/lib/api";
import { seedPatientDefaults } from "@/lib/patient-defaults";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const REGISTERABLE: Role[] = ["PATIENT", "PROVIDER", "AGENCY"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role as Role;
    const agencyName = String(body.agencyName ?? "").trim();
    const inviteCode = String(body.inviteCode ?? "").trim().toUpperCase();

    if (!name || !email || !password)
      throw new ApiError(400, "Name, email and password are required");
    if (password.length < 8)
      throw new ApiError(400, "Password must be at least 8 characters");
    if (!REGISTERABLE.includes(role))
      throw new ApiError(400, "Invalid role");
    if (role === "AGENCY" && !agencyName)
      throw new ApiError(400, "Agency name is required");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const passwordHash = await hashPassword(password);

    // Validate invite code up front (patients/providers only).
    let invite = null;
    if (inviteCode && role !== "AGENCY") {
      invite = await prisma.inviteCode.findUnique({ where: { code: inviteCode } });
      if (!invite || invite.status !== "ACTIVE" || invite.expiresAt < new Date())
        throw new ApiError(400, "Invite code is invalid or expired");
      if (invite.intendedRole !== role)
        throw new ApiError(400, `This invite code is for ${invite.intendedRole.toLowerCase()}s`);
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, passwordHash, role },
      });

      if (role === "AGENCY") {
        await tx.agencyProfile.create({
          data: { userId: created.id, agencyName },
        });
      } else if (role === "PATIENT") {
        const profile = await tx.patientProfile.create({
          data: {
            userId: created.id,
            agencyId: invite?.agencyId ?? undefined,
          },
        });
        await seedPatientDefaults(tx, profile.id);
      } else if (role === "PROVIDER") {
        const profile = await tx.providerProfile.create({
          data: {
            userId: created.id,
            agencyId: invite?.agencyId ?? undefined,
          },
        });
        if (invite?.patientId) {
          await tx.teamMember.create({
            data: { patientId: invite.patientId, providerId: profile.id },
          });
        }
      }

      if (invite) {
        await tx.inviteCode.update({
          where: { id: invite.id },
          data: { status: "USED", redeemedByUserId: created.id },
        });
      }

      return created;
    });

    await writeAudit(user.id, "register", {
      targetType: "User",
      targetId: user.id,
      detail: `Registered as ${role}`,
    });
    if (invite) {
      await writeAudit(user.id, "invite_redeemed", {
        targetType: "InviteCode",
        targetId: invite.id,
        detail: inviteCode,
      });
    }

    const token = await signSession({ sub: user.id, role: user.role });
    await setSessionCookie(token);

    return json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      redirect: dashboardPath(user.role),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
