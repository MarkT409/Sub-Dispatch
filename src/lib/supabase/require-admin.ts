import { isAdminEmail } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await getAdminSession();
  if (session && isAdminEmail(session.email) && hasServiceRoleEnv()) {
    return {
      supabase: createServiceClient(),
      user: { email: session.email, id: session.sub ?? session.email },
      errorResponse: null,
    };
  }

  // Legacy Supabase password / magic-link sessions
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user && isAdminEmail(user.email)) {
      return { supabase, user, errorResponse: null };
    }
  } catch {
    // Missing Supabase env
  }

  return {
    supabase: null,
    user: null,
    errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}
