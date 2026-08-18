/**
 * Default subcontractor teams (Crew tab + board assignee autocomplete).
 * Keys in WORKER_MAP resolve typed board names → invoice / team names.
 */

export type SeedTeam = {
  name: string;
  members: string[];
};

export const DEFAULT_SUB_TEAMS: SeedTeam[] = [
  {
    name: "Rogelio",
    members: [
      "Juan Nava",
      "Juan",
      "George",
      "New Nava",
      "Vivian",
      "Matt",
      "Rogelio",
      "Jorge Nava",
      "Jorge",
    ],
  },
  {
    name: "GMA",
    members: ["Salmon", "Alejandro Q", "Alejandro", "GMA"],
  },
  {
    name: "Ed's Services",
    members: ["Ed", "Miguel"],
  },
  {
    name: "Colt",
    members: [
      "Art",
      "Jose V",
      "Jose Vara",
      "Arturo",
      "Laura",
      "Colt",
      "Lupe",
      "Carlos Vara",
    ],
  },
  {
    name: "Leidy",
    members: ["Leidy", "Larry"],
  },
  {
    name: "Jimmy",
    members: ["Jimmy"],
  },
  {
    name: "Adan",
    members: ["Adan"],
  },
  {
    name: "Jose O. (Astro)",
    members: ["Astro"],
  },
  {
    name: "Julio O.",
    members: ["Julio"],
  },
  {
    name: "Juan",
    members: ["Juanito", "Botas"],
  },
  {
    name: "Ray Ray",
    members: ["Ray"],
  },
  {
    name: "Nora",
    members: ["Nora"],
  },
  {
    name: "JSJ Group Invest",
    members: ["Jose"],
  },
  {
    name: "Elizabeth",
    members: ["Liz"],
  },
  {
    name: "Alex",
    members: ["Alex"],
  },
  {
    name: "Leal",
    members: ["Jeff", "Leal"],
  },
  {
    name: "YRT",
    members: ["Yusmanis", "Yusmani", "YRT"],
  },
  {
    name: "Mario A",
    members: ["Mario Alanis"],
  },
  {
    name: "RAPID",
    members: ["Erick"],
  },
  {
    name: "BRAYAN",
    members: ["Brayan"],
  },
  {
    name: "Lantana",
    members: ["Jesus", "Leo", "Gilbert", "Emir", "Mark"],
  },
];

/** Flat suggestion list: team names + member names (unique, case-insensitive). */
export function suggestionsFromTeams(
  teams: { name: string; members: { name: string }[] }[],
) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const team of teams) {
    for (const label of [team.name, ...team.members.map((m) => m.name)]) {
      const key = label.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(label.trim());
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function defaultAssigneeSuggestions() {
  return suggestionsFromTeams(
    DEFAULT_SUB_TEAMS.map((t) => ({
      name: t.name,
      members: t.members.map((name) => ({ name })),
    })),
  );
}

export function filterAssigneeSuggestions(
  suggestions: string[],
  query: string,
  limit = 8,
) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return suggestions
    .filter((s) => s.toLowerCase().startsWith(q))
    .slice(0, limit);
}

/**
 * Mirrors the job board Apps Script WORKER_MAP → invoice tab names.
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
  emir: "Lantana",
  mark: "Lantana",
};

export const LANTANA_INVOICE_TAB = "Lantana";

/** Resolve assignee text (after the dash) to an invoice tab name. */
export function resolveInvoiceTab(
  workerRaw: string | null | undefined,
): string | null {
  const key = String(workerRaw || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!key) return null;

  if (WORKER_MAP[key]) return WORKER_MAP[key];

  const entries = Object.entries(WORKER_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [k, v] of entries) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

export function isLantanaJob(workerRaw: string | null | undefined): boolean {
  return resolveInvoiceTab(workerRaw) === LANTANA_INVOICE_TAB;
}
