import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await(process.env.ALO_BROWSER==='webkit'?webkit:chromium).launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:748},reducedMotion:'reduce'});
 let spins=0;await page.route('**/api/demo/spin',route=>{spins++;return route.fulfill({json:{prizeId:'discount-30'}});});
 await page.goto((process.env.ALO_TEST_URL||'http://localhost:3300')+'/demo');await page.waitForLoadState('networkidle');
 await page.getByRole('button',{name:'চাকা খেলতে শুরু করো'}).click();await page.getByText('স্পিন করতে আগে নাম ও নম্বর দিয়ে রেজিস্ট্রেশন করো।').waitFor();
 await page.goBack();await page.getByRole('button',{name:'চলো, শুরু করি'}).waitFor();await page.goForward();await page.getByLabel('তোমার নাম',{exact:true}).fill('আরিফ হাসান');await page.getByLabel('মোবাইল নম্বর',{exact:true}).fill('01712345678');
 await page.getByRole('button',{name:'পরের ধাপ'}).click();await page.goBack();assert.equal(await page.getByLabel('তোমার নাম',{exact:true}).inputValue(),'আরিফ হাসান');await page.goForward();await page.getByRole('radio',{name:'বিজ্ঞান',exact:true}).check();await page.locator('#consent').check();await page.getByRole('button',{name:'এবার চাকা ঘোরাই'}).click();
 await page.getByRole('button',{name:'মাঝের বোতাম দিয়ে স্পিন করো'}).click();await page.getByRole('heading',{name:'ইয়েস! চমকটা তোমার!'}).waitFor();assert.equal(spins,1);
 await page.getByRole('button',{name:'উপহার কীভাবে পাবে?'}).click();await page.getByText('তোমার দেওয়া নম্বরে কল করে ডিসকাউন্ট নিতে সাহায্য করব।').waitFor();const code=await page.locator('.collection-code strong').innerText();
 await page.goBack();await page.getByRole('heading',{name:'ইয়েস! চমকটা তোমার!'}).waitFor();await page.goBack();await page.getByRole('heading',{name:'ইয়েস! চমকটা তোমার!'}).waitFor();assert.equal(spins,1);
 await page.getByRole('button',{name:'উপহার কীভাবে পাবে?'}).click();assert.equal(await page.locator('.collection-code strong').innerText(),code);
 for(const label of ['EduTab ড্র দেখো','শেষ ধাপ দেখো'])await page.getByRole('button',{name:label,exact:true}).click();
 assert.equal(await page.locator('.community-link').getAttribute('href'),'https://www.facebook.com/groups/shikhocommunity');await page.getByRole('button',{name:'তোমার উপহার দেখো'}).click();await page.goBack();await page.getByRole('button',{name:'আবার খেলো'}).click();await page.getByRole('button',{name:'চলো, শুরু করি'}).click();await page.getByText('আবার খেলতে নতুন করে রেজিস্ট্রেশন করো।').waitFor();
 console.log('PASS: browser back/forward, retained form data, centre-button spin, no repeat award through history, discount callback copy, community destination and demo replay guidance.');
}finally{await browser.close();}
