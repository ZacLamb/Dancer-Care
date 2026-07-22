import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  assertPatientAccess,
  accessiblePatientIds,
} from "@/lib/api";

export const dynamic = "force-dynamic";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");
    const { start, end } = todayRange();

    if (patientId) {
      await assertPatientAccess(ctx, patientId);
      const [todayShifts, pendingTasks, teamMembers, openShifts] =
        await Promise.all([
          prisma.schedule.count({
            where: { patientId, shiftDate: { gte: start, lt: end } },
          }),
          prisma.shiftTask.count({
            where: { patientId, status: "PENDING" },
          }),
          prisma.teamMember.count({ where: { patientId } }),
          prisma.schedule.count({
            where: { patientId, isOpen: true, claimed: false },
          }),
        ]);
      return json({ todayShifts, pendingTasks, teamMembers, openShifts });
    }

    const ids = await accessiblePatientIds(ctx);

    if (ctx.effective.role === "AGENCY" && ctx.effective.agencyProfile) {
      const agencyId = ctx.effective.agencyProfile.id;
      const [totalPatients, totalProviders, openShifts, pendingInvites] =
        await Promise.all([
          prisma.patientProfile.count({ where: { agencyId } }),
          prisma.providerProfile.count({ where: { agencyId } }),
          prisma.schedule.count({
            where: { patientId: { in: ids }, isOpen: true, claimed: false },
          }),
          prisma.inviteCode.count({ where: { agencyId, status: "ACTIVE" } }),
        ]);
      return json({ totalPatients, totalProviders, openShifts, pendingInvites });
    }

    // Provider default aggregate.
    const [todayShifts, pendingTasks, patients, openShifts] = await Promise.all([
      prisma.schedule.count({
        where: {
          patientId: { in: ids },
          shiftDate: { gte: start, lt: end },
          providerId: ctx.effective.providerProfile?.id,
        },
      }),
      prisma.shiftTask.count({
        where: { patientId: { in: ids }, status: "PENDING" },
      }),
      Promise.resolve(ids.length),
      prisma.schedule.count({
        where: { patientId: { in: ids }, isOpen: true, claimed: false },
      }),
    ]);
    return json({
      todayShifts,
      pendingTasks,
      teamMembers: patients,
      openShifts,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
