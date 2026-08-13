import { createServerClient } from "@supabase/ssr";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin-auth";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabaseResponse = NextResponse.next({ request });

  const secureCookie =
    request.nextUrl.protocol === "https:" ||
    process.env.NODE_ENV === "production";
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    secureCookie,
  });
  const hasNextAuthAdmin = Boolean(
    token &&
      (token.isAdmin === true ||
        token.role === "admin" ||
        token.role === "super_admin" ||
        isAdminEmail(token.email as string | undefined)),
  );

  let supabaseUserEmail: string | null = null;

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    supabaseUserEmail = user?.email ?? null;
  }

  const hasSupabaseAdmin = isAdminEmail(supabaseUserEmail);
  const isAuthedAdmin = hasNextAuthAdmin || hasSupabaseAdmin;

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin");
  const isPublicAdminApi =
    pathname.startsWith("/api/admin/auth/") ||
    pathname === "/api/admin/request-link" ||
    pathname === "/api/admin/password-login" ||
    pathname === "/api/admin/bootstrap-password" ||
    pathname === "/api/admin/logout" ||
    pathname === "/api/admin/sheets/sync";

  if ((isAdminRoute || isAdminApi) && !isLoginRoute && !isPublicAdminApi) {
    if (!isAuthedAdmin) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", pathname);
      // Signed in, but not an admin (env allowlist or app_users role)
      if (token?.email) {
        loginUrl.searchParams.set("error", "unauthorized");
        loginUrl.searchParams.set("email", String(token.email));
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isLoginRoute && isAuthedAdmin) {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname = "/admin";
    dashboard.search = "";
    return NextResponse.redirect(dashboard);
  }

  return supabaseResponse;
}
