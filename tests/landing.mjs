import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const base=process.env.ALO_TEST_URL||'http://localhost:3300';
try{
 const page=await browser.newPage({viewport:{width:390,height:748}});
 await page.goto(base+'/demo');await page.locator('.preview-play').waitFor();
 await page.locator('.draw-banner').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
 for(const viewport of [{width:360,height:640},{width:390,height:748},{width:430,height:932}]){
  await page.setViewportSize(viewport);
  const positions=await page.evaluate(()=>{
   const controls=document.querySelector('.welcome-game .micro')?.getBoundingClientRect();
   const teaser=document.querySelector('.draw-banner')?.getBoundingClientRect();
   return {gap:teaser&&controls?teaser.top-controls.bottom:null,teaserBottom:teaser?.bottom,viewportHeight:innerHeight,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  assert.ok(positions.gap!==null&&positions.gap>=8&&positions.gap<=20,`EduTab gap should stay compact at ${viewport.width}x${viewport.height}: ${positions.gap}`);
  assert.ok((positions.teaserBottom??Infinity)<=positions.viewportHeight,`landing should fit at ${viewport.width}x${viewport.height}`);
  assert.ok(positions.overflow<=0,`landing should not overflow horizontally at ${viewport.width}x${viewport.height}`);
 }
 await page.setViewportSize({width:390,height:748});
 const teaser=page.locator('.draw-banner');assert.equal(await teaser.evaluate(e=>getComputedStyle(e).animationName),'edutab-teaser-in');
 const wheel=page.locator('.preview-play .wheel-disc');
 await wheel.evaluate(e=>{const a=e.getAnimations()[0];a.pause();a.currentTime=150;});const first=await wheel.evaluate(e=>getComputedStyle(e).transform);
 await wheel.evaluate(e=>{e.getAnimations()[0].currentTime=1200;});assert.notEqual(await wheel.evaluate(e=>getComputedStyle(e).transform),first);
 await page.getByRole('button',{name:'চাকা খেলতে শুরু করো'}).click();await page.getByLabel('তোমার নাম',{exact:true}).waitFor();
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/demo');assert.equal(await page.locator('.preview-play .wheel-disc').evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await page.locator('.draw-banner').evaluate(e=>getComputedStyle(e).animationName),'none');
 console.log('PASS: wheel and EduTab teaser animate; tapping starts registration; reduced motion disables animation.');
}finally{await browser.close();}
