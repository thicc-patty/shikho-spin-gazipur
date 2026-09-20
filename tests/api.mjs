import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import postgres from "postgres";
const base=process.env.ALO_TEST_URL||"http://localhost:3300";
const db=postgres(process.env.DATABASE_URL,{prepare:false,max:1});
const phone="019"+String(randomInt(10000000,99999999));
const cookieJars=[];let entryId;let testEventId;let originalEvent;
async function call(path,data,cookie="",method="POST",headers={}){
 const res=await fetch(base+path,{method,headers:{"Content-Type":"application/json",cookie,...headers},...(method==="GET"?{}:{body:JSON.stringify(data)})});
 return {status:res.status,data:await res.json(),cookie:res.headers.get("set-cookie")?.split(";")[0]};
}
try{
 assert.equal((await call("/api/ops",null,"","GET")).status,401);
 assert.equal((await call("/api/spin",{})).status,401);
 assert.equal((await call("/api/session",{event:"invented-city"})).status,404);
 assert.equal((await call("/api/session",{event:"chattogram"},"","POST",{origin:"https://elsewhere.example"})).status,403);
 for(let i=0;i<2;i++){const s=await call("/api/session",{event:"chattogram"});assert.equal(s.status,200);cookieJars.push(s.cookie);}
 const registration={name:"QA Automated Student",phone,group:"technical",event:"chattogram",consent:true};
 assert.equal((await call("/api/register",{...registration,phone:"123"},cookieJars[0])).status,422);
 assert.equal((await call("/api/register",{...registration,consent:false},cookieJars[0])).status,400);
 const concurrent=await Promise.all(cookieJars.map(c=>call("/api/register",registration,c)));
 assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
 const owner=cookieJars[concurrent.findIndex(r=>r.status===200)];
 const [saved]=await db`SELECT id FROM alo.entries WHERE phone=${"88"+phone}`;entryId=saved.id;
 const spins=await Promise.all(Array.from({length:6},()=>call("/api/spin",{},owner)));
 assert.ok(spins.every(s=>s.status===200));
 assert.equal(new Set(spins.map(s=>s.data.entry.code)).size,1);
 assert.equal(new Set(spins.map(s=>s.data.entry.prizeId)).size,1);
 const outcome=spins[0].data.entry;
 assert.ok(!JSON.stringify(outcome).includes(phone));
 if(outcome.expiresAt)assert.equal(new Date(outcome.expiresAt)-new Date(outcome.wonAt),72*3600000);
 assert.equal((await call("/api/session",{event:"chattogram"},owner)).data.entry.code,outcome.code);
 const [counts]=await db`SELECT (SELECT count(*) FROM alo.crm_outbox WHERE entry_id=${entryId})::int AS crm,(SELECT count(*) FROM alo.analytics WHERE entry_id=${entryId} AND name='spin_completed')::int AS spins`;
 assert.deepEqual({...counts},{crm:2,spins:1});
 const id=randomUUID(),batch={events:[{id,event:"chattogram",name:"result_view",step:"result"}]};
 await call("/api/analytics",batch,owner);await call("/api/analytics",batch,owner);
 const [analytics]=await db`SELECT count(*)::int AS count FROM alo.analytics WHERE id=${id}`;assert.equal(analytics.count,1);
 assert.equal((await call("/api/analytics",{events:[{id:randomUUID(),event:"chattogram",name:"spin_completed"}]},owner)).status,400);
 const login=await call("/api/ops/login",{key:process.env.ALO_OPS_KEY});assert.equal(login.status,200);
 assert.equal((await call("/api/ops",null,login.cookie,"GET")).status,200);
 const redemptions=await Promise.all([call("/api/ops",{action:"redeem",code:outcome.code},login.cookie),call("/api/ops",{action:"redeem",code:outcome.code},login.cookie)]);
 assert.deepEqual(redemptions.map(r=>r.status).sort(),[200,409]);
 const report=(await call("/api/ops",null,login.cookie,"GET")).data;
 originalEvent=report.events.find(e=>e.id===report.activeEvent);
 testEventId="qa-"+randomUUID().slice(0,8);
 assert.equal((await call("/api/ops",{action:"event",id:testEventId,city:"পরীক্ষা শহর",name:"QA Event",date:"2026-09-15",active:true},login.cookie)).status,200);
 const root=await (await fetch(base)).text();assert.ok(root.includes("পরীক্ষা শহর"));
 const location=await (await fetch(base+"/?event="+testEventId)).text();assert.ok(location.includes("পরীক্ষা শহর"));
 assert.equal((await call("/api/session",{event:testEventId},owner)).data.entry.event.id,"chattogram");
 console.log("PASS: dynamic active venue, event-specific URL and immutable original ticket location.");
 console.log("PASS: auth, origin, validation, phone uniqueness under concurrency, six simultaneous spins, immutable result, 72h expiry, CRM outbox, analytics deduplication and one-time redemption.");
}finally{
 if(testEventId)await db.begin(async tx=>{await tx`UPDATE alo.events SET active=false WHERE id=${testEventId}`;if(originalEvent)await tx`UPDATE alo.events SET active=true WHERE id=${originalEvent.id}`;await tx`DELETE FROM alo.events WHERE id=${testEventId}`;});
 if(entryId){
   const [entry]=await db`SELECT prize_id,event_id FROM alo.entries WHERE id=${entryId}`;
   if(entry&&["bag","book"].includes(entry.prize_id))await db`UPDATE alo.inventory SET awarded=awarded-1 WHERE event_id=${entry.event_id} AND prize_id=${entry.prize_id}`;
   await db`DELETE FROM alo.analytics WHERE entry_id=${entryId} OR session_id IN (SELECT id FROM alo.sessions WHERE entry_id=${entryId})`;
   await db`DELETE FROM alo.crm_outbox WHERE entry_id=${entryId}`;
   await db`DELETE FROM alo.sessions WHERE entry_id=${entryId}`;
   await db`DELETE FROM alo.entries WHERE id=${entryId}`;
 }
 await db.end();
}
