import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  writeAudit,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getContext();
    if (ctx.effective.role !== "ADMIN")
      throw new ApiError(403, "Forbidden");
    const agencies = await prisma.agencyProfile.findMany({
      include: {
        user: true,
        _count: { select: { patients: true, providers: true } },
      },
      orderBy: { agencyName: "asc" },
    });
    return json(
      agencies.map((a) => ({
        id: a.id,
        agencyName: a.agencyName,
        email: a.user.email,
        phone: a.phone,
        address: a.address,
        patients: a._count.patients,
        providers: a._count.providers,
      }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    if (ctx.effective.role !== "ADMIN")
      throw new ApiError(403, "Only admins can create agencies");

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const agencyName = String(body.agencyName ?? "").trim();
    if (!name || !email || password.length < 8 || !agencyName)
      throw new ApiError(400, "Name, email, agency name and an 8+ char password are required");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, "Email already in use");

    const passwordHash = await hashPassword(password);
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role: "AGENCY" },
      });
      return tx.agencyProfile.create({
        data: {
          userId: user.id,
          agencyName,
          address: body.address ?? undefined,
          phone: body.phone ?? undefined,
        },
      });
    });

    await writeAudit(ctx.requester.id, "create_agency", {
      targetType: "AgencyProfile",
      targetId: created.id,
      detail: agencyName,
    });

    return json({ id: created.id }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
