import { randomUUID } from "node:crypto";
import { prizeCodePattern } from "@/lib/prize-code";
import { z } from "zod";
import { getEvents, getEvent } from "@/lib/events";
import { sql } from "@/lib/server/db";
import { api, ApiError, body, requireOps } from "@/lib/server/http";
import { entryView, type EntryRow } from "@/lib/server/entries";
import { flushPendingCrm, provisionCrmEvent } from "@/lib/server/crm";
export async function GET(req:Request){return api(async()=>{
  await requireOps();const event=new URL(req.url).searchParams.get("event")||"";
  if(event&&!await getEvent(event))throw new ApiError(404,"event");
  const db=sql();
  const [funnel,prizes,totals,outbox,inventory]=await Promise.all([
    db`SELECT name,count(*)::int AS events,count(DISTINCT session_id)::int AS sessions FROM alo.analytics WHERE (${event}='' OR event_id=${event}) GROUP BY name`,
    db`SELECT prize_id,count(*)::int AS count,count(redeemed_at)::int AS redeemed FROM alo.entries WHERE prize_id IS NOT NULL AND (${event}='' OR event_id=${event}) GROUP BY prize_id`,
    db`SELECT count(*)::int AS registered,count(won_at)::int AS completed,count(draw_entered_at)::int AS draw_entries FROM alo.entries WHERE (${event}='' OR event_id=${event})`,
    db`SELECT o.status,count(*)::int AS count FROM alo.crm_outbox o JOIN alo.entries e ON e.id=o.entry_id WHERE (${event}='' OR e.event_id=${event}) GROUP BY o.status`,
    db`SELECT * FROM alo.inventory WHERE (${event}='' OR event_id=${event}) ORDER BY event_id,prize_id`,
  ]);
  return {ok:true,events:await getEvents(),activeEvent:(await getEvent())?.id,funnel,prizes,totals:totals[0],outbox,inventory,crmConnected:!!process.env.CRM_TOKEN};
});}
const Action=z.discriminatedUnion("action",[
  z.object({action:z.literal("event"),id:z.string().regex(/^[a-z0-9-]{1,48}$/),city:z.string().trim().min(1).max(60),name:z.string().trim().min(1).max(120),date:z.iso.date(),active:z.boolean()}),
  z.object({action:z.literal("lookup"),code:z.string().max(80).transform(s=>s.trim().normalize("NFC").toUpperCase()).pipe(z.string().regex(prizeCodePattern))}),
  z.object({action:z.literal("redeem"),code:z.string().max(80).transform(s=>s.trim().normalize("NFC").toUpperCase()).pipe(z.string().regex(prizeCodePattern))}),
  z.object({action:z.literal("inventory"),event:z.string(),prize:z.enum(["book","bag"]),limit:z.number().int().min(0).max(100000).nullable()}),
  z.object({action:z.literal("crm_provision"),event:z.string()}),
  z.object({action:z.literal("crm_retry")}),
]);
export async function POST(req:Request){return api(async()=>{
  await requireOps();const parsed=Action.safeParse(await body(req));if(!parsed.success)throw new ApiError(400,"invalid");
  const data=parsed.data;
  if(data.action==="event"){
    await sql().begin(async tx=>{
      await tx`SELECT pg_advisory_xact_lock(260910)`;
      if(data.active)await tx`UPDATE alo.events SET active=false WHERE active=true`;
      await tx`INSERT INTO alo.events(id,city,name,date,active) VALUES(${data.id},${data.city},${data.name},${data.date},${data.active})
        ON CONFLICT(id) DO UPDATE SET city=excluded.city,name=excluded.name,date=excluded.date,active=CASE WHEN excluded.active THEN true ELSE alo.events.active END`;
    });return {ok:true};
  }
  if(data.action==="inventory"){
    if(!await getEvent(data.event))throw new ApiError(404,"event");
    await sql()`INSERT INTO alo.inventory(event_id,prize_id,stock_limit) VALUES(${data.event},${data.prize},${data.limit})
      ON CONFLICT(event_id,prize_id) DO UPDATE SET stock_limit=excluded.stock_limit`;
    return {ok:true};
  }
  if(data.action==="crm_retry")return {ok:true,...await flushPendingCrm(100)};
  if(data.action==="crm_provision"){
    const event=await getEvent(data.event);if(!event)throw new ApiError(404,"event");
    const result=await provisionCrmEvent(event);
    await sql()`UPDATE alo.events SET crm_ready_at=now() WHERE id=${event.id}`;
    return {ok:true,...result};
  }
  return sql().begin(async tx=>{
    const [entry]=await tx<EntryRow[]>`SELECT * FROM alo.entries WHERE prize_code=${data.code} FOR UPDATE`;
    if(!entry)throw new ApiError(404,"not_found");
    if(data.action==="lookup")return {ok:true,entry:entryView(entry)};
    if(entry.redeemed_at)throw new ApiError(409,"redeemed");
    if(entry.expires_at&&entry.expires_at.getTime()<=Date.now())throw new ApiError(409,"expired");
    const [redeemed]=await tx<EntryRow[]>`UPDATE alo.entries SET redeemed_at=now() WHERE id=${entry.id} RETURNING *`;
    await tx`INSERT INTO alo.analytics(id,entry_id,event_id,name) VALUES(${randomUUID()},${entry.id},${entry.event_id},'prize_redeemed')`;
    return {ok:true,entry:entryView(redeemed)};
  });
});}
