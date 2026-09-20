import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await (process.env.ALO_BROWSER==="webkit"?webkit:chromium).launch({headless:true});
const base=process.env.ALO_TEST_URL||'http://localhost:3300';
try{for(const [width,height,prizeId] of [[360,640,'discount-20'],[360,640,'book'],[390,748,'bag'],[1470,860,'discount-60']]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 await page.route('**/api/demo/spin',r=>r.fulfill({json:{prizeId}}));
 await page.goto(base+'/demo');await page.waitForLoadState('networkidle');
 const check=async(label)=>{const b=await page.getByRole('button',{name:label,exact:true}).boundingBox();assert.ok(b.y>=0&&b.y+b.height<=height,`${width}: ${label} outside viewport ${JSON.stringify(b)}`);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);};
 assert.ok(await page.locator('.draw-banner').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));
 await page.screenshot({path:`.screenshots/landing-after-${width}.png`,fullPage:true});
 await check('চলো, শুরু করি');await page.getByRole('button',{name:'চলো, শুরু করি'}).click();
 await check('পরের ধাপ');await page.getByLabel('তোমার নাম',{exact:true}).fill('পরীক্ষা শিক্ষার্থী');await page.getByLabel('মোবাইল নম্বর',{exact:true}).fill('01712345678');await page.getByRole('button',{name:'পরের ধাপ'}).click();
 await check('এবার চাকা ঘোরাই');await page.getByRole('radio',{name:'বিজ্ঞান',exact:true}).check();await page.locator('#consent').check();await page.getByRole('button',{name:'এবার চাকা ঘোরাই'}).click();
 await check('চাকা ঘোরাও');await page.getByRole('button',{name:'চাকা ঘোরাও',exact:true}).click();await page.getByRole('heading',{name:'ইয়েস! চমকটা তোমার!'}).waitFor();
 await page.screenshot({path:`.screenshots/gift-${width}-${prizeId}.png`,fullPage:true});
 const exportText=await page.locator('.export-gift').innerText();assert.match(exportText,/তোমার ইউনিক কোড/);assert.match(exportText,/পরীক্ষা-78-[A-HJ-NP-Z2-9]{4}/);assert.doesNotMatch(exportText,/shikho-alo\.vercel\.app/);
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'উপহারের ছবি সেভ করো'}).click();await(await dl).saveAs(`.screenshots/export-${prizeId}.png`);
 for(const label of ['উপহার কীভাবে পাবে?','EduTab ড্র দেখো','শেষ ধাপ দেখো']){await check(label);await page.getByRole('button',{name:label,exact:true}).click();if(label==='উপহার কীভাবে পাবে?'){await page.screenshot({path:`.screenshots/collection-${width}-${prizeId}.png`,fullPage:true});}if(label==='EduTab ড্র দেখো'){await page.locator('.edutab-reveal img').evaluate(async img=>{try{await img.decode();}catch{await img.decode();}});await page.screenshot({path:`.screenshots/edutab-${width}.png`,fullPage:true});}}
 await check('চমকটা শেয়ার করো');await check('তোমার উপহার দেখো');await page.screenshot({path:`.screenshots/next-${width}.png`,fullPage:true});
 await page.close();
}console.log('PASS: every primary action is visible; image exports contain the unique code and no website URL.');}finally{await browser.close();}
