/**
 * Stores the replies to the Halloween invitation in a Google Sheet.
 * Setup steps: see INSTRUCTIONS.md
 */

// ---- EDIT THESE TWO LINES --------------------------------------------------
const PASS_PHRASE = 'ChangeMe2026';       // pass phrase for the host view
const SHEET_NAME = 'Replies';             // name of the tab inside the spreadsheet
// ---------------------------------------------------------------------------

const COLUMNS = ['id', 'timestamp', 'name', 'reply', 'allergies', 'notes', 'message'];

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

function rows() {
  const b = sheet();
  if (b.getLastRow() < 2) return [];
  const values = b.getRange(2, 1, b.getLastRow() - 1, COLUMNS.length).getValues();
  return values
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

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'count';
  if (action === 'count') {
    return reply({ ok: true, count: attendingCount() });
  }
  if (action === 'list') {
    if (!e.parameter.key || e.parameter.key !== PASS_PHRASE) {
      return reply({ ok: false, error: 'That pass phrase is not right.' });
    }
    return reply({ ok: true, entries: rows() });
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

    const name = String(data.name || '').trim();
    if (!name) return reply({ ok: false, error: 'A name is required.' });
    if (data.status !== 'yes' && data.status !== 'no') return reply({ ok: false, error: 'Yes or no is missing.' });

    write({
      id: String(data.id || ('g' + Date.now())),
      name: name.slice(0, 120),
      status: data.status,
      diets: Array.isArray(data.diets) ? data.diets.join(', ').slice(0, 400) : '',
      diet: String(data.diet || '').slice(0, 1000),
      note: String(data.note || '').slice(0, 500)
    });

    return reply({ ok: true, count: attendingCount() });
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
