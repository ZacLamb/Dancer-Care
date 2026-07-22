import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getContext,
  json,
  errorResponse,
  ApiError,
  assertPatientAccess,
} from "@/lib/api";

export const dynamic = "force-dynamic";

/** Everyone in a patient's care circle: the patient, their providers, agency. */
async function careCircle(patientId: string) {
  const patient = await prisma.patientProfile.findUnique({
    where: { id: patientId },
    include: {
      user: true,
      agency: { include: { user: true } },
      teamMembers: { include: { provider: { include: { user: true } } } },
    },
  });
  if (!patient) return [];
  const people: { userId: string; name: string; role: string }[] = [];
  people.push({
    userId: patient.user.id,
    name: patient.user.name,
    role: "PATIENT",
  });
  if (patient.agency)
    people.push({
      userId: patient.agency.user.id,
      name: patient.agency.agencyName,
      role: "AGENCY",
    });
  for (const tm of patient.teamMembers)
    people.push({
      userId: tm.provider.user.id,
      name: tm.provider.user.name,
      role: "PROVIDER",
    });
  return people;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext();
    const patientId = req.nextUrl.searchParams.get("patientId");
    const withUserId = req.nextUrl.searchParams.get("withUserId");
    if (!patientId) throw new ApiError(400, "patientId is required");
    await assertPatientAccess(ctx, patientId);

    const circle = await careCircle(patientId);
    const contacts = circle.filter((p) => p.userId !== ctx.effective.id);

    const messages = await prisma.directMessage.findMany({
      where: {
        patientId,
        OR: [
          { senderId: ctx.effective.id },
          { receiverId: ctx.effective.id },
        ],
        ...(withUserId
          ? {
              AND: [
                {
                  OR: [
                    { senderId: withUserId },
                    { receiverId: withUserId },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    return json({ contacts, messages });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext();
    const body = await req.json();
    const patientId = String(body.patientId ?? "");
    const receiverId = String(body.receiverId ?? "");
    if (!patientId || !receiverId || !body.body)
      throw new ApiError(400, "patientId, receiverId and body are required");
    await assertPatientAccess(ctx, patientId);

    const circle = await careCircle(patientId);
    if (!circle.some((p) => p.userId === receiverId))
      throw new ApiError(400, "Recipient is not in this care circle");

    const created = await prisma.directMessage.create({
      data: {
        patientId,
        senderId: ctx.effective.id,
        receiverId,
        body: String(body.body),
      },
    });
    return json(created, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getContext();
    const body = await req.json();
    const patientId = String(body.patientId ?? "");
    const fromUserId = String(body.fromUserId ?? "");
    if (!patientId || !fromUserId)
      throw new ApiError(400, "patientId and fromUserId are required");
    await assertPatientAccess(ctx, patientId);
    await prisma.directMessage.updateMany({
      where: {
        patientId,
        senderId: fromUserId,
        receiverId: ctx.effective.id,
        read: false,
      },
      data: { read: true },
    });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
