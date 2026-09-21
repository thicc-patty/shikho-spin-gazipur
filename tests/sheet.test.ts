import test from "node:test";
import assert from "node:assert/strict";
import { mirrorToSheet } from "../src/lib/server/sheet";
import type { EntryRow } from "../src/lib/server/entries";

const row = {
  id: "e1", phone: "8801712345678", name: "Test Student", study_group: "science", class_level: "c9",
  spins: 1, event_id: "gazipur", event_info: { id: "gazipur", city: "গাজীপুর", name: "শিখো স্পিন", date: "2026-09-26" },
  prize_id: "discount-30", prize_code: "TEST-1", won_at: new Date(), expires_at: null, redeemed_at: null,
} as EntryRow;

// The whole point of the body check: Apps Script answers a POST with a sign-in
// page and status 200 when the web app is not shared with "Anyone", so a 200
// on its own must never be read as "the row landed".
test("a 200 that is not the script's own ok:true counts as a failed mirror", async () => {
  const savedUrl = process.env.SHEET_WEBHOOK_URL, savedFetch = globalThis.fetch, savedError = console.error;
  process.env.SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/test/exec";
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => { logged.push(args); };
  try {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response("<html>Sign in to continue</html>", { status: 200 }); };
    await mirrorToSheet(row);
    assert.equal(calls, 2, "a rejected write is retried once");
    assert.ok(logged.some(a => String(a[0]).includes("rejected")), "the rejection is logged, not swallowed");

    calls = 0; logged.length = 0;
    globalThis.fetch = async () => { calls++; return new Response('{"ok":true}', { status: 200 }); };
    await mirrorToSheet(row);
    assert.equal(calls, 1, "a written row does not retry");
    assert.equal(logged.length, 0, "a written row logs nothing");
  } finally {
    globalThis.fetch = savedFetch; console.error = savedError;
    if (savedUrl) process.env.SHEET_WEBHOOK_URL = savedUrl; else delete process.env.SHEET_WEBHOOK_URL;
  }
});
