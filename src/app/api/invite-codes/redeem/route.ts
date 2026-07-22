import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  writeAudit,
} from "@/lib/api";

export const dynamic = "force-dynamic";

/** Redeem an invite code as the currently logged-in patient or provider. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    const body = await req.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!code) throw new ApiError(400, "code is required");

    const invite = await prisma.inviteCode.findUnique({ where: { code } });
    if (!invite || invite.status !== "ACTIVE" || invite.expiresAt < new Date())
      throw new ApiError(400, "Invite code is invalid or expired");
    if (invite.intendedRole !== ctx.effective.role)
      throw new ApiError(400, `This code is for ${invite.intendedRole.toLowerCase()}s`);

    await prisma.$transaction(async (tx) => {
      if (ctx.effective.role === "PROVIDER" && ctx.effective.providerProfile) {
        if (invite.patientId) {
          const exists = await tx.teamMember.findUnique({
            where: {
              patientId_providerId: {
                patientId: invite.patientId,
                providerId: ctx.effective.providerProfile.id,
              },
            },
          });
          if (!exists) {
            await tx.teamMember.create({
              data: {
                patientId: invite.patientId,
                providerId: ctx.effective.providerProfile.id,
              },
            });
          }
        }
        if (invite.agencyId) {
          await tx.providerProfile.update({
            where: { id: ctx.effective.providerProfile.id },
            data: { agencyId: invite.agencyId },
          });
        }
      } else if (
        ctx.effective.role === "PATIENT" &&
        ctx.effective.patientProfile &&
        invite.agencyId
      ) {
        await tx.patientProfile.update({
          where: { id: ctx.effective.patientProfile.id },
          data: { agencyId: invite.agencyId },
        });
      }

      await tx.inviteCode.update({
        where: { id: invite.id },
        data: { status: "USED", redeemedByUserId: ctx.effective.id },
      });
    });

    await writeAudit(ctx.effective.id, "invite_redeemed", {
      targetType: "InviteCode",
      targetId: invite.id,
      detail: code,
    });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
