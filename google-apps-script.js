/**
 * GTM Milestone Dashboard: shared storage in a Google Sheet.
 *
 * Setup (about 3 minutes):
 * 1. Create a blank Google Sheet (sheets.new).
 * 2. Extensions > Apps Script. Delete what's there, paste this whole file, click Save.
 * 3. Deploy > New deployment > gear icon > Web app.
 *      Execute as: Me
 *      Who has access: Anyone
 *    Click Deploy, approve the access request, and copy the Web app URL (ends in /exec).
 *
 * The script creates two tabs, "Projects" and "Milestones", on first use.
 * You can read them anytime; avoid editing them while people are using the dashboard.
 */

const P = 'Projects', M = 'Milestones';
const PH = ['id', 'name', 'pilot', 'mp', 'created'];
const MH = ['project_id', 'key', 'status', 'owner', 'note', 'lockedDate'];
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/, KEY_RE = /^[A-Za-z]{1,40}$/, DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 500, MAX_PROJECTS = 300;

function doGet(e) {
  const rev = currentRev_();
  const since = e && e.parameter && e.parameter.since;
  if (since !== undefined && since !== '' && Number(since) === rev) return json_({ rev: rev, unchanged: true });
  return json_({ rev: rev, projects: readAll_() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ error: 'busy', retry: true });
  }
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const ops = Array.isArray(body.ops) ? body.ops.slice(0, 100) : [];
    ops.forEach(apply_);
    const rev = currentRev_() + 1;
    PropertiesService.getScriptProperties().setProperty('rev', String(rev));
    return json_({ rev: rev, projects: readAll_() });
  } catch (err) {
    return json_({ error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- operations ---------- */
function apply_(op) {
  if (!op || !ID_RE.test(op.id || '')) throw new Error('bad project id');
  if (op.op === 'createProject') return createProject_(op.id, op.data || {});
  if (op.op === 'updateProject') return updateProject_(op.id, op.fields || {});
  if (op.op === 'deleteProject') return deleteProject_(op.id);
  if (op.op === 'setMilestone') return setMilestone_(op.id, op.key, op.fields || {});
  throw new Error('unknown op');
}

function createProject_(id, d) {
  const sh = sheet_(P, PH);
  const row = findRow_(sh, function (r) { return r[0] === id; });
  const values = [id, text_(d.name) || 'New Project', date_(d.pilot), date_(d.mp), String(Number(d.created) || Date.now())];
  if (row) sh.getRange(row, 1, 1, PH.length).setValues([values]);
  else {
    if (sh.getLastRow() - 1 >= MAX_PROJECTS) throw new Error('too many projects');
    sh.appendRow(values);
  }
  const ms = d.ms || {};
  Object.keys(ms).forEach(function (k) { if (KEY_RE.test(k)) setMilestone_(id, k, ms[k] || {}); });
}

function updateProject_(id, f) {
  const sh = sheet_(P, PH);
  const row = findRow_(sh, function (r) { return r[0] === id; });
  if (!row) return;
  if ('name' in f && text_(f.name)) sh.getRange(row, 2).setValue(text_(f.name));
  if ('pilot' in f) sh.getRange(row, 3).setValue(date_(f.pilot));
  if ('mp' in f) sh.getRange(row, 4).setValue(date_(f.mp));
}

function deleteProject_(id) {
  const ps = sheet_(P, PH), ms = sheet_(M, MH);
  deleteRows_(ps, function (r) { return r[0] === id; });
  deleteRows_(ms, function (r) { return r[0] === id; });
}

function setMilestone_(id, key, f) {
  if (!KEY_RE.test(key || '')) throw new Error('bad milestone key');
  const sh = sheet_(M, MH);
  const row = findRow_(sh, function (r) { return r[0] === id && r[1] === key; });
  const cur = row ? sh.getRange(row, 1, 1, MH.length).getValues()[0].map(cell_) : [id, key, 'ns', '', '', ''];
  if ('status' in f) cur[2] = ['ns', 'ip', 'done'].indexOf(f.status) >= 0 ? f.status : 'ns';
  if ('owner' in f) cur[3] = f.owner;
  if ('note' in f) cur[4] = f.note;
  if ('lockedDate' in f) cur[5] = date_(f.lockedDate);
  cur[3] = text_(cur[3]);
  cur[4] = text_(cur[4]);
  if (row) sh.getRange(row, 1, 1, MH.length).setValues([cur]);
  else sh.appendRow(cur);
}

/* ---------- reading ---------- */
function readAll_() {
  const projects = {};
  rows_(sheet_(P, PH)).forEach(function (r) {
    if (r[0]) projects[r[0]] = { name: r[1], pilot: r[2], mp: r[3], created: Number(r[4]) || 0, ms: {} };
  });
  rows_(sheet_(M, MH)).forEach(function (r) {
    const p = projects[r[0]];
    if (p && r[1]) p.ms[r[1]] = { status: r[2] || 'ns', owner: r[3], note: r[4], lockedDate: r[5] };
  });
  return projects;
}

/* ---------- helpers ---------- */
function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@'); // keep dates as plain text
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function rows_(sh) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, sh.getLastColumn()).getValues().map(function (r) { return r.map(cell_); });
}
function findRow_(sh, match) {
  const rows = rows_(sh);
  for (let i = 0; i < rows.length; i++) if (match(rows[i])) return i + 2;
  return 0;
}
function deleteRows_(sh, match) {
  const rows = rows_(sh);
  for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i])) sh.deleteRow(i + 2);
}
function cell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const s = v === null || v === undefined ? '' : String(v);
  return /^'[=+\-@]/.test(s) ? s.slice(1) : s; // undo the formula guard below
}
function text_(v) {
  let s = String(v === null || v === undefined ? '' : v).slice(0, MAX_TEXT);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // never let a value become a formula
  return s;
}
function date_(v) { return DATE_RE.test(v || '') ? v : ''; }
function currentRev_() { return Number(PropertiesService.getScriptProperties().getProperty('rev')) || 0; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
