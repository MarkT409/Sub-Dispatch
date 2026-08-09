import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";
import { createServiceClient, hasServiceRoleEnv } from "@/lib/supabase/service";

/** Supabase client for admin panel server pages (Zoho session → service role). */
export async function getAdminDataClient() {
  const session = await getAdminSession();
  if (session && isAdminEmail(session.email) && hasServiceRoleEnv()) {
    return createServiceClient();
  }
  return createClient();
}
