import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatPhoneDisplay,
  phoneDigits,
  toE164,
} from "@/lib/crew-phone-auth";
import {
  isAdminEmail,
  isSuperAdminEmail,
  normalizeEmail,
  type AppRole,
} from "@/lib/admin-auth";

/**
 * Optional bootstrap map: ADMIN_PHONES=2105550100:you@company.com,5125550199:other@co.com
 */
export function getAdminPhoneEmailMap(): Map<string, string> {
  const raw = process.env.ADMIN_PHONES ?? "";
  const map = new Map<string, string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [phonePart, emailPart] = trimmed.split(":").map((s) => s.trim());
    if (!phonePart || !emailPart) continue;
    const digits = phoneDigits(phonePart);
    const email = normalizeEmail(emailPart);
    if (digits.length === 10 && email.includes("@")) {
      map.set(digits, email);
    }
  }
  return map;
}

export type AdminPhoneMatch = {
  email: string | null;
  name: string | null;
  role: AppRole;
  board_write: boolean;
  appUserId: string | null;
};

export async function findAdminByPhone(
  supabase: SupabaseClient,
  rawPhone: string,
): Promise<AdminPhoneMatch | null> {
  const digits = phoneDigits(rawPhone);
  if (digits.length !== 10) return null;

  const { data: users } = await supabase
    .from("app_users")
    .select("id, email, name, role, board_write, active, phone")
    .eq("active", true)
    .not("phone", "is", null);

  const byPhone = (users ?? []).find(
    (u) => u.phone && phoneDigits(u.phone) === digits,
  );
  if (byPhone) {
    return {
      email: byPhone.email ?? null,
      name: byPhone.name,
      role: byPhone.role as AppRole,
      board_write: Boolean(byPhone.board_write),
      appUserId: byPhone.id,
    };
  }

  const mappedEmail = getAdminPhoneEmailMap().get(digits);
  if (!mappedEmail) return null;
  if (!isAdminEmail(mappedEmail)) return null;

  const role: AppRole = isSuperAdminEmail(mappedEmail)
    ? "super_admin"
    : "admin";

  return {
    email: mappedEmail,
    name: null,
    role,
    board_write: role === "super_admin",
    appUserId: null,
  };
}

/** Persist phone on app_users after a successful admin phone login. */
export async function syncAdminPhoneOnLogin(
  supabase: SupabaseClient,
  match: AdminPhoneMatch,
  rawPhone: string,
) {
  const display = formatPhoneDisplay(rawPhone);
  const e164 = toE164(rawPhone);

  if (match.appUserId) {
    await supabase
      .from("app_users")
      .update({
        phone: display,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", match.appUserId);
    return;
  }

  if (!match.email) return;

  await supabase.from("app_users").upsert(
    {
      email: match.email,
      name: match.name,
      role: match.role,
      board_write: match.role === "super_admin" ? true : match.board_write,
      active: true,
      phone: display,
      last_login_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  void e164;
}
