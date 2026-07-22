import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getContext, json, errorResponse, ApiError } from "@/lib/api";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    if (ctx.requester.role !== "ADMIN") throw new ApiError(403, "Forbidden");
    const role = req.nextUrl.searchParams.get("role") as Role | null;
    if (!role || !["PATIENT", "PROVIDER", "AGENCY"].includes(role))
      throw new ApiError(400, "Valid role query param is required");
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return json(users);
  } catch (err) {
    return errorResponse(err);
  }
}
