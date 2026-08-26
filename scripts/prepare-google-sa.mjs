/**
 * Write Google SA PEM for runtime from env (build-only on Netlify).
 * Keeps the long private key out of Lambda's 4KB env budget.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "secrets", "google-sa.pem");

function loadDotEnvLocal() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

function toPem(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  if (!trimmed.includes("BEGIN") && /^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    const decoded = Buffer.from(trimmed.replace(/\s+/g, ""), "base64").toString(
      "utf8",
    );
    if (decoded.includes("BEGIN")) return decoded;
  }
  return trimmed.replace(/\\n/g, "\n");
}

loadDotEnvLocal();
const pem = toPem(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
if (!pem) {
  console.log("prepare-google-sa: no GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (skip)");
  process.exit(0);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, pem, { mode: 0o600 });
console.log("prepare-google-sa: wrote secrets/google-sa.pem");
