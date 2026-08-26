import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminEmail, hasSupabaseEnv } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin =
    Boolean(session?.user?.isAdmin) || isAdminEmail(session?.user?.email);

  if (session?.user?.email && isAdmin) {
    return (
      <AdminShell
        email={session.user.email}
        isSuperAdmin={Boolean(session.user.isSuperAdmin)}
        boardWrite={Boolean(session.user.boardWrite || session.user.isSuperAdmin)}
      >
        {children}
      </AdminShell>
    );
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
