import { randomUUID } from "node:crypto";
import { prizeRank } from "@/lib/game";
import { createPrizeCode } from "@/lib/prize-code";
import { sql } from "@/lib/server/db";
import { api, ApiError, body, requireSession } from "@/lib/server/http";
import { crmPayload, entryView, type EntryRow } from "@/lib/server/entries";
import { selectPrize } from "@/lib/server/selection";
import { flushEntryCrm } from "@/lib/server/crm";
import { mirrorToSheet } from "@/lib/server/sheet";
import { after } from "next/server";

export async function POST(req: Request) {
  return api(async () => {
    await body(req);
    const current = await requireSession();
    if (!current.entry_id) throw new ApiError(401, "register");
    const result=await sql().begin(async tx => {
      const [entry] = await tx<EntryRow[]>`SELECT * FROM alo.entries WHERE id=${current.entry_id} FOR UPDATE`;
      // No cap on spins. A later spin can only improve on the prize already
      // held, so a student never watches a better result be taken away.
      for (const id of ["bag", "book"]) {
        await tx`INSERT INTO alo.inventory(event_id,prize_id) VALUES (${entry.event_id},${id}) ON CONFLICT DO NOTHING`;
      }
      const inventory = await tx`SELECT * FROM alo.inventory WHERE event_id=${entry.event_id} ORDER BY prize_id FOR UPDATE`;
      const unavailable = inventory.filter(r => r.stock_limit !== null && r.awarded >= r.stock_limit).map(r => r.prize_id);
      const prize = selectPrize(unavailable);
      if (prize === "bag" || prize === "book") await tx`UPDATE alo.inventory SET awarded=awarded+1 WHERE event_id=${entry.event_id} AND prize_id=${prize}`;
      // Inventory rows serialize awards for this event; an advisory lock also
      // protects the candidate across simultaneous awards in different events.
      // The first spin issues the code; later spins keep it, so one phone
      // always maps to exactly one code no matter how many times it plays.
      let code = entry.prize_code || "";
      for (let attempt = 0; !code && attempt < 12; attempt++) {
        const candidate = createPrizeCode(entry.name, entry.phone);
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${candidate}, 0))`;
        const [existing] = await tx`SELECT id FROM alo.entries WHERE prize_code=${candidate}`;
        if (!existing) { code = candidate; break; }
      }
      if (!code) throw new ApiError(503, "unavailable");
      const kept = prizeRank(prize) > prizeRank(entry.prize_id) ? prize : entry.prize_id!;
      const [won] = await tx<EntryRow[]>`UPDATE alo.entries SET prize_id=${kept},prize_code=${code},spins=${entry.spins+1},
        won_at=coalesce(won_at,now()),draw_entered_at=coalesce(draw_entered_at,now()),
        expires_at=CASE WHEN ${kept} LIKE 'discount-%' THEN coalesce(expires_at,now()+interval '72 hours') ELSE NULL END WHERE id=${entry.id} RETURNING *`;
      await tx`INSERT INTO alo.analytics(id,session_id,entry_id,event_id,name,detail) VALUES (${randomUUID()},${current.id},${entry.id},${entry.event_id},'spin_completed',${tx.json({prizeId:prize})})`;
      // A re-spin replaces the queued result rather than adding a second job,
      // so CRM only ever receives the prize the student finally kept.
      await tx`INSERT INTO alo.crm_outbox(id,entry_id,kind,payload) VALUES (${randomUUID()},${entry.id},'spin.completed',${tx.json(crmPayload(won,"spin.completed"))})
        ON CONFLICT(entry_id,kind) DO UPDATE SET payload=excluded.payload,status='pending',attempts=0,last_error=NULL,next_attempt_at=now(),updated_at=now()`;
      return {entryId:won.id,row:won,entry:entryView(won)};
    });
    after(()=>flushEntryCrm(result.entryId));
    if(result.row)after(()=>mirrorToSheet(result.row!));
    return {ok:true,entry:result.entry};
  });
}
