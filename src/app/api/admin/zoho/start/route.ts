import { NextResponse, type NextRequest } from "next/server";
import {
  ZOHO_OAUTH_STATE_COOKIE,
  hasZohoOAuthEnv,
} from "@/lib/admin-session";
import { buildZohoAuthorizeUrl } from "@/lib/zoho-oauth";

export async function GET(request: NextRequest) {
  if (!hasZohoOAuthEnv()) {
    return NextResponse.redirect(
      new URL("/admin/login?error=zoho_config", request.url),
    );
  }

  const next = request.nextUrl.searchParams.get("next") || "/admin";
  const state = crypto.randomUUID();
  const authorizeUrl = buildZohoAuthorizeUrl(state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(ZOHO_OAUTH_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
