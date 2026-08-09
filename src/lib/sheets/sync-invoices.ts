import type { SupabaseClient } from "@supabase/supabase-js";
import { getSheetValues } from "@/lib/sheets/google-client";
import {
  getInvoiceSpreadsheetId,
  hasInvoiceEnv,
  normalizeAddressKey,
  parseDrawSheet,
  parseInvoiceTemplate,
  type ParsedInvoiceRow,
} from "@/lib/sheets/invoice-parse";

export type SyncInvoicesResult = {
  ok: true;
  parsed: number;
  matched: number;
  created: number;
  updated: number;
  drawParsed?: number;
  templateParsed?: number;
  skipped?: boolean;
  message?: string;
};

function invoiceFields(row: ParsedInvoiceRow) {
  return {
    plan_name: row.plan_name,
    plan_sqft: row.plan_sqft,
    client: row.builder,
    work_kind: row.work_kind === "unknown" ? null : row.work_kind,
    quoted_amount: row.gross,
    invoice_gross: row.gross,
    invoice_payout: row.payout,
    invoice_profit: row.profit,
    invoice_row_key: row.invoice_row_key,
    invoice_week: row.invoice_week,
  };
}

function addressKindKey(row: Pick<ParsedInvoiceRow, "address_key" | "work_kind">) {
  return `${row.address_key}::${row.work_kind}`;
}

export async function syncInvoices(supabase: SupabaseClient): Promise<SyncInvoicesResult> {
  if (!hasInvoiceEnv()) {
    return {
      ok: true,
      parsed: 0,
      matched: 0,
      created: 0,
      updated: 0,
      skipped: true,
      message: "GOOGLE_INVOICE_SPREADSHEET_ID not set — skipped",
    };
  }

  const spreadsheetId = getInvoiceSpreadsheetId();

  // DRAW is the pay source of truth; InvoiceTemplate fills older weeks not on DRAW.
  const [drawValues, templateValues] = await Promise.all([
    getSheetValues(spreadsheetId, "DRAW", "A1:E500"),
    getSheetValues(spreadsheetId, "InvoiceTemplate", "A11:I200"),
  ]);

  const drawRows = parseDrawSheet(drawValues, { startSheetRow: 1 });
  const drawCovered = new Set(drawRows.map(addressKindKey));
  const templateRows = parseInvoiceTemplate(templateValues, { startSheetRow: 11 }).filter(
    (row) => !drawCovered.has(addressKindKey(row)),
  );
  const rows = [...drawRows, ...templateRows];

  let matched = 0;
  let created = 0;
  let updated = 0;

  const { data: existingJobs, error: listError } = await supabase
    .from("jobs")
    .select(
      "id, site_address, title, work_date, sheets_week, invoice_row_key, invoice_gross, status, source, work_kind",
    )
    .neq("status", "cancelled");

  if (listError) throw new Error(listError.message);

  const byInvoiceKey = new Map(
    (existingJobs ?? [])
      .filter((j) => j.invoice_row_key)
      .map((j) => [j.invoice_row_key as string, j]),
  );

  const byAddress = new Map<string, NonNullable<typeof existingJobs>>();
  for (const job of existingJobs ?? []) {
    const key = normalizeAddressKey(job.site_address || job.title || "");
    if (!key) continue;
    const list = byAddress.get(key) ?? [];
    list.push(job);
    byAddress.set(key, list);
  }

  for (const row of rows) {
    const fields = invoiceFields(row);

    const linked = byInvoiceKey.get(row.invoice_row_key);
    if (linked) {
      const { error } = await supabase.from("jobs").update(fields).eq("id", linked.id);
      if (error) throw new Error(error.message);
      updated += 1;
      matched += 1;
      continue;
    }

    const candidates = byAddress.get(row.address_key) ?? [];
    const openCandidates = candidates.filter((j) => !j.invoice_row_key);

    // Prefer same work kind (rough/trim/service) when several jobs share an address
    const kindMatches = openCandidates.filter(
      (j) => !j.work_kind || j.work_kind === row.work_kind,
    );
    const pool = kindMatches.length ? kindMatches : openCandidates;

    let match =
      pool.find((j) => {
        if (!row.work_date || !j.work_date) return false;
        return j.work_date === row.work_date;
      }) ??
      pool.find((j) => {
        const week = (j.sheets_week || "").replace(/\s+/g, "");
        const inv = row.invoice_week.replace(/\s+/g, "");
        return week && inv && (week.includes(inv) || inv.includes(week));
      }) ??
      null;

    if (!match && pool.length === 1) {
      match = pool[0];
    } else if (!match && pool.length > 1 && row.work_date) {
      match =
        pool.find((j) => j.work_date && j.work_date === row.work_date) ??
        pool.find((j) => j.work_kind === row.work_kind) ??
        pool[0];
    }

    if (match) {
      const { error } = await supabase.from("jobs").update(fields).eq("id", match.id);
      if (error) throw new Error(error.message);
      match.invoice_row_key = row.invoice_row_key;
      byInvoiceKey.set(row.invoice_row_key, match);
      updated += 1;
      matched += 1;
      continue;
    }

    const insert = {
      title: row.address,
      site_address: row.address,
      job_type: "outgoing" as const,
      status: "complete" as const,
      work_date: row.work_date,
      start_date: row.work_date,
      source: "invoice" as const,
      ...fields,
    };

    const { data: createdJob, error } = await supabase
      .from("jobs")
      .insert(insert)
      .select("id, site_address, title, invoice_row_key, work_kind")
      .single();

    if (error) throw new Error(error.message);
    created += 1;
    if (createdJob) {
      byInvoiceKey.set(row.invoice_row_key, {
        ...createdJob,
        work_date: row.work_date,
        sheets_week: null,
        invoice_gross: row.gross,
        status: "complete",
        source: "invoice",
      } as (typeof existingJobs)[number]);
      const key = row.address_key;
      const list = byAddress.get(key) ?? [];
      list.push(byInvoiceKey.get(row.invoice_row_key)!);
      byAddress.set(key, list);
    }
  }

  return {
    ok: true,
    parsed: rows.length,
    drawParsed: drawRows.length,
    templateParsed: templateRows.length,
    matched,
    created,
    updated,
  };
}
