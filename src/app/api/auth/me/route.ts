import { getContext, json, errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getContext();
    return json({
      user: {
        id: ctx.effective.id,
        email: ctx.effective.email,
        name: ctx.effective.name,
        role: ctx.effective.role,
      },
      requesterRole: ctx.requester.role,
      isViewingAs: ctx.isViewingAs,
      viewAs: ctx.isViewingAs
        ? { name: ctx.effective.name, role: ctx.effective.role }
        : null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
