import "server-only";
import { z } from "zod";
import { type EventInfo, type PrizeId, type StudyGroupId } from "../game";
import { sql } from "./db";
import type { EntryRow } from "./entries";

const CRM_BASE = process.env.CRM_API_BASE_URL || "https://crm-api.shikho.com/api/v1";
const FORM_FIELD_ID = 536;
const PRODUCT_ID = "1";
const LEAD_CAMPAIGN = "S26_LGPA5_Spin";
const LeadResponse = z.object({ id: z.coerce.number().int().positive(), prospect_id: z.string().uuid() });
// Class eleven is what the original GPA5 entries carry; six to ten arrived with the school-class step.
// Passing year follows the student's next board exam from the 2026 campaign year.
// Confirm these cf_class codes and years with the CRM owner before a live run.
const CLASSES: Record<string, { cf: string; passing: string }> = {
  c6: { cf: "C6", passing: "2031" }, c7: { cf: "C7", passing: "2030" }, c8: { cf: "C8", passing: "2029" },
  c9: { cf: "C9", passing: "2028" }, c10: { cf: "C10", passing: "2027" }, c11: { cf: "C11", passing: "2028" },
};
function classFields(row:EntryRow) {
  const level=CLASSES[row.class_level];
  if(!level)throw new Error("Unsupported class level");
  return { cf_class:level.cf, cf_passing_year:level.passing };
}
const GROUPS: Record<StudyGroupId, { lead: "SCI"|"HUM"|"BS"|"ALIM"|"NONE"; event: "SCI"|"HUM"|"BS"|"ALIM"|"VOC"|"NONE" }> = {
  science: { lead: "SCI", event: "SCI" },
  humanities: { lead: "HUM", event: "HUM" },
  business: { lead: "BS", event: "BS" },
  madrasah: { lead: "ALIM", event: "ALIM" },
  technical: { lead: "NONE", event: "VOC" },
  others: { lead: "NONE", event: "NONE" },
};

type OutboxKind = "lead.upsert" | "spin.completed";
type ClaimedJob = { id:string; entry_id:string; kind:OutboxKind; attempts:number };
class CrmHttpError extends Error { constructor(public status:number){super(`crm_http_${status}`);} }

function token() {
  if (!process.env.CRM_TOKEN) throw new Error("CRM_TOKEN is not configured");
  return process.env.CRM_TOKEN;
}
function headers(ref:string) {
  const trace=Date.now()+Math.abs([...ref].reduce((sum,char)=>((sum*31)+char.charCodeAt(0))|0,0))%1000;
  return { "Content-Type":"application/json", "Authorization":`Bearer ${token()}`, "X-Log-Ref-Id":`crm-shikhoalo-1-${trace}` };
}
async function crmFetch(path:string, ref:string, init:RequestInit={}) {
  const response = await fetch(`${CRM_BASE}${path}`, { ...init, headers:{...headers(ref),...init.headers}, signal:AbortSignal.timeout(8_000), cache:"no-store" });
  if (!response.ok) throw new CrmHttpError(response.status);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
function eventSlug(id:string) {
  return id.split("-").filter(Boolean).map(part=>part[0]?.toUpperCase()+part.slice(1)).join("_");
}
const RESULTS:Record<PrizeId,string>={
  "discount-20":"DISCOUNT_20",
  "discount-30":"DISCOUNT_30",
  "discount-40":"DISCOUNT_40",
  "discount-50":"DISCOUNT_50",
  "discount-60":"DISCOUNT_60",
  book:"BOOK",
  bag:"SHIKHO_BAG",
};
export function crmFormValue(event:EventInfo) {
  return `S26_LGPA5_Spin_${eventSlug(event.id)}`;
}
export function crmFormLabel(event:EventInfo) {
  const venue=eventSlug(event.id).replaceAll("_"," ");
  return `S26 LGPA5 Spin - ${venue}`;
}
export function leadPayload(row:EntryRow) {
  const group=GROUPS[row.study_group as StudyGroupId];
  if(!group)throw new Error("Unsupported study group");
  const level=classFields(row);
  return { mobile:row.phone, product_id:PRODUCT_ID, source:"Social Media Form", campaign:LEAD_CAMPAIGN,
    name:row.name, country_code:"BD", cf_class:level.cf_class, cf_group:group.lead, cf_passing_year:level.cf_passing_year, cf_palo_year:"2026" };
}
function dhakaTimestamp(value:Date) {
  return new Date(value.getTime()+6*3600_000).toISOString().slice(0,19).replace("T"," ");
}
export function eventPayload(row:EntryRow, prospectId:string) {
  if(!row.prize_id||!row.won_at)throw new Error("Prize is not committed");
  const group=GROUPS[row.study_group as StudyGroupId];
  if(!group)throw new Error("Unsupported study group");
  return { type:"campaign_form_submission", lead_prospect_id:prospectId, product_id:PRODUCT_ID,
    created_at:dhakaTimestamp(row.won_at), cf_form_name:crmFormValue(row.event_info), cf_result:RESULTS[row.prize_id],
    cf_form_type:"ORGANIC", ...classFields(row), cf_group:group.event, cf_sub_status:"Unpaid" };
}

async function claim(entryId:string):Promise<ClaimedJob|undefined>{
  const [job]=await sql()<ClaimedJob[]>`UPDATE alo.crm_outbox SET status='delivering',attempts=attempts+1,updated_at=now()
    WHERE id=(SELECT id FROM alo.crm_outbox WHERE entry_id=${entryId} AND status='pending' AND next_attempt_at<=now()
      ORDER BY CASE kind WHEN 'lead.upsert' THEN 0 ELSE 1 END,created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING id,entry_id,kind,attempts`;
  return job;
}
async function fail(job:ClaimedJob,error:unknown){
  const ambiguous=job.kind==="spin.completed"&&!(error instanceof CrmHttpError);
  const terminal=error instanceof CrmHttpError&&error.status>=400&&error.status<500&&error.status!==429;
  const status=ambiguous?"uncertain":terminal?"failed":"pending";
  const message=error instanceof CrmHttpError?`HTTP ${error.status}`:error instanceof Error?error.name:"Unknown error";
  const delay=Math.min(60,2**Math.min(job.attempts,5));
  await sql()`UPDATE alo.crm_outbox SET status=${status},last_error=${message},next_attempt_at=now()+(${delay}*interval '1 minute'),updated_at=now() WHERE id=${job.id}`;
}
async function deliver(job:ClaimedJob){
  const [row]=await sql()<EntryRow[]>`SELECT * FROM alo.entries WHERE id=${job.entry_id}`;
  if(!row)throw new Error("Entry missing");
  if(job.kind==="lead.upsert"){
    const response=LeadResponse.parse(await crmFetch("/leads/upserts",job.id,{method:"POST",body:JSON.stringify(leadPayload(row))}));
    await sql().begin(async tx=>{
      await tx`UPDATE alo.entries SET crm_lead_id=${response.id},crm_prospect_id=${response.prospect_id},updated_at=now() WHERE id=${row.id}`;
      await tx`UPDATE alo.crm_outbox SET status='delivered',last_error=NULL,delivered_at=now(),updated_at=now() WHERE id=${job.id}`;
    });
    return;
  }
  if(!row.crm_prospect_id){
    await sql()`UPDATE alo.crm_outbox SET status='pending',last_error='Lead delivery pending',next_attempt_at=now()+interval '1 minute',updated_at=now() WHERE id=${job.id}`;
    return;
  }
  await crmFetch("/events",job.id,{method:"POST",body:JSON.stringify(eventPayload(row,row.crm_prospect_id))});
  await sql()`UPDATE alo.crm_outbox SET status='delivered',last_error=NULL,delivered_at=now(),updated_at=now() WHERE id=${job.id}`;
}
export async function flushEntryCrm(entryId:string){
  if(!process.env.CRM_TOKEN)return;
  for(let i=0;i<2;i++){
    const job=await claim(entryId);if(!job)return;
    try{await deliver(job);}catch(error){await fail(job,error);return;}
  }
}
export async function flushPendingCrm(limit=25){
  if(!process.env.CRM_TOKEN)return {processed:0,configured:false};
  await sql()`UPDATE alo.crm_outbox SET status=CASE WHEN kind='lead.upsert' THEN 'pending' ELSE 'uncertain' END,
    last_error='Delivery interrupted',updated_at=now() WHERE status='delivering' AND updated_at<now()-interval '10 minutes'`;
  const rows=await sql()<Array<{entry_id:string}>>`SELECT DISTINCT entry_id FROM alo.crm_outbox WHERE status='pending' AND next_attempt_at<=now() ORDER BY entry_id LIMIT ${limit}`;
  for(const row of rows)await flushEntryCrm(row.entry_id);
  return {processed:rows.length,configured:true};
}
export async function provisionCrmEvent(event:EventInfo){
  const field=await crmFetch(`/custom-fields/${FORM_FIELD_ID}?cols=%2A`,`provision-${event.id}`);
  const present=new Set((field.items||field.data?.items||[]).map((item:{value:string})=>item.value));
  const created:string[]=[];
  const value=crmFormValue(event);
  if(!present.has(value)){
    await crmFetch("/custom-field-items",`provision-${event.id}`,{method:"POST",body:JSON.stringify({custom_field_id:FORM_FIELD_ID,value,name:crmFormLabel(event)})});
    created.push(value);
  }
  return {created,total:1};
}
