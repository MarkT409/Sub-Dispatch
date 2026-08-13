import { createClient } from "@supabase/supabase-js";

function isPlaceholder(value: string | undefined) {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return (
    v.includes("your_project") ||
    v.includes("your-service-role-key") ||
    v.includes("your-anon-key") ||
    v === "change-me-to-a-long-random-string"
  );
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || isPlaceholder(url) || isPlaceholder(key)) {
    throw new Error(
      "Set real NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (placeholders will not work).",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function hasServiceRoleEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key && !isPlaceholder(url) && !isPlaceholder(key));
}
