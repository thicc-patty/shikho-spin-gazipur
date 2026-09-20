import test from "node:test";
import assert from "node:assert/strict";
import { crmFormValue, eventPayload, leadPayload } from "../src/lib/server/crm";
import type { EntryRow } from "../src/lib/server/entries";

const base:EntryRow={
  id:"00000000-0000-4000-8000-000000000001",phone:"8801712345678",name:"রাফি আহমেদ",study_group:"science",
  event_id:"chattogram",event_info:{id:"chattogram",city:"চট্টগ্রাম",name:"প্রথম আলো GPA5 সংবর্ধনা ২০২৬",date:"2026-09-13"},
  prize_id:"discount-20",prize_code:"RAFI-78-ABCD",won_at:new Date("2026-09-10T08:32:07.000Z"),expires_at:null,redeemed_at:null,
};

test("CRM lead payload uses the documented identity and student values",()=>{
  assert.deepEqual(leadPayload(base),{
    mobile:"8801712345678",product_id:"1",source:"Social Media Form",campaign:"S26_LGPA5_Spin",name:"রাফি আহমেদ",
    country_code:"BD",cf_class:"C11",cf_group:"SCI",cf_passing_year:"2028",cf_palo_year:"2026",
  });
});

test("CRM completion event keeps one venue form name and stores the exact outcome in cf_result",()=>{
  const payload=eventPayload({...base,study_group:"technical"},"8203c16d-cabe-4c56-b0b0-3d5925dbfb04");
  assert.deepEqual(payload,{
    type:"campaign_form_submission",lead_prospect_id:"8203c16d-cabe-4c56-b0b0-3d5925dbfb04",product_id:"1",
    created_at:"2026-09-10 14:32:07",cf_form_name:"S26_LGPA5_Spin_Chattogram",cf_result:"DISCOUNT_20",cf_form_type:"ORGANIC",
    cf_class:"C11",cf_passing_year:"2028",cf_group:"VOC",cf_sub_status:"Unpaid",
  });
  assert.equal(crmFormValue({...base.event_info,id:"coxs-bazar"}),"S26_LGPA5_Spin_Coxs_Bazar");
  const results={
    "discount-20":"DISCOUNT_20","discount-30":"DISCOUNT_30","discount-40":"DISCOUNT_40",
    "discount-50":"DISCOUNT_50","discount-60":"DISCOUNT_60",book:"BOOK",bag:"SHIKHO_BAG",
  } as const;
  for(const [prize_id,cf_result] of Object.entries(results)){
    assert.equal(eventPayload({...base,prize_id:prize_id as EntryRow["prize_id"]},"8203c16d-cabe-4c56-b0b0-3d5925dbfb04").cf_result,cf_result);
  }
});
