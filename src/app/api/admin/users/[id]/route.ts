import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getContext, json, errorResponse, ApiError, writeAudit } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getContext();
    if (ctx.requester.role !== "ADMIN") throw new ApiError(403, "Forbidden");

    const user = await prisma.user.findUnique({
      where: { id },
      include: { patientProfile: true, providerProfile: true },
    });
    if (!user) throw new ApiError(404, "User not found");

    const body = await req.json();

    await prisma.user.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        phone: body.phone !== undefined ? body.phone || null : undefined,
        status:
          body.status && ["ACTIVE", "INACTIVE"].includes(body.status)
            ? body.status
            : undefined,
      },
    });

    // Assign a patient/provider to an agency.
    if (body.agencyId !== undefined) {
      const agencyId = body.agencyId || null;
      if (user.patientProfile) {
        await prisma.patientProfile.update({
          where: { id: user.patientProfile.id },
          data: { agencyId },
        });
      } else if (user.providerProfile) {
        await prisma.providerProfile.update({
          where: { id: user.providerProfile.id },
          data: { agencyId },
        });
      }
    }

    if (body.title !== undefined && user.providerProfile) {
      await prisma.providerProfile.update({
        where: { id: user.providerProfile.id },
        data: { title: body.title || null },
      });
    }

    await writeAudit(ctx.requester.id, "admin_update_user", {
      targetType: "User",
      targetId: id,
    });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getContext();
    if (ctx.requester.role !== "ADMIN") throw new ApiError(403, "Forbidden");
    if (id === ctx.requester.id)
      throw new ApiError(400, "You cannot delete your own account");
    await prisma.user.delete({ where: { id } });
    await writeAudit(ctx.requester.id, "admin_delete_user", {
      targetType: "User",
      targetId: id,
    });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
