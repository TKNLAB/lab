/**
 * Nayak Lab inventory — backend (Google Apps Script, bound to a Google Sheet).
 *
 * The website's inventory page (inventory.html) reads and writes through this script.
 * The edit password is checked HERE, on Google's server, and is never sent to visitors.
 *
 * One-time setup (see tools/INVENTORY_SETUP.md):
 *   1. Create a Google Sheet → Extensions → Apps Script → paste this whole file.
 *   2. Type the password into SETUP_PASSWORD below, choose `setup` in the toolbar, press Run, allow access.
 *      (Then you may clear SETUP_PASSWORD again — the password is now stored in Script Properties.)
 *   3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone → copy the /exec URL
 *      into API_URL at the top of inventory.html.
 */

const SETUP_PASSWORD = '';          // type the edit password here before running setup(); never commit it
const LOCK_VIEW = false;            // true = the password is needed even to VIEW the inventory

const FIELDS = ['id', 'category', 'item', 'make', 'catalog', 'qty', 'unit', 'pack', 'minQty', 'location', 'position',
  'group', 'lot', 'expiry', 'hazard', 'remarks', 'host', 'abType', 'clonality', 'conjugate', 'exem', 'received',
  'check', 'updated', 'updatedBy'];
const HEADERS = ['ID', 'Category', 'Item', 'Make', 'Catalogue no.', 'Qty', 'Unit', 'Pack size', 'Reorder at', 'Location',
  'Shelf / box', 'Type', 'Lot no.', 'Expiry', 'Hazard', 'Remarks', 'Host', 'Ab type', 'Clonality', 'Conjugate',
  'Ex/Em (nm)', 'Received', 'Needs check', 'Last updated', 'Updated by'];
const NUMERIC = { qty: 1, minQty: 1 };
const CATS = { 'Reagents': 'R', 'Antibodies': 'A', 'Glass-Plasticware': 'G' };
const SHEET = 'Inventory', LOG = 'Log', BIN = 'Deleted';

/* ------------------------------------------------------------------ setup */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const make = (name, headers) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1d49a');
    return sh;
  };
  const inv = make(SHEET, HEADERS);
  inv.getRange('A:Z').setNumberFormat('@');                       // keep everything as typed (no auto dates)
  [FIELDS.indexOf('qty'), FIELDS.indexOf('minQty')].forEach(i => inv.getRange(1, i + 1, inv.getMaxRows(), 1).setNumberFormat('0.##'));
  make(LOG, ['Time', 'By', 'Action', 'ID', 'Item', 'Details']);
  make(BIN, HEADERS.concat(['Deleted at', 'Deleted by']));
  const props = PropertiesService.getScriptProperties();
  if (SETUP_PASSWORD) props.setProperty('PASSWORD', String(SETUP_PASSWORD));
  if (!props.getProperty('PASSWORD')) throw new Error('No password set. Type it into SETUP_PASSWORD and run setup again.');
  bump_();
  return 'Setup done. Password is stored. Now Deploy → New deployment → Web app.';
}

/* ------------------------------------------------------------------ http */
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    const action = p.action || 'list';
    if (action === 'version') return out_({ ok: true, version: version_() });
    if (action === 'list') {
      if (LOCK_VIEW) return out_({ ok: false, error: 'locked', needKey: true });   // page then asks for the password and POSTs
      return out_({ ok: true, version: version_(), items: readAll_(), log: readLog_(60), lockView: LOCK_VIEW });
    }
    return out_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return out_({ ok: false, error: 'Bad request' }); }
  if (!keyOk_(body.key)) { Utilities.sleep(1500); return out_({ ok: false, error: 'Wrong password', badKey: true }); }
  const by = clean_(body.by).slice(0, 40) || 'Someone';
  if (body.action === 'verify') return out_({ ok: true, version: version_() });
  if (body.action === 'list') return out_({ ok: true, version: version_(), items: readAll_(), log: readLog_(60), lockView: LOCK_VIEW });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return out_({ ok: false, error: 'Busy — please try again' });
  try {
    const res = write_(body, by);
    if (res.ok) res.version = bump_();
    return out_(res);
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ writes */
function write_(b, by) {
  const sh = sheet_(SHEET), now = new Date().toISOString();
  switch (b.action) {
    case 'add': {
      const it = normalize_(b.item || {});
      if (!it.item) return { ok: false, error: 'Item name is required' };
      it.id = newId_(it.category);
      it.updated = now; it.updatedBy = by;
      sh.appendRow(toRow_(it));
      log_(by, 'Added', it, summary_(it));
      return { ok: true, item: it };
    }
    case 'update': {
      const r = findRow_(sh, b.item && b.item.id);
      if (!r) return { ok: false, error: 'This item no longer exists (maybe someone deleted it).', gone: true };
      const cur = fromRow_(r.values);
      if (b.base && cur.updated && b.base !== cur.updated && !b.force)
        return { ok: false, conflict: true, item: cur, error: (cur.updatedBy || 'Someone') + ' changed this item a moment ago.' };
      const it = normalize_(Object.assign({}, cur, b.item));
      it.id = cur.id; it.updated = now; it.updatedBy = by;
      sh.getRange(r.row, 1, 1, FIELDS.length).setValues([toRow_(it)]);
      const diff = diff_(cur, it);
      log_(by, 'Edited', it, diff || 'no change');
      return { ok: true, item: it };
    }
    case 'adjust': {                                   // +1 / −1 buttons: applied on top of the latest value
      const r = findRow_(sh, b.id);
      if (!r) return { ok: false, error: 'This item no longer exists.', gone: true };
      const it = fromRow_(r.values), d = Number(b.delta) || 0;
      const before = it.qty === null ? 0 : it.qty;
      it.qty = Math.max(0, Math.round((before + d) * 100) / 100);
      it.updated = now; it.updatedBy = by;
      sh.getRange(r.row, 1, 1, FIELDS.length).setValues([toRow_(it)]);
      log_(by, d < 0 ? 'Used' : 'Restocked', it, 'Qty ' + before + ' → ' + it.qty);
      return { ok: true, item: it };
    }
    case 'delete': {
      const r = findRow_(sh, b.id);
      if (!r) return { ok: true, item: null };
      const it = fromRow_(r.values);
      sheet_(BIN).appendRow(toRow_(it).concat([now, by]));
      sh.deleteRow(r.row);
      log_(by, 'Deleted', it, summary_(it));
      return { ok: true, item: it };
    }
    case 'restore': {                                  // undo a delete: same id comes back
      const it = normalize_(b.item || {});
      if (!it.id || findRow_(sh, it.id)) return { ok: false, error: 'Cannot restore this item.' };
      it.updated = now; it.updatedBy = by;
      sh.appendRow(toRow_(it));
      log_(by, 'Restored', it, '');
      return { ok: true, item: it };
    }
    case 'bulk': {                                     // first-time import of the starting list
      const list = (b.items || []).map(normalize_).filter(x => x.item);
      if (sh.getLastRow() > 1 && !b.append) return { ok: false, error: 'The sheet already has items. Import is only for an empty sheet.' };
      const seen = {};
      readIds_(sh).forEach(id => seen[id] = 1);
      const rows = list.map(it => {
        if (!it.id || seen[it.id]) it.id = newId_(it.category, seen);
        seen[it.id] = 1; it.updated = now; it.updatedBy = by;
        return toRow_(it);
      });
      if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, FIELDS.length).setValues(rows);
      log_(by, 'Imported', { id: '', item: rows.length + ' items' }, 'Starting inventory');
      return { ok: true, count: rows.length };
    }
  }
  return { ok: false, error: 'Unknown action' };
}

/* ------------------------------------------------------------------ helpers */
function keyOk_(k) {
  const pw = PropertiesService.getScriptProperties().getProperty('PASSWORD');
  return !!pw && typeof k === 'string' && k === pw;
}
function version_() { return PropertiesService.getScriptProperties().getProperty('VERSION') || '0'; }
function bump_() { const v = String(Date.now()); PropertiesService.getScriptProperties().setProperty('VERSION', v); return v; }
function sheet_(n) { const sh = SpreadsheetApp.getActive().getSheetByName(n); if (!sh) throw new Error('Run setup() first (sheet "' + n + '" missing).'); return sh; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function clean_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, 'Asia/Kolkata', 'yyyy-MM-dd');
  return String(v).replace(/\s+/g, ' ').trim();
}
function num_(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v); return isFinite(n) ? n : null;
}
function normalize_(src) {
  const it = {};
  FIELDS.forEach(f => {
    if (NUMERIC[f]) it[f] = num_(src[f]);
    else if (f === 'check') it[f] = src[f] === true || src[f] === 'TRUE' || src[f] === 'true' || src[f] === 'Yes';
    else it[f] = clean_(src[f]).slice(0, 500);
  });
  if (!CATS[it.category]) it.category = 'Reagents';
  if (it.expiry && !/^\d{4}-\d{2}-\d{2}$/.test(it.expiry)) {
    const d = new Date(it.expiry); it.expiry = isNaN(d) ? it.expiry : Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
  }
  return it;
}
function toRow_(it) {
  return FIELDS.map(f => {
    let v = it[f];
    if (NUMERIC[f]) return v === null || v === undefined ? '' : v;
    if (f === 'check') return v ? 'Yes' : '';
    v = v === null || v === undefined ? '' : String(v);
    return /^[=+\-@]/.test(v) ? "'" + v : v;          // never let typed text become a formula
  });
}
function fromRow_(row) {
  const it = {};
  FIELDS.forEach((f, i) => { it[f] = row[i]; });
  return normalize_(it);
}
function readAll_() {
  const sh = sheet_(SHEET), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, FIELDS.length).getValues().filter(r => r[0] !== '').map(fromRow_);
}
function readIds_(sh) {
  const n = sh.getLastRow() - 1;
  return n < 1 ? [] : sh.getRange(2, 1, n, 1).getValues().map(r => String(r[0]));
}
function findRow_(sh, id) {
  if (!id) return null;
  const ids = readIds_(sh), i = ids.indexOf(String(id));
  if (i < 0) return null;
  return { row: i + 2, values: sh.getRange(i + 2, 1, 1, FIELDS.length).getValues()[0] };
}
function newId_(cat, seen) {
  const pre = CATS[cat] || 'R';
  seen = seen || (() => { const s = {}; readIds_(sheet_(SHEET)).forEach(id => s[id] = 1); return s; })();
  let max = 0;
  Object.keys(seen).forEach(id => { if (id[0] === pre) { const n = parseInt(id.slice(1), 10); if (n > max) max = n; } });
  return pre + String(max + 1).padStart(4, '0');
}
function summary_(it) {
  return [it.qty !== null && it.qty !== undefined ? 'Qty ' + it.qty + (it.unit ? ' ' + it.unit : '') : '', it.location].filter(Boolean).join(' · ');
}
function diff_(a, b) {
  const label = {}; FIELDS.forEach((f, i) => label[f] = HEADERS[i]);
  return FIELDS.filter(f => f !== 'updated' && f !== 'updatedBy' && String(a[f] === null ? '' : a[f]) !== String(b[f] === null ? '' : b[f]))
    .map(f => label[f] + ': ' + (a[f] === '' || a[f] === null ? '—' : a[f]) + ' → ' + (b[f] === '' || b[f] === null ? '—' : b[f]))
    .join('; ').slice(0, 900);
}
function log_(by, action, it, details) {
  sheet_(LOG).appendRow([new Date().toISOString(), by, action, it.id || '', it.item || '', details || '']);
}
function readLog_(n) {
  const sh = sheet_(LOG), last = sh.getLastRow();
  if (last < 2) return [];
  const start = Math.max(2, last - n + 1);
  return sh.getRange(start, 1, last - start + 1, 6).getValues().reverse()
    .map(r => ({ time: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), by: r[1], action: r[2], id: r[3], item: r[4], details: r[5] }));
}
