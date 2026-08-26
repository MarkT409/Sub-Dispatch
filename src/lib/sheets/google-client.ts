import { SignJWT, importPKCS8 } from "jose";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function hasGoogleSheetsEnv() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_JOB_BOARD_SPREADSHEET_ID,
  );
}

export function getJobBoardSpreadsheetId() {
  const id = process.env.GOOGLE_JOB_BOARD_SPREADSHEET_ID?.trim();
  if (!id) throw new Error("GOOGLE_JOB_BOARD_SPREADSHEET_ID is not set");
  return id;
}

function getPrivateKeyPem() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not set");

  // Support Netlify-friendly base64 (no multiline env pain)
  const trimmed = raw.trim();
  if (!trimmed.includes("BEGIN") && /^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    try {
      const decoded = Buffer.from(trimmed.replace(/\s+/g, ""), "base64").toString(
        "utf8",
      );
      if (decoded.includes("BEGIN")) return decoded;
    } catch {
      // fall through to normal PEM handling
    }
  }

  return trimmed.replace(/\\n/g, "\n");
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getGoogleAccessToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!email) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is not set");

  const key = await importPKCS8(getPrivateKeyPem(), "RS256");
  const issuedAt = Math.floor(now / 1000);
  const assertion = await new SignJWT({ scope: SHEETS_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setSubject(email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 3600)
    .sign(key);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;

  if (!response.ok || !data?.access_token) {
    throw new Error(
      data?.error_description || data?.error || `Google token exchange failed (${response.status})`,
    );
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

export type SheetProperties = {
  title: string;
  sheetId: number;
};

export async function listSpreadsheetSheets(spreadsheetId: string): Promise<SheetProperties[]> {
  const token = await getGoogleAccessToken();
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
  url.searchParams.set("fields", "sheets.properties(sheetId,title)");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json().catch(() => null)) as {
    sheets?: { properties?: { sheetId?: number; title?: string } }[];
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || `Sheets metadata failed (${response.status})`);
  }

  return (data?.sheets ?? [])
    .map((sheet) => ({
      title: sheet.properties?.title ?? "",
      sheetId: sheet.properties?.sheetId ?? 0,
    }))
    .filter((sheet) => sheet.title);
}

export async function getSheetValues(
  spreadsheetId: string,
  sheetTitle: string,
  range = "A1:G80",
): Promise<string[][]> {
  const token = await getGoogleAccessToken();
  const quoted = `'${sheetTitle.replace(/'/g, "''")}'`;
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${quoted}!${range}`)}`,
  );

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json().catch(() => null)) as {
    values?: string[][];
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || `Sheets values failed (${response.status})`);
  }

  return data?.values ?? [];
}

function channelToHex(value?: number) {
  return Math.round((value ?? 0) * 255)
    .toString(16)
    .padStart(2, "0");
}

function colorToHex(color?: { red?: number; green?: number; blue?: number } | null) {
  if (!color) return null;
  return `#${channelToHex(color.red)}${channelToHex(color.green)}${channelToHex(color.blue)}`;
}

function colLetter(indexZeroBased: number) {
  let n = indexZeroBased;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/** Values + background colors for board cells (used for rough/trim). */
export async function getSheetGridWithColors(
  spreadsheetId: string,
  sheetTitle: string,
  range = "A1:G80",
): Promise<{ values: string[][]; colors: Record<string, string> }> {
  const token = await getGoogleAccessToken();
  const quoted = `'${sheetTitle.replace(/'/g, "''")}'`;
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
  url.searchParams.set("ranges", `${quoted}!${range}`);
  url.searchParams.set("includeGridData", "true");
  url.searchParams.set(
    "fields",
    "sheets.data.rowData.values.effectiveValue,sheets.data.rowData.values.formattedValue,sheets.data.rowData.values.effectiveFormat.backgroundColor,sheets.data.rowData.values.userEnteredFormat.backgroundColor",
  );

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json().catch(() => null)) as {
    sheets?: {
      data?: {
        rowData?: {
          values?: {
            formattedValue?: string;
            effectiveValue?: { stringValue?: string; numberValue?: number };
            effectiveFormat?: { backgroundColor?: { red?: number; green?: number; blue?: number } };
            userEnteredFormat?: {
              backgroundColor?: { red?: number; green?: number; blue?: number };
            };
          }[];
        }[];
      }[];
    }[];
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || `Sheets grid failed (${response.status})`);
  }

  const rowData = data?.sheets?.[0]?.data?.[0]?.rowData ?? [];
  const values: string[][] = [];
  const colors: Record<string, string> = {};

  rowData.forEach((row, r) => {
    const cells = row.values ?? [];
    const line: string[] = [];
    cells.forEach((cell, c) => {
      const text =
        cell.formattedValue ??
        cell.effectiveValue?.stringValue ??
        (cell.effectiveValue?.numberValue != null
          ? String(cell.effectiveValue.numberValue)
          : "");
      line.push(text);
      const hex =
        colorToHex(cell.effectiveFormat?.backgroundColor) ||
        colorToHex(cell.userEnteredFormat?.backgroundColor);
      if (hex && hex !== "#ffffff" && hex !== "#000000") {
        colors[`${colLetter(c)}${r + 1}`] = hex;
      }
    });
    values.push(line);
  });

  return { values, colors };
}
