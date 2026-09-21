/**
 * Google Apps Script backing SHEET_WEBHOOK_URL: a live backup copy of every
 * entry, written as the student plays.
 *
 * Setup, once:
 *  1. Create a Google Sheet. Extensions > Apps Script. Paste this file.
 *  2. Deploy > New deployment > Web app.
 *       Execute as: Me.   Who has access: Anyone.
 *     "Anyone" is required for a server-to-server POST. The deployment URL is
 *     the only credential, so treat it like a password and never commit it.
 *  3. Copy the /exec URL into the Vercel env var SHEET_WEBHOOK_URL, then
 *     redeploy. Leaving it unset simply disables the mirror.
 *
 * A row is written on registration and rewritten after each spin, so the sheet
 * always shows the prize the student finally kept. Postgres stays the source
 * of truth; this is a convenience copy for the stall and telesales teams.
 */
var HEADERS = ['সময়', 'নাম', 'মোবাইল', 'ক্লাস', 'বিভাগ', 'পুরস্কার', 'রিওয়ার্ড কোড', 'ইভেন্ট', 'স্পিন'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    var row = [
      data.wonAt || new Date(),
      data.name, "'" + data.phone, data.class, data.group,
      data.award, data.code, data.event, data.spins
    ];
    // One row per phone: a re-spin updates in place rather than appending.
    var phones = sheet.getRange(1, 3, Math.max(sheet.getLastRow(), 1), 1).getValues();
    for (var i = 1; i < phones.length; i++) {
      if (String(phones[i][0]).replace(/^'/, '') === String(data.phone)) {
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        return ok();
      }
    }
    sheet.appendRow(row);
    return ok();
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function ok() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
