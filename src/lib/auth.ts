import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "cc_session";
export const VIEW_AS_COOKIE = "cc_view_as";

export interface SessionPayload {
  sub: string;
  role: Role;
}

export interface ViewAs {
  role: Role;
  targetUserId: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || !payload.role) return null;
    return { sub: payload.sub as string, role: payload.role as Role };
  } catch {
    return null;
  }
}

/** Read the current session from cookies (Server Components / Route Handlers). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Read the view-as cookie (Server Components / Route Handlers). */
export async function getViewAs(): Promise<ViewAs | null> {
  const store = await cookies();
  const raw = store.get(VIEW_AS_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ViewAs;
    if (parsed.role && parsed.targetUserId) return parsed;
    return null;
  } catch {
    return null;
  }
}

const isProd = process.env.NODE_ENV === "production";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  store.set(VIEW_AS_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

export async function setViewAsCookie(value: ViewAs): Promise<void> {
  const store = await cookies();
  store.set(VIEW_AS_COOKIE, JSON.stringify(value), sessionCookieOptions);
}

export async function clearViewAsCookie(): Promise<void> {
  const store = await cookies();
  store.set(VIEW_AS_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

export function dashboardPath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "PATIENT":
      return "/patient/dashboard";
    case "PROVIDER":
      return "/provider/dashboard";
    case "AGENCY":
      return "/agency/dashboard";
  }
}
