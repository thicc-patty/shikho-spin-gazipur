import "server-only";
import type { EntryView, EventInfo, PrizeId } from "../game";
export type EntryRow = {
  id: string; phone: string; name: string; study_group: string; event_id: string; event_info: EventInfo;
  prize_id: PrizeId | null; prize_code: string | null; won_at: Date | null;
  expires_at: Date | null; redeemed_at: Date | null;
  crm_lead_id?: number | null; crm_prospect_id?: string | null;
};
export function entryView(row: EntryRow): EntryView {
  return { name: row.name, group: row.study_group, event: row.event_info, prizeId: row.prize_id,
    code: row.prize_code, wonAt: row.won_at?.toISOString() || null,
    expiresAt: row.expires_at?.toISOString() || null, redeemedAt: row.redeemed_at?.toISOString() || null };
}
export function crmPayload(row: EntryRow, kind: string) {
  return { schemaVersion: 1, kind, lead: { phone: row.phone, name: row.name, studyGroup: row.study_group },
    event: { name: "shikho_spin_gpa5_2026", location: row.event_id, locationName: row.event_info.city,
      result: row.prize_id, discountPercent: row.prize_id?.startsWith("discount-") ? Number(row.prize_id.split("-")[1]) : null,
      completedAt: row.won_at?.toISOString() || null, expiresAt: row.expires_at?.toISOString() || null,
      nationalDrawEntered: !!row.won_at },
    instructions: "Upsert by phone; update study group if different; map completion fields to filterable CRM fields." };
}
