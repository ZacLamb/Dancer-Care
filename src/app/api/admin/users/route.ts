import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { seedPatientDefaults } from "@/lib/patient-defaults";
import { getContext, json, errorResponse, ApiError, writeAudit } from "@/lib/api";
import type { Prisma, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    if (ctx.requester.role !== "ADMIN") throw new ApiError(403, "Forbidden");

    const role = req.nextUrl.searchParams.get("role");
    const status = req.nextUrl.searchParams.get("status");
    const q = req.nextUrl.searchParams.get("q");

    const where: Prisma.UserWhereInput = {};
    if (role && ["PATIENT", "PROVIDER", "AGENCY", "ADMIN"].includes(role))
      where.role = role as Role;
    if (status && ["ACTIVE", "INACTIVE"].includes(status))
      where.status = status as "ACTIVE" | "INACTIVE";
    if (q)
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];

    const users = await prisma.user.findMany({
      where,
      include: {
        agencyProfile: true,
        patientProfile: { include: { agency: true } },
        providerProfile: { include: { agency: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        agencyName:
          u.agencyProfile?.agencyName ??
          u.patientProfile?.agency?.agencyName ??
          u.providerProfile?.agency?.agencyName ??
          null,
        title: u.providerProfile?.title ?? null,
      }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    if (ctx.requester.role !== "ADMIN") throw new ApiError(403, "Forbidden");

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role as Role;
    if (!name || !email || password.length < 8)
      throw new ApiError(400, "Name, email and an 8+ char password are required");
    if (!["PATIENT", "PROVIDER", "AGENCY", "ADMIN"].includes(role))
      throw new ApiError(400, "Invalid role");
    if (role === "AGENCY" && !String(body.agencyName ?? "").trim())
      throw new ApiError(400, "Agency name is required");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, "Email already in use");

    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, passwordHash, role, phone: body.phone ?? undefined },
      });
      if (role === "AGENCY") {
        await tx.agencyProfile.create({
          data: { userId: created.id, agencyName: String(body.agencyName).trim() },
        });
      } else if (role === "PATIENT") {
        const profile = await tx.patientProfile.create({
          data: { userId: created.id, agencyId: body.agencyId || undefined },
        });
        await seedPatientDefaults(tx, profile.id);
      } else if (role === "PROVIDER") {
        await tx.providerProfile.create({
          data: {
            userId: created.id,
            agencyId: body.agencyId || undefined,
            title: body.title || undefined,
          },
        });
      }
      return created;
    });

    await writeAudit(ctx.requester.id, "admin_create_user", {
      targetType: "User",
      targetId: user.id,
      detail: `${name} (${role})`,
    });
    return json({ id: user.id }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
