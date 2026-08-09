const DEFAULT_ACCOUNTS = "https://accounts.zoho.com";

/** Map Zoho `location` callback param → accounts host for that data center. */
const LOCATION_ACCOUNTS: Record<string, string> = {
  us: "https://accounts.zoho.com",
  com: "https://accounts.zoho.com",
  eu: "https://accounts.zoho.eu",
  in: "https://accounts.zoho.in",
  au: "https://accounts.zoho.com.au",
  jp: "https://accounts.zoho.jp",
  ca: "https://accounts.zohocloud.ca",
  sa: "https://accounts.zoho.sa",
};

export function getZohoAccountsBase(location?: string | null) {
  if (location) {
    const mapped = LOCATION_ACCOUNTS[location.toLowerCase()];
    if (mapped) return mapped;
  }
  const fromEnv = (process.env.ZOHO_ACCOUNTS_URL ?? "").replace(/\/$/, "");
  return fromEnv || DEFAULT_ACCOUNTS;
}

export function getSiteUrl() {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.URL) return process.env.URL.replace(/\/$/, ""); // Netlify
  return "http://localhost:3000";
}

export function getZohoRedirectUri() {
  return `${getSiteUrl()}/api/admin/zoho/callback`;
}

export function buildZohoAuthorizeUrl(state: string) {
  const clientId = process.env.ZOHO_CLIENT_ID;
  if (!clientId) throw new Error("ZOHO_CLIENT_ID is not set");

  const accounts = getZohoAccountsBase();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "openid,email,profile",
    redirect_uri: getZohoRedirectUri(),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${accounts}/oauth/v2/auth?${params.toString()}`;
}

export type ZohoIdClaims = {
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  family_name?: string;
  sub?: string;
};

export function decodeJwtPayload<T>(token: string): T {
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid JWT");
  const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8",
  );
  return JSON.parse(json) as T;
}

export async function exchangeZohoCode(code: string, location?: string | null) {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET are not set");
  }

  const accounts = getZohoAccountsBase(location);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getZohoRedirectUri(),
    code,
  });

  const response = await fetch(`${accounts}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await response.json().catch(() => null)) as {
    access_token?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!response.ok || !data?.id_token) {
    const message =
      data?.error_description || data?.error || `Token exchange failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}
