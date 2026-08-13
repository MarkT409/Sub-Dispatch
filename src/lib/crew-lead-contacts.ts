/**
 * Rough / Trim crew-lead contacts to seed onto sub_workers.
 * team = invoice / Crew-tab team name; match = preferred display name on that team.
 */
export type LeadContact = {
  team: string;
  /** Preferred worker name stored on the team */
  name: string;
  /** Alternate names already on the board / worker map */
  aliases?: string[];
  phone: string;
};

export const CREW_LEAD_CONTACTS: LeadContact[] = [
  // Rough teams
  { team: "Ed's Services", name: "Ed", phone: "(210) 988-4962" },
  {
    team: "Rogelio",
    name: "Moises Cruz",
    aliases: ["Moises", "Moses", "Moses Cruz"],
    phone: "(210) 412-8091",
  },
  {
    team: "Rogelio",
    name: "George Nava",
    aliases: ["George"],
    phone: "(210) 749-6152",
  },
  {
    team: "Rogelio",
    name: "Rogellio Navarrette",
    aliases: ["Rogelio", "Rogellio", "Rogellio Navarrette"],
    phone: "(210) 873-0404",
  },
  {
    team: "Adan",
    name: "Adan Bautista",
    aliases: ["Adan", "Adon"],
    phone: "(512) 757-9863",
  },
  { team: "Jimmy", name: "Jimmy", phone: "(210) 461-2269" },
  {
    team: "BRAYAN",
    name: "Brayan",
    aliases: ["Brayan"],
    phone: "(210) 564-4380",
  },
  { team: "Lantana", name: "Leo", phone: "(470) 563-5465" },

  // Trim teams
  {
    team: "Colt",
    name: "Laura T",
    aliases: ["Laura"],
    phone: "(210) 995-7865",
  },
  {
    team: "Colt",
    name: "Jose Vara",
    aliases: ["Jose V", "Jose Vara"],
    phone: "(210) 701-3630",
  },
  {
    team: "Colt",
    name: "Art Vara",
    aliases: ["Art", "Arturo"],
    phone: "(210) 371-1944",
  },
  {
    team: "Julio O.",
    name: "Julio Ontiveros",
    aliases: ["Julio"],
    phone: "(210) 262-1423",
  },
  {
    team: "Nora",
    name: "Nora Sanchez",
    aliases: ["Nora"],
    phone: "(210) 919-5817",
  },
  {
    team: "Elizabeth",
    name: "Liz Overby",
    aliases: ["Liz"],
    phone: "(832) 791-6782",
  },
  {
    team: "Leidy",
    name: "Leidy Borja",
    aliases: ["Leidy"],
    phone: "(210) 844-3932",
  },
  {
    team: "Jose O. (Astro)",
    name: "Astro Ontiveros",
    aliases: ["Astro"],
    phone: "(210) 542-9710",
  },
  {
    team: "Lantana",
    name: "Gilbert",
    aliases: ["Gilbert (Lantana)"],
    phone: "(832) 399-1024",
  },
];

export function normalizeContactName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
