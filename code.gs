/**
 * Stores the replies to the Halloween invitation in a Google Sheet
 * and checks every reply against your guest list.
 * Setup steps: see INSTRUCTIONS.md
 */

// ---- EDIT THESE ------------------------------------------------------------
const PASS_PHRASE = 'ChangeMe2026';       // pass phrase for the host view
const REQUIRE_INVITATION = true;          // false = anyone with the link may reply
const SHEET_NAME = 'Replies';             // tab that collects the replies
const GUEST_SHEET = 'Guests';             // tab that holds your guest list
// ---------------------------------------------------------------------------

const COLUMNS = ['id', 'timestamp', 'name', 'reply', 'allergies', 'notes', 'message'];
const GUEST_COLUMNS = ['name', 'code'];

/* ---------- sheets ---------- */

function sheet() {
  const file = SpreadsheetApp.getActiveSpreadsheet();
  let b = file.getSheetByName(SHEET_NAME);
  if (!b) {
    b = file.insertSheet(SHEET_NAME);
    b.appendRow(COLUMNS);
    b.setFrozenRows(1);
  }
  if (b.getLastRow() === 0) b.appendRow(COLUMNS);
  return b;
}

function guestSheet() {
  const file = SpreadsheetApp.getActiveSpreadsheet();
  let b = file.getSheetByName(GUEST_SHEET);
  if (!b) {
    b = file.insertSheet(GUEST_SHEET);
    b.appendRow(GUEST_COLUMNS);
    b.setFrozenRows(1);
  }
  if (b.getLastRow() === 0) b.appendRow(GUEST_COLUMNS);
  return b;
}

/* ---------- guest list ---------- */

// "Anna-Lena  Müßig " and "anna-lena mussig" count as the same person
function normalise(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00df/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function guestList() {
  const b = guestSheet();
  if (b.getLastRow() < 2) return [];
  return b.getRange(2, 1, b.getLastRow() - 1, GUEST_COLUMNS.length).getValues()
    .filter(r => String(r[0]).trim())
    .map(r => ({ name: String(r[0]).trim(), code: String(r[1] || '').trim() }));
}

function findGuest(name) {
  const wanted = normalise(name);
  if (!wanted) return null;
  const list = guestList();
  for (let i = 0; i < list.length; i++) {
    if (normalise(list[i].name) === wanted) return list[i];
  }
  return null;
}

/* ---------- replies ---------- */

function rows() {
  const b = sheet();
  if (b.getLastRow() < 2) return [];
  return b.getRange(2, 1, b.getLastRow() - 1, COLUMNS.length).getValues()
    .filter(r => r[0])
    .map(r => ({
      id: String(r[0]),
      time: r[1],
      name: String(r[2]),
      status: String(r[3]) === 'Attending' ? 'yes' : 'no',
      diets: String(r[4] || '').split(',').map(s => s.trim()).filter(Boolean),
      diet: String(r[5] || ''),
      note: String(r[6] || '')
    }));
}

function attendingCount() {
  return rows().filter(e => e.status === 'yes').length;
}

// invited people who have not answered yet
function stillPending() {
  const answered = rows().map(e => normalise(e.name));
  return guestList()
    .filter(g => answered.indexOf(normalise(g.name)) === -1)
    .map(g => g.name);
}

/* ---------- web app ---------- */

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'count';

  if (action === 'count') {
    return reply({ ok: true, count: attendingCount(), invited: guestList().length });
  }

  if (action === 'list') {
    if (!e.parameter.key || e.parameter.key !== PASS_PHRASE) {
      return reply({ ok: false, error: 'That pass phrase is not right.' });
    }
    return reply({ ok: true, entries: rows(), pending: stillPending() });
  }

  return reply({ ok: false, error: 'Unknown request.' });
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'The request could not be read.' });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {
    return reply({ ok: false, error: 'Too busy right now, please try again.' });
  }

  try {
    if (data.action === 'delete') {
      if (data.key !== PASS_PHRASE) return reply({ ok: false, error: 'That pass phrase is not right.' });
      removeRow(String(data.id || ''));
      return reply({ ok: true, count: attendingCount() });
    }

    let name = String(data.name || '').trim();
    if (!name) return reply({ ok: false, error: 'A name is required.' });
    if (data.status !== 'yes' && data.status !== 'no') return reply({ ok: false, error: 'Yes or no is missing.' });

    let id = String(data.id || ('g' + Date.now()));

    if (REQUIRE_INVITATION) {
      const guest = findGuest(name);
      if (!guest) {
        return reply({ ok: false, error: 'We cannot find that name on the guest list. Please write it exactly as it appears on your invitation.' });
      }
      if (guest.code && normalise(guest.code) !== normalise(data.code)) {
        return reply({ ok: false, error: 'That invitation code does not match.' });
      }
      name = guest.name;                       // spelling from the guest list wins
      id = 'guest-' + normalise(guest.name);   // one row per invited person
    }

    write({
      id: id,
      name: name.slice(0, 120),
      status: data.status,
      diets: Array.isArray(data.diets) ? data.diets.join(', ').slice(0, 400) : '',
      diet: String(data.diet || '').slice(0, 1000),
      note: String(data.note || '').slice(0, 500)
    });

    return reply({ ok: true, count: attendingCount(), name: name, id: id });
  } finally {
    lock.releaseLock();
  }
}

function write(entry) {
  const b = sheet();
  const row = [
    entry.id,
    new Date(),
    entry.name,
    entry.status === 'yes' ? 'Attending' : 'Declined',
    entry.diets,
    entry.diet,
    entry.note
  ];
  const number = findRow(entry.id);
  if (number > 0) {
    b.getRange(number, 1, 1, COLUMNS.length).setValues([row]);   // guest changed their reply
  } else {
    b.appendRow(row);
  }
}

function removeRow(id) {
  const number = findRow(id);
  if (number > 0) sheet().deleteRow(number);
}

function findRow(id) {
  const b = sheet();
  if (b.getLastRow() < 2) return -1;
  const ids = b.getRange(2, 1, b.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}
