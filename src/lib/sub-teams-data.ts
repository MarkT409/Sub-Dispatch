import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CREW_LEAD_CONTACTS,
  normalizeContactName,
} from "@/lib/crew-lead-contacts";
import {
  DEFAULT_SUB_TEAMS,
  defaultAssigneeSuggestions,
  suggestionsFromTeams,
} from "@/lib/sub-teams";

export type SubWorker = {
  id: string;
  team_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_lead: boolean;
  sort_order: number;
  active: boolean;
};

export type SubTeam = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  workers: SubWorker[];
};

const WORKER_SELECT =
  "id, team_id, name, phone, email, is_lead, sort_order, active";

export async function fetchSubTeams(
  supabase: SupabaseClient,
): Promise<{ teams: SubTeam[]; error: string | null }> {
  const { data, error } = await supabase
    .from("sub_teams")
    .select(
      `id, name, sort_order, active, sub_workers(${WORKER_SELECT})`,
    )
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("sub_teams fetch failed:", error.message);
    return { teams: [], error: error.message };
  }

  const teams = (data ?? []).map((row) => {
    const workers = (
      (row.sub_workers as Omit<SubWorker, never>[] | null) ?? []
    )
      .filter((w) => w.active !== false)
      .map((w) => ({
        ...w,
        phone: w.phone ?? null,
        email: w.email ?? null,
        is_lead: Boolean(w.is_lead),
      }))
      .sort(
        (a, b) =>
          Number(b.is_lead) - Number(a.is_lead) ||
          a.sort_order - b.sort_order ||
          a.name.localeCompare(b.name),
      );
    return {
      id: row.id as string,
      name: row.name as string,
      sort_order: row.sort_order as number,
      active: row.active as boolean,
      workers,
    };
  });

  return { teams, error: null };
}

function namesMatch(a: string, b: string) {
  const na = normalizeContactName(a);
  const nb = normalizeContactName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // first-token match when one is a short first name ("Ed", "Jimmy")
  const a0 = na.split(" ")[0];
  const b0 = nb.split(" ")[0];
  if (a0 === b0 && (na.split(" ").length === 1 || nb.split(" ").length === 1)) {
    return true;
  }
  return na.includes(nb) || nb.includes(na);
}

function findContactWorker(
  workers: SubWorker[],
  candidates: string[],
): SubWorker | undefined {
  // Prefer exact normalized name so "Jose Vara" wins over fuzzy "Jose V"
  for (const c of candidates) {
    const exact = workers.find(
      (w) => normalizeContactName(w.name) === normalizeContactName(c),
    );
    if (exact) return exact;
  }
  return workers.find((w) => candidates.some((c) => namesMatch(w.name, c)));
}

/**
 * Upsert phone + is_lead for known Rough/Trim contacts onto matching workers.
 * Creates a worker on the team if no name match exists.
 */
export async function syncLeadContacts(supabase: SupabaseClient) {
  const { teams, error: fetchError } = await fetchSubTeams(supabase);
  if (fetchError) {
    return { updated: 0, created: 0, error: fetchError, teams: [] as SubTeam[] };
  }
  if (teams.length === 0) {
    return { updated: 0, created: 0, error: null as string | null, teams };
  }

  const teamByNorm = new Map(
    teams.map((t) => [normalizeContactName(t.name), t] as const),
  );

  let updated = 0;
  let created = 0;

  for (const contact of CREW_LEAD_CONTACTS) {
    const team = teamByNorm.get(normalizeContactName(contact.team));
    if (!team) continue;

    const candidates = [contact.name, ...(contact.aliases ?? [])];
    let match = findContactWorker(team.workers, candidates);

    if (match) {
      if (match.phone !== contact.phone || !match.is_lead) {
        const { error } = await supabase
          .from("sub_workers")
          .update({
            phone: contact.phone,
            is_lead: true,
          })
          .eq("id", match.id);
        if (error) {
          const refetch = await fetchSubTeams(supabase);
          return {
            updated,
            created,
            error: error.message,
            teams: refetch.teams,
          };
        }
        match.phone = contact.phone;
        match.is_lead = true;
        updated += 1;
      }
      continue;
    }

    const sort_order =
      Math.max(0, ...team.workers.map((w) => w.sort_order), 0) + 1;
    const { data: inserted, error } = await supabase
      .from("sub_workers")
      .insert({
        team_id: team.id,
        name: contact.name,
        phone: contact.phone,
        is_lead: true,
        sort_order,
      })
      .select(WORKER_SELECT)
      .single();

    if (error) {
      // Already exists (race or missed match) — update by team + name instead
      if (error.code === "23505" || /duplicate key/i.test(error.message)) {
        const { data: existing } = await supabase
          .from("sub_workers")
          .select(WORKER_SELECT)
          .eq("team_id", team.id)
          .ilike("name", contact.name)
          .limit(1)
          .maybeSingle();

        if (existing) {
          const { error: upErr } = await supabase
            .from("sub_workers")
            .update({ phone: contact.phone, is_lead: true })
            .eq("id", existing.id);
          if (upErr) {
            const refetch = await fetchSubTeams(supabase);
            return {
              updated,
              created,
              error: upErr.message,
              teams: refetch.teams,
            };
          }
          team.workers.push(existing as SubWorker);
          updated += 1;
          continue;
        }
      }
      const refetch = await fetchSubTeams(supabase);
      return {
        updated,
        created,
        error: error.message,
        teams: refetch.teams,
      };
    }

    if (inserted) {
      team.workers.push(inserted as SubWorker);
      created += 1;
    }
  }

  const refetch = await fetchSubTeams(supabase);
  return {
    updated,
    created,
    error: refetch.error,
    teams: refetch.teams,
  };
}

export async function seedSubTeamsIfEmpty(supabase: SupabaseClient) {
  const { count, error: countError } = await supabase
    .from("sub_teams")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return { seeded: false, error: countError.message, teams: [] as SubTeam[] };
  }
  if ((count ?? 0) > 0) {
    const synced = await syncLeadContacts(supabase);
    return {
      seeded: false,
      error: synced.error,
      teams: synced.teams,
    };
  }

  for (let i = 0; i < DEFAULT_SUB_TEAMS.length; i++) {
    const seed = DEFAULT_SUB_TEAMS[i];
    const { data: team, error: teamError } = await supabase
      .from("sub_teams")
      .insert({ name: seed.name, sort_order: i + 1 })
      .select("id")
      .single();

    if (teamError || !team) {
      return {
        seeded: false,
        error: teamError?.message ?? "Could not seed teams",
        teams: [] as SubTeam[],
      };
    }

    if (seed.members.length > 0) {
      const { error: workerError } = await supabase.from("sub_workers").insert(
        seed.members.map((name, idx) => ({
          team_id: team.id,
          name,
          sort_order: idx + 1,
        })),
      );
      if (workerError) {
        return {
          seeded: false,
          error: workerError.message,
          teams: [] as SubTeam[],
        };
      }
    }
  }

  const synced = await syncLeadContacts(supabase);
  return {
    seeded: true,
    error: synced.error,
    teams: synced.teams,
  };
}

export async function fetchAssigneeSuggestions(supabase: SupabaseClient) {
  const { teams } = await fetchSubTeams(supabase);
  if (teams.length === 0) return defaultAssigneeSuggestions();
  return suggestionsFromTeams(
    teams.map((t) => ({
      name: t.name,
      members: t.workers.map((w) => ({ name: w.name })),
    })),
  );
}
