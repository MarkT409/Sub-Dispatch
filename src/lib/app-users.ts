import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAdminEmails,
  getSuperAdminEmails,
  isAdminEmail,
  isSuperAdminEmail,
  normalizeEmail,
  type AppRole,
} from "@/lib/admin-auth";

export type AppUserRecord = {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
  board_write: boolean;
  active: boolean;
};

/**
 * Ensure an app_users row exists for env-bootstrap admins, then return the
 * effective role flags for the session.
 */
export async function resolveAppUser(
  supabase: SupabaseClient,
  emailRaw: string,
  name?: string | null,
): Promise<{
  appUser: AppUserRecord | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  boardWrite: boolean;
  role: AppRole | null;
}> {
  const email = normalizeEmail(emailRaw);

  let { data: existing } = await supabase
    .from("app_users")
    .select("id, email, name, role, board_write, active")
    .eq("email", email)
    .maybeSingle();

  // Fallback for rows stored before normalize (mixed case)
  if (!existing) {
    const { data: byIlike } = await supabase
      .from("app_users")
      .select("id, email, name, role, board_write, active")
      .ilike("email", email)
      .maybeSingle();
    existing = byIlike;
  }

  if (existing && existing.active) {
    const isSuperAdmin = existing.role === "super_admin";
    return {
      appUser: existing as AppUserRecord,
      isAdmin: true,
      isSuperAdmin,
      boardWrite: isSuperAdmin || Boolean(existing.board_write),
      role: existing.role as AppRole,
    };
  }

  // Bootstrap from env on first successful admin sign-in
  if (isSuperAdminEmail(email)) {
    const { data: upserted, error } = await supabase
      .from("app_users")
      .upsert(
        {
          email,
          name: name ?? null,
          role: "super_admin",
          board_write: true,
          active: true,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      )
      .select("id, email, name, role, board_write, active")
      .single();

    if (error) {
      console.error("Failed to bootstrap super_admin:", error.message);
      return {
        appUser: null,
        isAdmin: true,
        isSuperAdmin: true,
        boardWrite: true,
        role: "super_admin",
      };
    }

    return {
      appUser: upserted as AppUserRecord,
      isAdmin: true,
      isSuperAdmin: true,
      boardWrite: true,
      role: "super_admin",
    };
  }

  if (isAdminEmail(email)) {
    const { data: upserted, error } = await supabase
      .from("app_users")
      .upsert(
        {
          email,
          name: name ?? null,
          role: "admin",
          board_write: false,
          active: true,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      )
      .select("id, email, name, role, board_write, active")
      .single();

    if (error) {
      console.error("Failed to bootstrap admin:", error.message);
      // Still allow via env allowlist
      return {
        appUser: null,
        isAdmin: true,
        isSuperAdmin: false,
        boardWrite: false,
        role: "admin",
      };
    }

    const isSuperAdmin = upserted.role === "super_admin";
    return {
      appUser: upserted as AppUserRecord,
      isAdmin: true,
      isSuperAdmin,
      boardWrite: isSuperAdmin || Boolean(upserted.board_write),
      role: upserted.role as AppRole,
    };
  }

  if (existing && !existing.active) {
    return {
      appUser: null,
      isAdmin: false,
      isSuperAdmin: false,
      boardWrite: false,
      role: null,
    };
  }

  return {
    appUser: null,
    isAdmin: false,
    isSuperAdmin: false,
    boardWrite: false,
    role: null,
  };
}

export function hasBootstrapAdmins() {
  return getSuperAdminEmails().length > 0 || getAdminEmails().length > 0;
}
