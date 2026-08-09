import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "lantana_admin_session";
export const ZOHO_OAUTH_STATE_COOKIE = "lantana_zoho_oauth_state";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export type AdminSession = {
  email: string;
  name?: string;
  sub?: string;
};

function getSessionSecret() {
  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ZOHO_CLIENT_SECRET ||
    process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!secret) {
    throw new Error(
      "Set ADMIN_SESSION_SECRET (or ZOHO_CLIENT_SECRET) in .env.local to sign admin sessions.",
    );
  }
  return new TextEncoder().encode(secret);
}

export function hasZohoOAuthEnv() {
  return Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET);
}

export async function createAdminSessionToken(session: AdminSession) {
  return new SignJWT({
    email: session.email.toLowerCase(),
    name: session.name,
    sub: session.sub,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSessionSecret());
}

export async function verifyAdminSessionToken(
  token: string | undefined | null,
): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email) return null;
    return {
      email: email.toLowerCase(),
      name: typeof payload.name === "string" ? payload.name : undefined,
      sub: typeof payload.sub === "string" ? payload.sub : undefined,
    };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export function applyAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
