import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:8090/';
const output = path.resolve('qa-screenshots');
fs.mkdirSync(output, { recursive: true });

function staticChecks() {
  for (const prefix of ['', 'tr/']) {
    const page = fs.readFileSync(prefix + 'index.html', 'utf8');
    assert.equal((page.match(/data-service="/g) || []).length, 5, 'Five services must remain: ' + prefix);
    assert(page.includes(prefix ? '../hamdi-motion.css?' : 'href="hamdi-motion.css?'), 'Motion style linked: ' + prefix);
    assert(page.includes(prefix ? '../hamdi-motion.mjs?' : 'src="hamdi-motion.mjs?'), 'Motion JS linked: ' + prefix);
    assert(page.includes('id="hamdi-ai-dialog"') && page.includes('id="direct-booking"'), 'Both dialogs retained');
    assert(!/<a[^>]+href="[^"]*about\//.test(page), 'Removed About Hamdi link stays removed');
    assert(!/<(?:section|nav)[^>]+id="prices"/i.test(page), 'No invented pricing section');
  }
  for (const name of ['hamdi-motion.css', 'hamdi-motion.mjs']) {
    assert(fs.existsSync(name), 'Missing source: ' + name);
  }
}

async function run() {
  staticChecks();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const [locale, lang] of [['', 'ar'], ['tr/', 'tr']]) {
      for (const [label, viewport] of [['phone', { width: 375, height: 812 }], ['desktop', { width: 1280, height: 900 }]]) {
        const page = await browser.newPage({ viewport, reducedMotion: 'no-preference' });
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        try {
          const response = await page.goto(origin + locale, { waitUntil: 'domcontentloaded', timeout: 30000 });
          assert.equal(response.status(), 200, 'HTTP 200 expected');
          await page.waitForFunction(() => !document.getElementById('hamdi-entry')?.open, undefined, { timeout: 10000 });
          await page.waitForTimeout(250); // let modules initialize
          assert.equal(await page.locator('html').getAttribute('lang'), lang, 'Correct language');
          assert.equal(await page.locator('.cards .card').count(), 5, 'All five service cards present');
          assert.equal(await page.locator('.hero-actions a').count(), 2, 'Both hero actions present');
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
            'Horizontal overflow at ' + lang + ' ' + label);
          const service = page.locator('.card a[data-service]').first();
          assert((await service.boundingBox()).height >= 43, 'Booking tap target at least 44px');
          // This only checks opening/closing; no request gets submitted.
          await service.click();
          assert.equal(await page.locator('#direct-booking').evaluate(el => el.open), true, 'Booking modal opens');
          await page.locator('#direct-booking-close').click();
          assert.equal(await page.locator('#direct-booking').evaluate(el => el.open), false, 'Booking closes');
          await page.locator('.hero-actions .ai-entry').click();
          assert.equal(await page.locator('#hamdi-ai-dialog').evaluate(el => el.open), true, 'Nur modal opens');
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#hamdi-ai-dialog').evaluate(el => el.open), false, 'Nur closes on Escape');
          await page.screenshot({ path: path.join(output, lang + '-' + label + '.png'), fullPage: true, animations: 'disabled' });
          assert.deepEqual(pageErrors, [], 'No uncaught JS errors at ' + lang + ' ' + label);
          console.log('PASS', lang, label, 'no overflow, all cards, Nur and booking open/close');
        } finally {
          await page.close();
        }
      }
    }
    const reduced = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    try {
      await reduced.goto(origin, { waitUntil: 'domcontentloaded' });
      assert.equal(await reduced.locator('html.has-hamdi-motion').count(), 0, 'Reduced motion stays disabled');
      console.log('PASS reduced-motion preference');
    } finally { await reduced.close(); }
  } finally { await browser.close(); }
}

run().catch(err => { console.error(err); process.exitCode = 1; });
