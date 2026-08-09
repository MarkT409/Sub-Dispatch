import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminEmail, hasSupabaseEnv } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (session && isAdminEmail(session.email)) {
    return <AdminShell email={session.email}>{children}</AdminShell>;
  }

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && isAdminEmail(user.email)) {
      return <AdminShell email={user.email}>{children}</AdminShell>;
    }
  }

  redirect("/admin/login");
}
