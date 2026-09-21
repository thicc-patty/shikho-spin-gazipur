import { randomUUID } from "node:crypto";
import { z } from "zod";
import { CAMPAIGN, CLASS_LEVELS, NO_GROUP, needsStudyGroup, normalizePhone, STUDY_GROUPS } from "@/lib/game";
import { getEvent } from "@/lib/events";
import { sql } from "@/lib/server/db";
import { api, ApiError, body, rateLimit, requireSession } from "@/lib/server/http";
import { crmPayload, entryView, type EntryRow } from "@/lib/server/entries";
import { flushEntryCrm } from "@/lib/server/crm";
import { mirrorToSheet } from "@/lib/server/sheet";
import { after } from "next/server";
import { verifyTurnstile } from "@/lib/server/turnstile";
const Input = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().max(30),
  group: z.enum(STUDY_GROUPS.map(g => g.id)), classLevel: z.enum(CLASS_LEVELS.map(c => c.id)), event: z.string().max(48), consent: z.literal(true),turnstile:z.string().max(2048).optional() });
export async function POST(req: Request) {
  return api(async () => {
    const data = Input.safeParse(await body(req));
    if (!data.success) throw new ApiError(400, "invalid");
    const phone = normalizePhone(data.data.phone);
    if (!phone) throw new ApiError(422, "phone");
    const event = await getEvent(data.data.event);
    if (!event) throw new ApiError(404, "event");
    // Only classes nine and ten choose a group; younger classes are stored without one.
    const studyGroup = needsStudyGroup(data.data.classLevel) ? data.data.group : NO_GROUP;
    const current = await requireSession();
    if(!await verifyTurnstile(req,data.data.turnstile))throw new ApiError(403,"bot_check");
    await rateLimit(req, "register", 5);
    const result = await sql().begin(async tx => {
      // Serialise two submissions from the same browser before inserting a lead.
      const [locked] = await tx`SELECT entry_id FROM alo.sessions WHERE id=${current.id} FOR UPDATE`;
      if (locked.entry_id) {
        const [saved] = await tx<EntryRow[]>`SELECT * FROM alo.entries WHERE id=${locked.entry_id}`;
        if (saved.phone !== phone) throw new ApiError(409, "device_registered");
        return { entryId:saved.id, row:null, entry:entryView(saved) };
      }
      const [entry] = await tx<EntryRow[]>`INSERT INTO alo.entries(id,campaign,phone,name,study_group,class_level,event_id,event_info)
        VALUES (${randomUUID()},${CAMPAIGN},${phone},${data.data.name},${studyGroup},${data.data.classLevel},${event.id},${tx.json(event)})
        ON CONFLICT(campaign,phone) DO NOTHING RETURNING *`;
      // A phone that has played before simply resumes its own entry: same code,
      // same best prize, free to spin again. Without this, a student who came
      // back after the stall reset the device would be locked out for good.
      if (!entry) {
        const [existing] = await tx<EntryRow[]>`SELECT * FROM alo.entries WHERE campaign=${CAMPAIGN} AND phone=${phone}`;
        await tx`UPDATE alo.sessions SET entry_id=${existing.id} WHERE id=${current.id}`;
        return { entryId:existing.id, row:null, entry:entryView(existing) };
      }
      await tx`UPDATE alo.sessions SET entry_id=${entry.id} WHERE id=${current.id}`;
      await tx`INSERT INTO alo.analytics(id,session_id,entry_id,event_id,name) VALUES (${randomUUID()},${current.id},${entry.id},${event.id},'registration_completed')`;
      await tx`INSERT INTO alo.crm_outbox(id,entry_id,kind,payload) VALUES (${randomUUID()},${entry.id},'lead.upsert',${tx.json(crmPayload(entry,"lead.upsert"))})`;
      return { entryId:entry.id, row:entry, entry:entryView(entry) };
    });
    after(()=>flushEntryCrm(result.entryId));
    if(result.row)after(()=>mirrorToSheet(result.row!));
    return {ok:true,entry:result.entry};
  });
}
