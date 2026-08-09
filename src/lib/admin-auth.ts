function normalizeEmail(email: string) {
  return email.trim().toLowerCase().replace(/^["']+|["']+$/g, "");
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

/** Optional: ADMIN_EMAIL_DOMAIN=lantanaelectric.com allows any address on that domain */
export function getAdminEmailDomain(): string | null {
  const domain = (process.env.ADMIN_EMAIL_DOMAIN ?? "").trim().toLowerCase().replace(/^@/, "");
  return domain || null;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) return false;

  const allowlist = getAdminEmails();
  if (allowlist.includes(normalized)) return true;

  const domain = getAdminEmailDomain();
  if (domain && normalized.endsWith(`@${domain}`)) return true;

  return false;
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function adminAllowlistConfigured(): boolean {
  return getAdminEmails().length > 0 || Boolean(getAdminEmailDomain());
}
