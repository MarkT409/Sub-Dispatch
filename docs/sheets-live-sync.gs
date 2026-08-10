/**
 * sync.gs — Lantana admin live sync (standalone file)
 * =====================================================
 *
 * WHY A SEPARATE INSTALLABLE TRIGGER?
 * Simple onEdit (color coding) CANNOT call UrlFetchApp / external websites.
 * This file installs a privileged onEdit that can ping your dashboard API.
 *
 * ONE-TIME SETUP (required)
 * -------------------------
 * 1. Project Settings (gear) → Script properties:
 *      SHEETS_SYNC_URL    = https://lantanaelectric.com/api/admin/sheets/sync
 *                           (must be public HTTPS — localhost will NOT work)
 *      SHEETS_SYNC_SECRET = same value as SHEETS_SYNC_SECRET in Netlify
 *
 * 2. Select function: installLantanaSyncTrigger → Run
 *    Approve all Google permission prompts (once).
 *
 * 3. Optional: Run testLantanaAdminSync to verify the webhook.
 *
 * AFTER THAT
 * ----------
 * Assigning/clearing a Lantana job on the board updates the dashboard
 * automatically (debounced ~45s). No prompts on each edit.
 *
 * Do NOT put UrlFetch inside your color-coding onEdit — keep that as-is.
 */

var LANTANA_SYNC_CACHE_KEY = "lantana_sync_last_at";
var LANTANA_SYNC_DEBOUNCE_MS = 45 * 1000;
var LANTANA_SYNC_TRIGGER_HANDLER = "onLantanaBoardEdit";

var LANTANA_WORKER_MAP = {
  jesus: "Lantana",
  lantana: "Lantana",
  leo: "Lantana",
  gilbert: "Lantana",
};

var NON_BOARD_TABS_SYNC = {
  "Transfer Log": true,
  "Instructions & Script": true,
  Legend: true,
  "Legend & Instructions": true,
};

/**
 * ONE-TIME: run this from the Apps Script editor (Run ▶).
 * Creates the installable onEdit trigger with permission to call your website.
 */
function installLantanaSyncTrigger() {
  var ss = SpreadsheetApp.getActive();
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === LANTANA_SYNC_TRIGGER_HANDLER) {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }

  ScriptApp.newTrigger(LANTANA_SYNC_TRIGGER_HANDLER)
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert(
    "Lantana sync trigger installed.\n\n" +
      "Edits that assign or clear a Lantana worker (Leo, Jesus, etc.) " +
      "will update the admin dashboard automatically.\n\n" +
      "Make sure SHEETS_SYNC_URL points at your live site (not localhost).",
  );
}

/** Installable onEdit handler — full permissions, including UrlFetch. */
function onLantanaBoardEdit(e) {
  maybeNotifyLantanaAdmin_(e);
}

function maybeNotifyLantanaAdmin_(e) {
  try {
    if (!e || !e.range || !e.source) return;

    var sheet = e.source.getActiveSheet();
    var sheetName = sheet.getName();
    if (NON_BOARD_TABS_SYNC[sheetName]) return;

    var col = e.range.getColumn();
    var row = e.range.getRow();
    // Day columns B–F
    if (col < 2 || col > 6 || row < 2) return;

    var val = String(e.range.getValue() || "").trim();

    if (val) {
      var worker = extractWorkerForLantanaSync_(val);
      if (!isLantanaWorker_(worker)) return;
    }
    // Cleared cell → sync so dashboard drops the job

    notifyLantanaAdminSync_();
  } catch (err) {
    console.error("maybeNotifyLantanaAdmin_", err);
  }
}

function isLantanaWorker_(workerRaw) {
  if (!workerRaw) return false;
  var key = String(workerRaw)
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (LANTANA_WORKER_MAP[key]) return true;

  var names = Object.keys(LANTANA_WORKER_MAP);
  for (var i = 0; i < names.length; i++) {
    var k = names[i];
    if (key.indexOf(k) !== -1 || k.indexOf(key) !== -1) return true;
  }
  return false;
}

function extractWorkerForLantanaSync_(val) {
  var stripped = val.replace(/\([^)]*\)/g, "");
  var patterns = [" – ", " - ", "– ", "- ", "-"];
  for (var i = 0; i < patterns.length; i++) {
    var idx = stripped.indexOf(patterns[i]);
    if (idx !== -1) {
      return val.substring(idx + patterns[i].length).trim();
    }
  }
  return null;
}

function notifyLantanaAdminSync_() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty("SHEETS_SYNC_URL");
  var secret = props.getProperty("SHEETS_SYNC_SECRET");
  if (!url || !secret) {
    console.warn(
      "Lantana sync: set SHEETS_SYNC_URL and SHEETS_SYNC_SECRET in Script properties",
    );
    return;
  }

  // localhost / 127.0.0.1 cannot be reached from Google's servers
  if (/localhost|127\.0\.0\.1/i.test(url)) {
    console.error(
      "Lantana sync: SHEETS_SYNC_URL must be your deployed HTTPS site, not localhost",
    );
    return;
  }

  var cache = CacheService.getScriptCache();
  var last = Number(cache.get(LANTANA_SYNC_CACHE_KEY) || "0");
  var now = Date.now();
  if (now - last < LANTANA_SYNC_DEBOUNCE_MS) return;
  cache.put(LANTANA_SYNC_CACHE_KEY, String(now), 300);

  var res = UrlFetchApp.fetch(url, {
    method: "post",
    headers: {
      Authorization: "Bearer " + secret,
      "Content-Type": "application/json",
    },
    muteHttpExceptions: true,
    followRedirects: true,
  });

  var code = res.getResponseCode();
  if (code >= 400) {
    console.error("Lantana sync failed", code, res.getContentText());
  } else {
    console.log("Lantana sync ok", code, res.getContentText());
  }
}

/** Run from editor to test the webhook without editing a cell. */
function testLantanaAdminSync() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty("SHEETS_SYNC_URL");
  if (!url) {
    SpreadsheetApp.getUi().alert("Missing SHEETS_SYNC_URL in Script properties.");
    return;
  }
  if (/localhost|127\.0\.0\.1/i.test(url)) {
    SpreadsheetApp.getUi().alert(
      "SHEETS_SYNC_URL is localhost.\n\nGoogle cannot reach your laptop.\n" +
        "Deploy the site to Netlify and use that HTTPS URL instead.",
    );
    return;
  }

  // Bypass debounce for manual test
  CacheService.getScriptCache().remove(LANTANA_SYNC_CACHE_KEY);
  notifyLantanaAdminSync_();
  SpreadsheetApp.getUi().alert(
    "Sync request sent to:\n" + url + "\n\nCheck Executions (left sidebar) for the response log, then refresh /admin.",
  );
}
