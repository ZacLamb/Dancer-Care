import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  assertPatientAccess,
  writeAudit,
} from "@/lib/api";

export const dynamic = "force-dynamic";

function shape(p: {
  id: string;
  title: string | null;
  bio: string | null;
  agencyId: string | null;
  user: { name: string; email: string; phone: string | null; status: string };
}) {
  return {
    id: p.id,
    name: p.user.name,
    email: p.user.email,
    phone: p.user.phone,
    status: p.user.status,
    title: p.title,
    bio: p.bio,
    agencyId: p.agencyId,
  };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");

    if (patientId) {
      await assertPatientAccess(ctx, patientId);
      const team = await prisma.teamMember.findMany({
        where: { patientId },
        include: { provider: { include: { user: true } } },
      });
      return json(
        team.map((t) => ({
          ...shape(t.provider),
          teamMemberId: t.id,
          teamNotes: t.notes,
        }))
      );
    }

    if (ctx.effective.role === "ADMIN") {
      const all = await prisma.providerProfile.findMany({
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      });
      return json(all.map(shape));
    }

    if (ctx.effective.role === "AGENCY" && ctx.effective.agencyProfile) {
      const list = await prisma.providerProfile.findMany({
        where: { agencyId: ctx.effective.agencyProfile.id },
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      });
      return json(list.map(shape));
    }

    if (ctx.effective.role === "PROVIDER" && ctx.effective.providerProfile) {
      const self = await prisma.providerProfile.findUnique({
        where: { id: ctx.effective.providerProfile.id },
        include: { user: true },
      });
      return json(self ? [shape(self)] : []);
    }

    return json([]);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    if (!["AGENCY", "ADMIN"].includes(ctx.effective.role))
      throw new ApiError(403, "Only agencies and admins can create providers");

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!name || !email || password.length < 8)
      throw new ApiError(400, "Name, email and an 8+ char password are required");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, "Email already in use");

    let agencyId: string | undefined;
    if (ctx.effective.role === "AGENCY") agencyId = ctx.effective.agencyProfile?.id;
    else if (body.agencyId) agencyId = String(body.agencyId);

    const passwordHash = await hashPassword(password);
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role: "PROVIDER", phone: body.phone ?? undefined },
      });
      return tx.providerProfile.create({
        data: {
          userId: user.id,
          agencyId,
          title: body.title ?? undefined,
          bio: body.bio ?? undefined,
        },
      });
    });

    await writeAudit(ctx.requester.id, "create_provider", {
      targetType: "ProviderProfile",
      targetId: created.id,
      detail: name,
    });

    return json({ id: created.id }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
