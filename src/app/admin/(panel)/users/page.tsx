import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminDataClient } from "@/lib/supabase/admin-data";
import {
  StaffAccessManager,
  type StaffUser,
} from "@/components/admin/StaffAccessManager";
import {
  isBoardSupervisorName,
  nameGetsBoardWrite,
} from "@/lib/supervisors";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const isSuperAdmin = Boolean(session.user.isSuperAdmin);
  const supabase = await getAdminDataClient();

  const { data: crews } = await supabase
    .from("board_crews")
    .select("id, name, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const withCrew = await supabase
    .from("app_users")
    .select(
      "id, email, name, phone, role, board_write, active, board_crew_id, last_login_at, created_at",
    )
    .order("role", { ascending: true })
    .order("email", { ascending: true });

  const usersQuery =
    withCrew.error?.message?.includes("board_crew_id") ||
    withCrew.error?.message?.includes("schema cache")
      ? await supabase
          .from("app_users")
          .select(
            "id, email, name, phone, role, board_write, active, last_login_at, created_at",
          )
          .order("role", { ascending: true })
          .order("email", { ascending: true })
      : withCrew;

  const users = (usersQuery.data ?? []).map((u) => ({
    ...u,
    board_crew_id:
      "board_crew_id" in u
        ? ((u as { board_crew_id?: string | null }).board_crew_id ?? null)
        : null,
  }));

  const boardSupervisors = (crews ?? [])
    .filter((c) => isBoardSupervisorName(c.name))
    .map((c) => ({ id: c.id, name: c.name }));

  // Super admins only: keep Dustin/Jacob on board write
  if (isSuperAdmin) {
    for (const u of users ?? []) {
      if (
        u.active &&
        u.role === "admin" &&
        !u.board_write &&
        nameGetsBoardWrite(u.name)
      ) {
        await supabase
          .from("app_users")
          .update({ board_write: true })
          .eq("id", u.id);
        u.board_write = true;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Users
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {isSuperAdmin
            ? "Manage super admins, board supervisors, and admin board access."
            : "View staff and supervisors. Only a super admin can make changes."}
        </p>
      </div>
      <StaffAccessManager
        initialUsers={(users ?? []) as StaffUser[]}
        boardSupervisors={boardSupervisors}
        readOnly={!isSuperAdmin}
      />
    </div>
  );
}
