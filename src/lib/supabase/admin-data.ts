import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";

/** Supabase client for admin panel server pages (SSO session → service role). */
export async function getAdminDataClient() {
  const session = await auth();
  const isAdmin = Boolean(
    session?.user?.isAdmin || isAdminEmail(session?.user?.email),
  );
  if (isAdmin && hasServiceRoleEnv()) {
    return createServiceClient();
  }
  return createClient();
}
