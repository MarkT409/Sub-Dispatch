/**
 * Mirrors the job board Apps Script WORKER_MAP → invoice tab names.
 * Admin sync keeps only jobs that resolve to "Lantana".
 */
const WORKER_MAP: Record<string, string> = {
  // Rogelio crew
  "juan nava": "Rogelio",
  juan: "Rogelio",
  george: "Rogelio",
  "new nava": "Rogelio",
  vivian: "Rogelio",
  matt: "Rogelio",
  rogelio: "Rogelio",
  rogellio: "Rogelio",
  "jorge nava": "Rogelio",
  jorge: "Rogelio",

  // GMA
  salmon: "GMA",
  "alejandro q": "GMA",
  alejandro: "GMA",
  gma: "GMA",

  // Ed's Services
  ed: "Ed's Services",
  miguel: "Ed's Services",

  // Art Electric / Colt
  art: "Colt",
  "jose v": "Colt",
  "jose vara": "Colt",
  arturo: "Colt",
  laura: "Colt",
  colt: "Colt",
  lupe: "Colt",
  "carlos vara": "Colt",

  // Individual subs
  leidy: "Leidy",
  larry: "Leidy",
  jimmy: "Jimmy",
  adan: "Adan",
  adon: "Adan",
  astro: "Jose O. (Astro)",
  julio: "Julio O.",
  juanito: "Juan",
  botas: "Juan",
  ray: "Ray Ray",
  nora: "Nora",
  jose: "JSJ Group Invest",
  liz: "Elizabeth",
  alex: "Alex",
  jeff: "Leal",
  leal: "Leal",
  yusmanis: "YRT",
  yusmani: "YRT",
  yrt: "YRT",
  "mario alanis": "Mario A",

  // Rapid
  erick: "RAPID",

  // Tri County
  brayan: "BRAYAN",

  // Lantana Electric
  jesus: "Lantana",
  lantana: "Lantana",
  leo: "Lantana",
  gilbert: "Lantana",
};

export const LANTANA_INVOICE_TAB = "Lantana";

/** Resolve assignee text (after the dash) to an invoice tab name. */
export function resolveInvoiceTab(workerRaw: string | null | undefined): string | null {
  const key = String(workerRaw || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!key) return null;

  if (WORKER_MAP[key]) return WORKER_MAP[key];

  // Prefer longer keys first so "jose vara" wins over "jose"
  const entries = Object.entries(WORKER_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of entries) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

export function isLantanaJob(workerRaw: string | null | undefined): boolean {
  return resolveInvoiceTab(workerRaw) === LANTANA_INVOICE_TAB;
}
