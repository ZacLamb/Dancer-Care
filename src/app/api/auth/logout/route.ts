import { clearSessionCookie } from "@/lib/auth";
import { json, errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearSessionCookie();
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
