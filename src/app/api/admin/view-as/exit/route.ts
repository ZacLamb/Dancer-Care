import { clearViewAsCookie } from "@/lib/auth";
import { getContext, json, errorResponse, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const ctx = await getContext();
    if (ctx.requester.role !== "ADMIN")
      throw new ApiError(403, "Forbidden");
    await clearViewAsCookie();
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
