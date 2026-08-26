import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeEmail } from "@/lib/admin-auth";
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin && !session?.user?.email) {
    redirect("/admin/login");
  }

  const email = normalizeEmail(session!.user!.email || "");
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("app_users")
    .select("id, email, name, phone, role, board_write")
    .eq("email", email)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Your account preferences. Crew contact numbers are managed under Crew;
          org-wide admins are under Users.
        </p>
      </div>
      <AdminSettingsForm
        initial={{
          email: data?.email ?? email,
          name: data?.name ?? session?.user?.name ?? null,
          phone: data?.phone ?? null,
          role: data?.role ?? session?.user?.role ?? null,
          board_write: data?.board_write ?? Boolean(session?.user?.boardWrite),
        }}
      />
    </div>
  );
}
