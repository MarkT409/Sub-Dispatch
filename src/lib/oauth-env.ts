/** Shared OAuth env helpers (safe to import from auth + server pages). */

export function env(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function isGoogleAuthConfigured() {
  return Boolean(
    env("CREW_GOOGLE_CLIENT_ID", "AUTH_GOOGLE_ID") &&
      env("CREW_GOOGLE_CLIENT_SECRET", "AUTH_GOOGLE_SECRET"),
  );
}
