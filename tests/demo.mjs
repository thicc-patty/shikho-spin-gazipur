import assert from "node:assert/strict";
import {chromium} from "@playwright/test";
import {randomUUID} from "node:crypto";
import postgres from "postgres";
const base=process.env.ALO_TEST_URL||"http://localhost:3300";
const db=postgres(process.env.DATABASE_URL,{prepare:false,max:1});
const browser=await chromium.launch({headless:true});
const marker="QA demo feedback "+randomUUID();
const snapshot=async()=>({... (await db`SELECT (SELECT count(*) FROM alo.entries)::int AS entries,(SELECT count(*) FROM alo.sessions)::int AS sessions,(SELECT count(*) FROM alo.analytics)::int AS analytics,(SELECT count(*) FROM alo.crm_outbox)::int AS crm,(SELECT coalesce(sum(awarded),0) FROM alo.inventory)::int AS prizes`)[0]});
const before=await snapshot();
try{
 const page=await browser.newPage({viewport:{width:390,height:748},reducedMotion:"reduce"});
 const liveCalls=[];const errors=[];
 page.on("request",r=>{if(/\/api\/(session|register|spin|analytics)(\?|$)/.test(r.url()))liveCalls.push(r.url());});
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto(base+"/demo");await page.waitForLoadState("networkidle");await page.locator('[data-ready="true"]').waitFor();
 assert.equal(await page.locator(".demo-banner").count(),0);
 await page.screenshot({path:'.screenshots/demo-welcome.png',fullPage:true});
 for(let run=0;run<2;run++){
  await page.getByRole("button",{name:"চলো, শুরু করি"}).click();
  await page.getByLabel("তোমার নাম",{exact:true}).fill("ডেমো শিক্ষার্থী");await page.getByLabel("মোবাইল নম্বর",{exact:true}).fill("01712345678");
  await page.getByRole("button",{name:"পরের ধাপ",exact:true}).click();
  await page.getByRole("radio",{name:"কারিগরি",exact:true}).check();await page.locator("#consent").check();
  await page.getByRole("button",{name:"এবার চাকা ঘোরাই"}).click();await page.getByRole("button",{name:"চাকা ঘোরাও",exact:true}).click();
  await page.getByRole("heading",{name:"ইয়েস! চমকটা তোমার!"}).waitFor();
  await page.screenshot({path:'.screenshots/demo-gift.png',fullPage:true});
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'উপহারের ছবি সেভ করো'}).click();
  const download=await downloadPromise;await download.saveAs('.screenshots/exported-gift.png');
  for(const [index,label] of ["উপহার কীভাবে পাবে?","EduTab ড্র দেখো","শেষ ধাপ দেখো"].entries()){
   const next=page.getByRole('button',{name:label,exact:true});const bounds=await next.boundingBox();assert.ok(bounds.y+bounds.height<=748,`Page ${index} next button below fold`);
   await next.click();
   if(index===0)assert.match(await page.locator('.collection-code strong').innerText(),/^[\p{L}\p{M}]+-78-[A-HJ-NP-Z2-9]{4}$/u);
   if(index===1)assert.match(await page.locator('.story-body').innerText(),/তোমার নাম যোগ হয়েছে/);
   await page.screenshot({path:`.screenshots/demo-story-${index+1}.png`,fullPage:true});
  }
  assert.equal(await page.locator('.unified-share').count(),1);
  assert.equal(await page.locator('a[href*="wa.me"]').count(),0);
  if(run===0)await page.getByRole("button",{name:"আবার খেলো"}).click();
 }
 assert.equal(await page.getByRole('button',{name:'মতামত',exact:true}).count(),0);
 assert.equal(await page.locator('.demo-feedback').count(),0);
 await page.screenshot({path:'.screenshots/demo-result.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(await snapshot(),before);assert.deepEqual(liveCalls,[]);assert.deepEqual(errors,[]);
 assert.equal((await fetch(base+'/api/ops/demo-feedback')).status,401);
 assert.equal((await fetch(base+'/api/demo/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,404);
 const login=await fetch(base+'/api/ops/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:process.env.ALO_OPS_KEY})});assert.equal(login.status,200);
 const report=await fetch(base+'/api/ops/demo-feedback',{headers:{cookie:login.headers.get('set-cookie').split(';')[0]}});assert.equal(report.status,200);assert.ok(Array.isArray((await report.json()).rows));
 console.log("PASS: two demo plays with the same phone, isolated from all live entries/sessions/analytics/CRM/inventory; production-equivalent wording, no feedback controls, protected historical feedback report, no mobile overflow or browser errors.");
}finally{await browser.close();await db`DELETE FROM alo.demo_feedback WHERE comment=${marker}`;await db.end();}
