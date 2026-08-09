import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin-auth";
import {
  ZOHO_OAUTH_STATE_COOKIE,
  applyAdminSessionCookie,
  createAdminSessionToken,
} from "@/lib/admin-session";
import {
  decodeJwtPayload,
  exchangeZohoCode,
  type ZohoIdClaims,
} from "@/lib/zoho-oauth";

function loginError(request: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/admin/login?error=${code}`, request.url));
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const error = url.searchParams.get("error");
  if (error) {
    return loginError(request, "zoho_denied");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const location = url.searchParams.get("location");

  if (!code || !state) {
    return loginError(request, "auth");
  }

  const rawState = request.cookies.get(ZOHO_OAUTH_STATE_COOKIE)?.value;
  let expectedState = "";
  let next = "/admin";
  try {
    const parsed = JSON.parse(rawState ?? "{}") as { state?: string; next?: string };
    expectedState = parsed.state ?? "";
    if (parsed.next?.startsWith("/")) next = parsed.next;
  } catch {
    // ignore
  }

  if (!expectedState || expectedState !== state) {
    return loginError(request, "auth");
  }

  try {
    const tokens = await exchangeZohoCode(code, location);
    const claims = decodeJwtPayload<ZohoIdClaims>(tokens.id_token!);
    const email = claims.email?.trim().toLowerCase();

    if (!email) {
      return loginError(request, "zoho_email");
    }

    if (!isAdminEmail(email)) {
      return loginError(request, "unauthorized");
    }

    const name =
      claims.name ||
      [claims.given_name, claims.family_name].filter(Boolean).join(" ") ||
      undefined;

    const sessionToken = await createAdminSessionToken({
      email,
      name,
      sub: claims.sub,
    });

    const response = NextResponse.redirect(new URL(next, request.url));
    applyAdminSessionCookie(response, sessionToken);
    response.cookies.set(ZOHO_OAUTH_STATE_COOKIE, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return loginError(request, "zoho_token");
  }
}
