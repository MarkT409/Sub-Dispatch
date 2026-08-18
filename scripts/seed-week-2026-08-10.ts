/**
 * One-off: insert this week's board jobs from pasted day sheets.
 * Week: Mon 2026-08-10 … Fri 2026-08-14
 *
 * Run: npx tsx scripts/seed-week-2026-08-10.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

const DAYS = {
  MON: "2026-08-10",
  TUE: "2026-08-11",
  WED: "2026-08-12",
  THU: "2026-08-13",
  FRI: "2026-08-14",
} as const;

type DayKey = keyof typeof DAYS;

const BOARD: Record<string, Partial<Record<DayKey, string[]>>> = {
  FALIK: {
    MON: [
      "5539 Gatewood Trl / Meter - Colt (Sat)",
      "5543 Gatewood Trl / Meter - Adon",
    ],
    TUE: ["1538 Silver Run - Adan"],
    WED: [
      "3229 Climb Dr/Meter - Laura",
      "10120 Gold Point-Art",
      "5555 Gatewood Trail / Meter-Astro",
      "5547 Gatewood Trail / Meter-Jose V",
      "5535 Gatewood Trail / Meter-Jose v",
    ],
    THU: ["1667 Planters Moon - Art"],
  },
  RAFAEL: {
    MON: [
      "126 Haley Way / Ser - Rogellio",
      "1923 Bob Sandlin Way - Brayan",
    ],
    TUE: [
      "605 Drake Dr / Ser - Brayan",
      "5115 Puerta de Maya / Ser - Rogelio",
      "1922 Black Stork / Meter - Liz",
    ],
    WED: ["130 Haley Way / Ser-Rogelio", "625 Drake-Julio"],
    THU: [
      "12823 Mira El Sol / Meter - Liz",
      "1907 Bob Sandlin Way / Ser - Rogellio",
      "1915 Bob Sandlin Way / Ser - Rogellio",
    ],
  },
  ANDREW: {
    TUE: ["1128 Elm Forest - Leidy"],
    THU: ["818 Fusion Street - Jeff Leal", "856 Merging Rivers - LEO"],
    FRI: ["203 Saddle Dawn"],
  },
  MIKE: {
    MON: ["3575 Prominence - Laura"],
    TUE: ["5544 Eula Lane - George", "1614 Tiptop Meadow - Laura"],
    WED: [
      "432 Huck Point - George",
      "1725 Knoll Ridge / Ser-Adon",
      "1929 Stonechat / Meter-Nora",
    ],
    THU: ["1615 Hummock Steep - Laura"],
  },
  VARO: {
    MON: [
      "10403 White Hart / Ser (Cosa) - George",
      "11406 Akasa Gardens / Ser - LEO",
      "11412 Evergreen Rose / Ser - Rogellio",
      "11934 Lofted Bloom - ED",
    ],
    TUE: [
      "9927 Sherman View / Ser - Moses (Rogellio)",
      "1824 Marshall Manor / Ser - Rogellio",
      "1932 Pasture Rose / Ser - LEO",
      "11420 Evergreen Rose / Ser - Rogellio",
      "10268 Bartenheim - Jimmy",
      "1832 Marshall Manor / Meter - Astro",
      "1836 Marshall Manor / Meter - Lantana",
    ],
    THU: [
      "11416 Evergreen Rose / Ser - George",
      "11318 Evergreen Rose - Julio",
      "11343 Evergreen Rose - Astro",
      "9923 Sherman View - Jose V",
    ],
  },
  LOGAN: {
    MON: ["2972 Sprouted Grain - Liz", "430 Cleveland - Colt (Weekend)"],
    WED: ["5772 Ryder - Jimmy", "1705 Weissen - Leidy"],
    THU: ["5754 Huron - Jimmy", "453 Wolf Crest - Leidy"],
  },
  STONE: {
    MON: [
      "2268 Namboca (LIGHT PCK) - Nora",
      "613 Madera (LIGHT PCK) - Julio",
    ],
    TUE: ["2312 Salt Cedar - ED"],
    WED: ["620 Dayflower-Liz"],
  },
  JEAN: {
    MON: ["5697 Comal Vista - Jose Vara"],
    WED: ["392 Butternut (Fixtures/plates only)-Leidy"],
  },
  GMA: {
    MON: ["Tpole Day"],
    TUE: [
      "1938 Black Stork - Loop",
      "902 Moonshine - Loop",
      "5019/5023 San Bernard - Loops",
    ],
    WED: ["Mayfair loops (Dr Horton)", "Del Webb Service"],
    THU: [
      "FAH Tpole",
      "2972 Harvest Moon - Loop",
      "5102 Hagerman - Loop",
      "Mill Creek Tpole",
    ],
  },
  BOTAS: {
    MON: ["Tpoles", "5027 San Bernard - Loop"],
    TUE: ["SERVICE FOR FALIK 8/11"],
    WED: ["FAH tpoles", "mill creek loop"],
    THU: ["Service Day Work for Stone***"],
  },
};

function parseCell(raw: string): {
  address: string;
  assigned_to: string | null;
  work_kind: "rough" | "trim" | "service";
} | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (/^nada\.?$/i.test(text)) return null;

  let address = text;
  let assigned_to: string | null = null;
  const dash = text.match(/^(.*?)(?:\s*[-–—]\s*|\s+-\s+)(.+)$/);
  if (dash) {
    address = dash[1].trim();
    assigned_to = dash[2].trim() || null;
  }

  if (!assigned_to) {
    const tight = text.match(/^(.*[a-zA-Z0-9./)])-([A-Za-z].*)$/);
    if (tight && /[A-Za-z)]$/.test(tight[1].trim())) {
      address = tight[1].trim();
      assigned_to = tight[2].trim();
    }
  }

  // Dayflower-Liz / Gold Point-Art
  if (!assigned_to) {
    const m = text.match(/^(.*?)\s*-\s*([A-Za-z].*)$/);
    if (m) {
      address = m[1].trim();
      assigned_to = m[2].trim();
    }
  }

  const ser =
    /\bser(?:vice)?\b/i.test(address) ||
    /\/\s*ser\b/i.test(address) ||
    /\bser\b/i.test(text);
  const work_kind: "rough" | "trim" | "service" = ser ? "service" : "rough";

  if (!address) return null;
  return { address, assigned_to, work_kind };
}

async function rest<T>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (init.prefer) headers.Prefer = init.prefer;

  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (null as T);
}

async function main() {
  const crews = await rest<{ id: string; name: string }[]>(
    "board_crews?active=eq.true&select=id,name",
  );
  const crewByName = new Map(
    crews.map((c) => [c.name.trim().toUpperCase(), c.name] as const),
  );

  const missing = Object.keys(BOARD).filter(
    (n) => !crewByName.has(n.toUpperCase()),
  );
  if (missing.length) {
    console.warn("Missing board_crews (inserting anyway):", missing.join(", "));
  }

  const rows: Record<string, unknown>[] = [];
  for (const [crewKey, days] of Object.entries(BOARD)) {
    const crew_lead = crewByName.get(crewKey.toUpperCase()) ?? crewKey;
    for (const [day, lines] of Object.entries(days) as [DayKey, string[]][]) {
      const work_date = DAYS[day];
      for (const line of lines) {
        const parsed = parseCell(line);
        if (!parsed) continue;
        rows.push({
          title: parsed.address,
          site_address: parsed.address,
          client: crew_lead,
          job_type: "outgoing",
          status: "scheduled",
          start_date: work_date,
          work_date,
          crew_lead,
          assigned_to: parsed.assigned_to,
          work_kind: parsed.work_kind,
          notes: null,
          source: "manual",
        });
      }
    }
  }

  console.log(`Prepared ${rows.length} jobs for week 8/10–8/14`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 40) {
    const chunk = rows.slice(i, i + 40);
    const data = await rest<{ id: string }[]>("jobs", {
      method: "POST",
      body: JSON.stringify(chunk),
      prefer: "return=representation",
    });
    inserted += data?.length ?? chunk.length;
    console.log(`Inserted ${inserted}/${rows.length}`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
