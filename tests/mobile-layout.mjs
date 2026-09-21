import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';

const browserType = process.env.ALO_BROWSER === 'webkit' ? webkit : chromium;
const browser = await browserType.launch({ headless: true });
const base = process.env.ALO_TEST_URL || 'http://localhost:3300';

async function assertScreen(page, name) {
  await page.waitForTimeout(80);
  const layout = await page.evaluate(() => {
    const undersized = [...document.querySelectorAll('button,a[href],label.group-option,label.consent')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < innerWidth;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { text: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 40), width: rect.width, height: rect.height };
      })
      .filter(({ width, height }) => width < 44 || height < 44);
    return {
      scrollY,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      undersized,
    };
  });
  assert.equal(layout.scrollY, 0, `${name}: the new screen did not reset to its top`);
  assert.equal(layout.horizontalOverflow, false, `${name}: horizontal overflow`);
  assert.deepEqual(layout.undersized, [], `${name}: touch targets smaller than 44 x 44`);
}

try {
  const page = await browser.newPage({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
  await page.route('**/api/demo/spin', (route) => route.fulfill({ json: { prizeId: 'discount-20' } }));
  await page.goto(`${base}/demo`);
  await page.waitForLoadState('networkidle');
  await assertScreen(page, 'landing');

  await page.getByRole('button', { name: 'চলো, শুরু করি' }).click();
  await assertScreen(page, 'registration details');
  await page.getByLabel('তোমার নাম', { exact: true }).fill('পরীক্ষা শিক্ষার্থী');
  await page.getByLabel('মোবাইল নম্বর', { exact: true }).fill('01712345678');
  await page.getByRole('button', { name: 'পরের ধাপ' }).click();
  await assertScreen(page, 'registration class');

  await page.getByRole('radio', { name: 'নবম শ্রেণী', exact: true }).check();
  await page.locator('#consent').check();
  await page.getByRole('button', { name: 'পরের ধাপ' }).click();
  await assertScreen(page, 'registration group');

  await page.getByRole('radio', { name: 'বিজ্ঞান', exact: true }).check();
  await page.getByRole('button', { name: 'এবার চাকা ঘোরাই' }).click();
  await assertScreen(page, 'wheel');
  await page.getByRole('button', { name: 'চাকা ঘোরাও', exact: true }).click();
  await page.getByRole('heading', { name: 'ইয়েস! চমকটা তোমার!' }).waitFor();
  await assertScreen(page, 'gift');

  for (const label of ['উপহার কীভাবে পাবে?', 'EduTab ড্র দেখো', 'শেষ ধাপ দেখো']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await assertScreen(page, label);
  }

  console.log('PASS: 320 px journey resets to the top, has no horizontal overflow, and keeps visible touch targets at least 44 x 44.');
} finally {
  await browser.close();
}
