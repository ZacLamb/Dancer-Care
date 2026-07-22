import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getViewAs } from "@/lib/auth";
import type { Role, User } from "@prisma/client";

export type UserWithProfiles = User & {
  agencyProfile: { id: string } | null;
  patientProfile: { id: string; agencyId: string | null } | null;
  providerProfile: { id: string; agencyId: string | null } | null;
};

export interface ApiContext {
  requester: UserWithProfiles;
  effective: UserWithProfiles;
  isViewingAs: boolean;
}

const profileInclude = {
  agencyProfile: { select: { id: true } },
  patientProfile: { select: { id: true, agencyId: true } },
  providerProfile: { select: { id: true, agencyId: true } },
} as const;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/**
 * Resolve the requester and effective user. Effective user differs from the
 * requester only when an ADMIN has an active cc_view_as cookie targeting a
 * valid user whose role matches the cookie.
 */
export async function getContext(): Promise<ApiContext> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Not authenticated");

  const requester = (await prisma.user.findUnique({
    where: { id: session.sub },
    include: profileInclude,
  })) as UserWithProfiles | null;

  if (!requester) throw new ApiError(401, "User not found");
  if (requester.status === "INACTIVE")
    throw new ApiError(403, "Account is inactive");

  let effective = requester;
  let isViewingAs = false;

  if (requester.role === "ADMIN") {
    const viewAs = await getViewAs();
    if (viewAs) {
      const target = (await prisma.user.findUnique({
        where: { id: viewAs.targetUserId },
        include: profileInclude,
      })) as UserWithProfiles | null;
      if (target && target.role === viewAs.role) {
        effective = target;
        isViewingAs = true;
      }
    }
  }

  return { requester, effective, isViewingAs };
}

export function requireRole(ctx: ApiContext, roles: Role[]) {
  if (!roles.includes(ctx.effective.role)) {
    throw new ApiError(403, "Forbidden");
  }
}

/**
 * Returns the set of patient profile ids the effective user may access.
 * ADMIN (not viewing-as) => all patients.
 */
export async function accessiblePatientIds(
  ctx: ApiContext
): Promise<string[]> {
  const { effective } = ctx;

  if (effective.role === "ADMIN") {
    const all = await prisma.patientProfile.findMany({ select: { id: true } });
    return all.map((p) => p.id);
  }

  if (effective.role === "PATIENT") {
    return effective.patientProfile ? [effective.patientProfile.id] : [];
  }

  if (effective.role === "PROVIDER") {
    if (!effective.providerProfile) return [];
    const teams = await prisma.teamMember.findMany({
      where: { providerId: effective.providerProfile.id },
      select: { patientId: true },
    });
    return teams.map((t) => t.patientId);
  }

  if (effective.role === "AGENCY") {
    if (!effective.agencyProfile) return [];
    const patients = await prisma.patientProfile.findMany({
      where: { agencyId: effective.agencyProfile.id },
      select: { id: true },
    });
    return patients.map((p) => p.id);
  }

  return [];
}

export async function assertPatientAccess(
  ctx: ApiContext,
  patientId: string
): Promise<void> {
  const ids = await accessiblePatientIds(ctx);
  if (!ids.includes(patientId)) {
    throw new ApiError(403, "You do not have access to this patient");
  }
}

/** Whether the effective user may edit patient-scoped content (patient/agency/admin). */
export function canManage(ctx: ApiContext): boolean {
  return ["PATIENT", "AGENCY", "ADMIN"].includes(ctx.effective.role);
}

export async function writeAudit(
  actorUserId: string | null,
  action: string,
  opts: { targetType?: string; targetId?: string; detail?: string } = {}
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? undefined,
        action,
        targetType: opts.targetType,
        targetId: opts.targetId,
        detail: opts.detail,
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
