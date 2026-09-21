import "server-only";
import { CLASS_BY_ID, PRIZE_BY_ID, STUDY_GROUPS, type ClassLevelId, type PrizeId, type StudyGroupId } from "../game";
import type { EntryRow } from "./entries";

/**
 * Live mirror of every entry into a Google Sheet, as a backup to Postgres.
 * The Sheet is written through an Apps Script web app, so no Google service
 * account or OAuth token is needed: SHEET_WEBHOOK_URL is the whole secret.
 * Unset means disabled, exactly like CRM_TOKEN.
 *
 * ponytail: fire-and-forget with one retry. The Sheet is a convenience copy,
 * never the source of truth, so a failed write must never fail a student's
 * spin. If the Sheet ever has to be authoritative, move it into crm_outbox
 * so it inherits the durable queue and retry schedule.
 */
export const localPhone = (phone: string) => phone.replace(/^88/, "");
const groupLabel = (id: string) => STUDY_GROUPS.find(g => g.id === (id as StudyGroupId))?.bn || id;

export function sheetRow(row: EntryRow) {
  return {
    name: row.name,
    // Stored canonically as 8801XXXXXXXXX so every input form collides on one
    // identity, but the stall and telesales read it back the way it was typed.
    phone: localPhone(row.phone),
    class: CLASS_BY_ID.get(row.class_level as ClassLevelId)?.bn || row.class_level,
    group: row.study_group === "others" && row.class_level !== "c11" ? "" : groupLabel(row.study_group),
    award: row.prize_id ? PRIZE_BY_ID.get(row.prize_id as PrizeId)?.title || row.prize_id : "",
    code: row.prize_code || "",
    event: row.event_info.city,
    spins: row.spins,
    wonAt: row.won_at ? new Date(row.won_at.getTime() + 6 * 3600_000).toISOString().slice(0, 19).replace("T", " ") : "",
  };
}

export async function mirrorToSheet(row: EntryRow) {
  const url = process.env.SHEET_WEBHOOK_URL;
  if (!url) return;
  const body = JSON.stringify(sheetRow(row));
  // One generous attempt, not two short ones. The Apps Script web app answers
  // in well over 8s on a cold start, so the old 8s abort never saw the reply:
  // it logged a failure and retried a write that had already landed, writing
  // the same row twice. The row is a convenience copy and Postgres is the
  // source of truth, so waiting once beats guessing twice.
  try {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body, signal: AbortSignal.timeout(25_000), cache: "no-store",
    });
    // A 200 is not proof the row landed. An Apps Script web app that is not
    // deployed for "Anyone" answers the POST with a sign-in page, status 200,
    // so `response.ok` alone loses every entry in silence. Only the script's
    // own {"ok":true} counts as written.
    const reply = await response.text();
    if (response.ok && reply.includes('"ok":true')) return;
    console.error("Sheet mirror rejected", row.id, response.status, reply.slice(0, 300));
    // A timeout is not a lost row. The script commits the write before it
    // answers, so an abort here usually means the Sheet is already correct and
    // only the confirmation was missed — say so, or the next person to read this
    // log goes hunting for a data loss that never happened.
  } catch (error) { console.error("Sheet mirror unconfirmed", row.id, String(error)); }
}
