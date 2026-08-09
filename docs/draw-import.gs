/**
 * draw-import.gs — Pull parent-company Draw → local "DRAW" tab
 * ============================================================
 * Lives in YOUR Lantana Invoices spreadsheet only.
 * Does NOT require editing the parent Draw or adding new viewers
 * (you must already be able to open the Draw in your browser).
 *
 * ALWAYS filters to Lantana Electric jobs only (never copies other
 * subcontractors). Matches the same crew names as the job board:
 *   Lantana, Leo, Jesus, Gilbert
 *
 * SETUP
 * -----
 * 1. Extensions → Apps Script → paste this file (e.g. draw-import.gs).
 * 2. Project Settings → Script properties:
 *      DRAW_SOURCE_ID   = <spreadsheet id from the Draw URL>
 *      DRAW_SOURCE_TAB  = <exact tab name on the Draw>   (optional if only one sheet)
 *      DRAW_CREW_COL    = <header name, e.g. Sub or Crew>  (optional — auto-detects)
 *      LOCAL_SS_ID      = 1TvXUr9-G82P6b1ZPsuJWOYa2tNFwoXN8DAUhkMKklVU
 *                         (needed for Friday/auto triggers; optional for manual pull)
 * 3. Run installDrawMenu once (or reload the sheet — onOpen adds the menu).
 * 4. First pull: Lantana Sync → "Pull Draw into DRAW tab"
 *    Approve access when Google asks (once).
 *
 * AUTO (Fridays)
 * --------------
 * Draw is usually updated once or twice on Fridays. From the sheet menu:
 *   Lantana Sync → Install Friday Draw pulls
 * That schedules pulls around 10am, 2pm, and 6pm (script timezone) every Friday.
 * Or in the editor: select installFridayDrawTriggers → Run (authorize once).
 */

var DRAW_LOCAL_TAB = "DRAW";
var DRAW_TRIGGER_HANDLERS = ["pullDrawIntoLocalTabSilent"];

/** Same Lantana crew tokens as src/lib/sheets/worker-map.ts */
var LANTANA_CREW_TOKENS = ["lantana", "leo", "jesus", "gilbert"];

/** Header names that usually hold the subcontractor / crew */
var CREW_HEADER_HINTS = [
  "sub",
  "subcontractor",
  "crew",
  "worker",
  "assigned",
  "company",
  "invoice",
  "invoice tab",
  "contractor",
  "vendor",
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Lantana Sync")
    .addItem("Pull Draw into DRAW tab (Lantana only)", "pullDrawIntoLocalTab")
    .addItem("Install Friday Draw pulls", "installFridayDrawTriggers")
    .addItem("Remove auto Draw pulls", "removeDrawTriggers")
    .addToUi();
}

function installDrawMenu() {
  onOpen();
  SpreadsheetApp.getUi().alert(
    "Menu added: Lantana Sync → Pull Draw into DRAW tab (Lantana only)",
  );
}

/**
 * Main: copy Lantana-only rows from parent Draw → local DRAW tab.
 */
function pullDrawIntoLocalTab() {
  var result = pullDrawCore_(true);
  if (!result) return;

  SpreadsheetApp.getUi().alert(
    "DRAW updated — Lantana jobs only.\n\n" +
      "Source: " +
      result.sourceName +
      "\nCrew column: " +
      (result.crewColLabel || "(row scan)") +
      "\nLantana rows written: " +
      result.kept +
      " (of " +
      result.total +
      " source data rows)",
  );
}

/**
 * Recommended: pull 3× on Fridays (when Draw usually updates).
 * Hours are in the Apps Script project's timezone
 * (File → Project settings → Time zone — use America/Chicago).
 */
function installFridayDrawTriggers() {
  removeDrawTriggers_(false);

  var hours = [10, 14, 18]; // ~10am, 2pm, 6pm
  for (var i = 0; i < hours.length; i++) {
    ScriptApp.newTrigger("pullDrawIntoLocalTabSilent")
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay.FRIDAY)
      .atHour(hours[i])
      .create();
  }

  SpreadsheetApp.getUi().alert(
    "Friday Draw pulls installed.\n\n" +
      "Every Friday around 10am, 2pm, and 6pm (project timezone),\n" +
      "Lantana-only rows will copy into the DRAW tab.\n\n" +
      "Confirm timezone: Apps Script → Project Settings → Time zone\n" +
      "(use America/Chicago if you're in Texas).",
  );
}

/** Optional: every hour (usually overkill for Friday-only Draw updates). */
function installDrawHourlyTrigger() {
  removeDrawTriggers_(false);
  ScriptApp.newTrigger("pullDrawIntoLocalTabSilent").timeBased().everyHours(1).create();
  SpreadsheetApp.getUi().alert("Hourly Draw pull installed (Lantana-only filter).");
}

function removeDrawTriggers() {
  removeDrawTriggers_(true);
}

function removeDrawTriggers_(showAlert) {
  var handlers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < handlers.length; i++) {
    var name = handlers[i].getHandlerFunction();
    if (DRAW_TRIGGER_HANDLERS.indexOf(name) !== -1) {
      ScriptApp.deleteTrigger(handlers[i]);
      removed++;
    }
  }
  if (showAlert) {
    SpreadsheetApp.getUi().alert("Removed " + removed + " auto Draw pull trigger(s).");
  }
}

/** Trigger-safe version (no UI alerts). */
function pullDrawIntoLocalTabSilent() {
  try {
    pullDrawCore_(false);
  } catch (err) {
    console.error("pullDrawIntoLocalTabSilent", err);
  }
}

/**
 * @param {boolean} useUi
 * @return {{sourceName:string, crewColLabel:string, kept:number, total:number}|null}
 */
function pullDrawCore_(useUi) {
  var props = PropertiesService.getScriptProperties();
  var sourceId = normalizeSpreadsheetId_(props.getProperty("DRAW_SOURCE_ID"));
  var sourceTab = props.getProperty("DRAW_SOURCE_TAB");
  var crewColProp = (props.getProperty("DRAW_CREW_COL") || "").trim();
  var localId = normalizeSpreadsheetId_(
    props.getProperty("LOCAL_SS_ID") ||
      "1TvXUr9-G82P6b1ZPsuJWOYa2tNFwoXN8DAUhkMKklVU",
  );

  if (!sourceId) {
    if (useUi) {
      SpreadsheetApp.getUi().alert(
        "Set Script property DRAW_SOURCE_ID to the parent Draw spreadsheet id.\n\n" +
          "From the Draw URL:\n" +
          "https://docs.google.com/spreadsheets/d/THIS_PART/edit\n\n" +
          "Paste only THIS_PART — no /edit and no trailing slash.",
      );
    }
    return null;
  }

  var sourceSs;
  try {
    sourceSs = SpreadsheetApp.openById(sourceId);
  } catch (err) {
    if (useUi) {
      SpreadsheetApp.getUi().alert(
        "Could not open the Draw spreadsheet.\n\n" +
          "Make sure you can open it in Chrome while logged into this Google account.\n\n" +
          "Using id: " +
          sourceId +
          "\n\n" +
          String(err),
      );
    }
    return null;
  }

  var sourceSheet = sourceTab
    ? sourceSs.getSheetByName(sourceTab)
    : sourceSs.getSheets()[0];

  if (!sourceSheet) {
    if (useUi) {
      SpreadsheetApp.getUi().alert(
        'Source tab not found: "' + sourceTab + '"\n\nCheck DRAW_SOURCE_TAB.',
      );
    }
    return null;
  }

  var localSs = useUi
    ? SpreadsheetApp.getActive()
    : SpreadsheetApp.openById(localId);
  var local = localSs.getSheetByName(DRAW_LOCAL_TAB);
  if (!local) local = localSs.insertSheet(DRAW_LOCAL_TAB);

  var displays = sourceSheet.getDataRange().getDisplayValues();
  if (!displays.length) {
    local.clearContents();
    return { sourceName: sourceSheet.getName(), crewColLabel: "", kept: 0, total: 0 };
  }

  var header = displays[0] || [];
  var crewCol = findCrewColumnIndex_(header, crewColProp);
  var filtered = filterLantanaRows_(displays, crewCol);
  var out = filtered.rows;
  var totalData = Math.max(0, displays.length - 1);
  var keptData = Math.max(0, out.length - 1);

  local.clearContents();
  if (out.length && out[0].length) {
    local.getRange(1, 1, out.length, out[0].length).setValues(out);
  }
  local.getRange("Z1").setValue("Last pulled (Lantana only)");
  local.getRange("Z2").setValue(new Date());

  return {
    sourceName: sourceSheet.getName(),
    crewColLabel:
      crewCol >= 0
        ? String(header[crewCol] || "") + " (col " + (crewCol + 1) + ")"
        : "",
    kept: keptData,
    total: totalData,
  };
}

/**
 * Keep header + only rows that belong to Lantana Electric.
 * Prefers a dedicated crew/sub column when found; otherwise scans the row
 * for whole-cell Lantana crew tokens (avoids matching random address text).
 */
function filterLantanaRows_(rows, crewCol) {
  if (!rows.length) return { rows: [] };
  var header = rows[0];
  var kept = [header];

  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (isBlankRow_(row)) continue;
    if (isLantanaRow_(row, crewCol)) kept.push(row);
  }
  return { rows: kept };
}

function isLantanaRow_(row, crewCol) {
  if (crewCol >= 0 && crewCol < row.length) {
    return cellMatchesLantanaCrew_(row[crewCol]);
  }
  // No crew column: only match whole cells (not joined row text).
  for (var c = 0; c < row.length; c++) {
    if (cellMatchesLantanaCrew_(row[c])) return true;
  }
  return false;
}

function cellMatchesLantanaCrew_(raw) {
  var key = normalizeCrew_(raw);
  if (!key) return false;

  // Exact or contained token (e.g. "Leo - Trim", "Lantana Electric")
  for (var i = 0; i < LANTANA_CREW_TOKENS.length; i++) {
    var tok = LANTANA_CREW_TOKENS[i];
    if (key === tok) return true;
    // Word-boundary-ish: token as whole word inside the cell
    if (new RegExp("(^|[^a-z0-9])" + tok + "([^a-z0-9]|$)", "i").test(key)) {
      return true;
    }
  }
  return false;
}

function normalizeCrew_(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBlankRow_(row) {
  for (var i = 0; i < row.length; i++) {
    if (String(row[i] || "").trim() !== "") return false;
  }
  return true;
}

/**
 * Find 0-based crew column from header row.
 * Uses DRAW_CREW_COL property if set; otherwise auto-detects from hints.
 * @return {number} index or -1
 */
/**
 * Accepts a raw id, a full Sheets URL, or an id with trailing "/".
 * Returns a clean spreadsheet id or "".
 */
function normalizeSpreadsheetId_(raw) {
  var s = String(raw || "").trim();
  if (!s) return "";

  // Full URL → extract /d/<id>/
  var m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];

  // Bare id (or id with accidental trailing slash / query)
  s = s.replace(/\/+$/, "");
  s = s.split("?")[0].split("#")[0];
  if (/^[a-zA-Z0-9-_]+$/.test(s)) return s;
  return s.replace(/[^a-zA-Z0-9-_]/g, "");
}

function findCrewColumnIndex_(header, preferredName) {
  if (preferredName) {
    var want = preferredName.toLowerCase().trim();
    for (var i = 0; i < header.length; i++) {
      if (String(header[i] || "").toLowerCase().trim() === want) return i;
    }
    // Partial header match if exact fails
    for (var j = 0; j < header.length; j++) {
      var h = String(header[j] || "").toLowerCase().trim();
      if (h.indexOf(want) !== -1 || want.indexOf(h) !== -1) return j;
    }
  }

  for (var c = 0; c < header.length; c++) {
    var name = String(header[c] || "").toLowerCase().trim();
    if (!name) continue;
    for (var h = 0; h < CREW_HEADER_HINTS.length; h++) {
      if (name === CREW_HEADER_HINTS[h] || name.indexOf(CREW_HEADER_HINTS[h]) !== -1) {
        return c;
      }
    }
  }
  return -1;
}
