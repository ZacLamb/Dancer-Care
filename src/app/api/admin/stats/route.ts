import { prisma } from "@/lib/prisma";
import { getContext, json, errorResponse, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getContext();
    if (ctx.requester.role !== "ADMIN") throw new ApiError(403, "Forbidden");

    const [
      totalPatients,
      totalProviders,
      totalAgencies,
      openShifts,
      activeInvites,
      recentLogs,
    ] = await Promise.all([
      prisma.patientProfile.count(),
      prisma.providerProfile.count(),
      prisma.agencyProfile.count(),
      prisma.schedule.count({ where: { isOpen: true, claimed: false } }),
      prisma.inviteCode.count({ where: { status: "ACTIVE" } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { actor: { select: { name: true, role: true } } },
      }),
    ]);

    return json({
      stats: {
        totalPatients,
        totalProviders,
        totalAgencies,
        openShifts,
        activeInvites,
      },
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        action: l.action,
        detail: l.detail,
        targetType: l.targetType,
        actorName: l.actor?.name ?? "System",
        actorRole: l.actor?.role ?? null,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
