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
    assert(page.includes(prefix ? '../hamdi-glass-premium.css?' : 'href="hamdi-glass-premium.css?'), 'Luxury glass skin linked: ' + prefix);
    assert(page.includes(prefix ? '../hamdi-reference-match.css?' : 'href="hamdi-reference-match.css?'), 'Approved reference design linked: ' + prefix);
    assert(page.includes('id="hamdi-ai-dialog"') && page.includes('id="direct-booking"'), 'Both dialogs retained');
    assert(!/<a[^>]+href="[^"]*about\//.test(page), 'Removed About Hamdi link stays removed');
    assert(!/<(?:section|nav)[^>]+id="prices"/i.test(page), 'No invented pricing section');
  }
  for (const name of ['hamdi-motion.css', 'hamdi-motion.mjs', 'hamdi-glass-premium.css', 'hamdi-reference-match.css', 'hamdi-assets/emerald-gold-camera-lens.svg', 'hamdi-assets/reference-camera-lens.webp', 'hamdi-assets/reference-service-icons.webp']) {
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
          // The localized welcome must cover the viewport on phones and desktops.
          const welcome = page.locator('#hamdi-entry');
          await page.waitForFunction(() => document.getElementById('hamdi-entry')?.open, undefined, { timeout: 3000 });
          const welcomeBounds = await welcome.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return { left:rect.left, top:rect.top, right:rect.right, bottom:rect.bottom,
              vw:window.innerWidth, vh:window.innerHeight };
          });
          assert(Math.abs(welcomeBounds.left) < 3 && Math.abs(welcomeBounds.top) < 3
            && welcomeBounds.right >= welcomeBounds.vw - 3
            && welcomeBounds.bottom >= welcomeBounds.vh - 3, 'Welcome covers full viewport');
          const greetingText = await welcome.locator('.hamdi-entry-greeting').innerText();
          assert(greetingText.includes(lang === 'tr' ? 'hoş geldiniz' : 'أهلًا وسهلًا'),
            'Welcome greeting matches page language');
          await page.waitForFunction(() => !document.getElementById('hamdi-entry')?.open, undefined, { timeout: 10000 });
          await page.waitForTimeout(250); // let modules initialize
          assert.equal(await page.locator('html').getAttribute('lang'), lang, 'Correct language');
          assert.equal(await page.locator('.cards .card').count(), 5, 'All five service cards present');
          assert.equal(await page.locator('.hero-actions a').count(), 2, 'Both hero actions present');
          const glassSkin = await page.locator('.services .card').first().evaluate(el => {
            const card = getComputedStyle(el);
            const before = getComputedStyle(document.querySelector('.services'), '::before');
            const action = getComputedStyle(el.querySelector('a[data-service]'));
            return {
              blur: card.backdropFilter || card.webkitBackdropFilter || '',
              lens: before.backgroundImage,
              actionBackground: action.backgroundImage
            };
          });
          assert(glassSkin.blur.includes('blur('), 'Cards must have a real translucent glass backdrop');
          assert(glassSkin.lens.includes('reference-camera-lens.webp'), 'Approved mockup camera background is loaded');
          assert(glassSkin.actionBackground.includes('linear-gradient'), 'Existing booking buttons have a gold glass finish');
          const referenceVisual = await page.evaluate(() => {
            const section = document.querySelector('#services');
            const card = section.querySelector('.card');
            const secondRow = section.querySelector('.card:nth-child(4)');
            const icon = card.querySelector('.art');
            const photo = getComputedStyle(section,'::before').backgroundImage;
            const picture = getComputedStyle(icon).backgroundImage;
            const firstHeight = card.getBoundingClientRect().height;
            const wideHeight = secondRow.getBoundingClientRect().height;
            const bounds = [...section.querySelectorAll('.card')].map(el => {
              const cardBox = el.getBoundingClientRect();
              const box = el.querySelector('a[data-service]').getBoundingClientRect();
              return {card:cardBox.toJSON(), action:box.toJSON()};
            });
            return {photo,picture,firstHeight,wideHeight,bounds};
          });
          assert(referenceVisual.photo.includes('reference-camera-lens.webp'), 'Mockup camera photograph appears as background');
          assert(referenceVisual.picture.includes('reference-service-icons.webp'), 'Mockup service illustrations appear on all cards');
          if (label === 'desktop') {
            assert(referenceVisual.firstHeight <= 355, 'Desktop first-row cards should resemble compact mockup');
            assert(referenceVisual.wideHeight <= 250, 'Desktop second-row cards should be wide and short');
          }
          for(const {card,action} of referenceVisual.bounds){
            assert(action.width > 40 && action.height >= 43, 'Service booking button remains comfortably clickable');
            assert(action.left >= card.left - 2 && action.right <= card.right + 2 &&
              action.top >= card.top - 2 && action.bottom <= card.bottom + 2,
              'Service action is not clipped by luxury card');
          }
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
          // User-facing language controls must really navigate and translate
          // both ways. Merely loading the two pages separately is not enough.
          const otherLang = lang === 'ar' ? 'tr' : 'ar';
          const otherPath = otherLang === 'tr' ? '/tr/' : '/';
          await page.locator('.lang a[data-lang="' + otherLang + '"]').click();
          await page.waitForURL(url => url.pathname === otherPath, { timeout: 9000 });
          await page.waitForLoadState('domcontentloaded');
          await page.waitForFunction(() => document.getElementById('hamdi-entry')?.open, undefined, { timeout: 3500 });
          const switchedGreeting = await page.locator('#hamdi-entry .hamdi-entry-greeting').innerText();
          assert(switchedGreeting.includes(otherLang === 'tr' ? 'hoş geldiniz' : 'أهلًا وسهلًا'), 'Switched-page welcome uses selected language');
          await page.waitForFunction(() => !document.getElementById('hamdi-entry')?.open, undefined, { timeout: 10000 });
          assert.equal(await page.locator('html').getAttribute('lang'), otherLang, 'Language switch to ' + otherLang);
          const otherHero = await page.locator('#hero-title').innerText();
          assert(otherHero.includes(otherLang === 'tr' ? 'Net çekim' : 'تصوير واضح'), 'Hero translated after switching to ' + otherLang);
          await page.locator('.lang a[data-lang="' + lang + '"]').click();
          await page.waitForURL(url => url.pathname === (lang === 'tr' ? '/tr/' : '/'), { timeout: 9000 });
          await page.waitForLoadState('domcontentloaded');
          await page.waitForFunction(() => document.getElementById('hamdi-entry')?.open, undefined, { timeout: 3500 });
          await page.waitForFunction(() => !document.getElementById('hamdi-entry')?.open, undefined, { timeout: 10000 });
          assert.equal(await page.locator('html').getAttribute('lang'), lang, 'Language switch back to ' + lang);
          console.log('PASS language-switch', lang, label, 'round trip AR/TR');
          assert.deepEqual(pageErrors, [], 'No uncaught JS errors at ' + lang + ' ' + label);
          console.log('PASS', lang, label, 'no overflow, all cards, Nur and booking open/close');
        } finally {
          await page.close();
        }
      }
    }
    // Non-destructive production Nur visual diagnostic. The remote Worker may
    // fail to load on CI; keep smoke checks independent of external availability.
    const nurPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await nurPage.goto('https://hamdiphoto.com.tr/', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await nurPage.waitForFunction(() => !document.getElementById('hamdi-entry')?.open, undefined, { timeout: 10000 });
      await nurPage.locator('.hero-actions .ai-entry').click();
      await nurPage.waitForTimeout(2800);
      await nurPage.screenshot({ path: path.join(output, 'nur-prod-open.png'), animations:'disabled' });
      const iframe = nurPage.locator('#hamdi-ai-frame');
      await iframe.evaluate(node => { node.style.colorScheme = 'light'; });
      await nurPage.screenshot({ path: path.join(output, 'nur-prod-frame-light.png'), animations:'disabled' });
      await iframe.evaluate(node => { node.style.colorScheme = 'dark'; });
      await nurPage.screenshot({ path: path.join(output, 'nur-prod-frame-dark.png'), animations:'disabled' });
      await iframe.evaluate(node => { node.style.removeProperty('color-scheme'); });
      const outer = await nurPage.locator('#hamdi-ai-dialog').evaluate(el => ({
        bg: getComputedStyle(el).backgroundColor,
        frameBg:getComputedStyle(el.querySelector('iframe')).backgroundColor,
        bounds: el.getBoundingClientRect().toJSON(),
        frameUrl: el.querySelector('iframe').src
      }));
      const inner = nurPage.frames().find(f => f.url().includes('workers.dev/hamdi-ai/assistant'));
      const styles = inner ? await inner.evaluate(() => {
        const selectors = ['html','body','.voice-card','.hero','#main','.orb-scene'];
        return { url: location.href, attrs: document.documentElement.outerHTML.slice(0,250),
          glass: (() => {
            const dlg=document.querySelector('#voice-dialog');
            const figure=document.querySelector('.tau-projection-art');
            const ring=document.querySelector('.tau-projection');
            const panel=dlg && getComputedStyle(dlg);
            return {
              consentOpen: Boolean(dlg?.open),
              panelColor:panel?.backgroundColor,
              backdrop:dlg && getComputedStyle(dlg,'::backdrop').backgroundColor,
              before:ring && getComputedStyle(ring,'::before').content,
              after:ring && getComputedStyle(ring,'::after').content,
              figureAnimation:figure && getComputedStyle(figure).animationName
            };
          })(),
          backgrounds: Object.fromEntries(selectors.map(sel => {
            const el = document.querySelector(sel);
            if(!el) return [sel, 'not found'];
            const css = getComputedStyle(el);
            return [sel,{ bg:css.backgroundColor, color:css.color, display:css.display, visibility:css.visibility }];
          })) };
      }).catch(e => ({failed:String(e)})) : {failed:'frame not loaded'};
      console.log('PRODUCTION NUR VISUAL DIAGNOSTIC', JSON.stringify({outer,inner:styles}));
    } catch(error){ console.log('PRODUCTION NUR DIAGNOSTIC SKIPPED', String(error)); }
    finally { await nurPage.close(); }
    const reduced = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    try {
      await reduced.goto(origin, { waitUntil: 'domcontentloaded' });
      assert.equal(await reduced.locator('html.has-hamdi-motion').count(), 0, 'Reduced motion stays disabled');
      console.log('PASS reduced-motion preference');
    } finally { await reduced.close(); }
  } finally { await browser.close(); }
}

run().catch(err => { console.error(err); process.exitCode = 1; });
