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
    assert(page.includes(prefix ? '../hamdi-full-browser.css?' : 'href="hamdi-full-browser.css?'), 'Full-browser stylesheet linked: ' + prefix);
    assert(page.includes(prefix ? '../hamdi-crystal-finish.css?' : 'href="hamdi-crystal-finish.css?'), 'New clear crystal glass finish linked: ' + prefix);
    assert(page.includes(prefix ? '../hamdi-crystal-compact-interior.css?' : 'href="hamdi-crystal-compact-interior.css?'), 'Compact inner glass skin is linked: ' + prefix);
    assert(page.includes(prefix ? '../hamdi-booking-glass.css?' : 'href="hamdi-booking-glass.css?'), 'Animated booking panel skin linked: ' + prefix);
    assert(page.includes(prefix ? '../hamdi-booking-small-glass.css?' : 'href="hamdi-booking-small-glass.css?'), 'Compact transparent booking panel linked: ' + prefix);
    assert(page.includes('hamdi-inline/site-assistant.mjs?v=instant-booking-20261123-1'), 'Zero-wait booking script is linked: ' + prefix);
    assert(!page.includes('hamdi-booking-portal.css?'), 'Black-hole animation removed: ' + prefix);
    assert(page.includes('booking-glass-brand') && page.includes('id="direct-booking-frame"'), 'Booking brand and original iframe retained');
    assert(page.includes('id="hamdi-ai-dialog"') && page.includes('id="direct-booking"'), 'Both dialogs retained');
    assert(!/<a[^>]+href="[^"]*about\//.test(page), 'Removed About Hamdi link stays removed');
    assert(!/<(?:section|nav)[^>]+id="prices"/i.test(page), 'No invented pricing section');
  }
  for (const name of ['hamdi-motion.css', 'hamdi-motion.mjs', 'hamdi-glass-premium.css', 'hamdi-reference-match.css', 'hamdi-full-browser.css', 'hamdi-crystal-finish.css', 'hamdi-crystal-compact-interior.css', 'hamdi-booking-glass.css', 'hamdi-booking-small-glass.css', 'hamdi-ai/booking-glass.css', 'hamdi-assets/emerald-gold-camera-lens.svg', 'hamdi-assets/reference-camera-lens.webp', 'hamdi-assets/reference-service-icons.webp']) {
    assert(fs.existsSync(name), 'Missing source: ' + name);
  }
  const bookingSource = fs.readFileSync('hamdi-ai/booking.html', 'utf8');
  assert(bookingSource.includes('booking-glass.css?v='), 'Real booking iframe loads its visual-only glass style');
  const innerCss = fs.readFileSync('hamdi-ai/booking-glass.css', 'utf8');
  assert(innerCss.includes('html[data-inline-booking] #order-dialog[open]'), 'Glass skin targets only embedded booking UI');
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
          const viewportShell = await page.locator('.site-frame').evaluate(el => {
            const bounds = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            const hero = document.querySelector('.hero')?.getBoundingClientRect();
            return {left:bounds.left, top:bounds.top, width:bounds.width,
              viewport:window.innerWidth, frameBorder:style.borderTopWidth,
              radius:style.borderTopLeftRadius, heroHeight:hero?.height};
          });
          assert(Math.abs(viewportShell.left) <= 1 && Math.abs(viewportShell.top) <= 1,
            'Browser layout must start exactly at the top-left viewport edge');
          assert(Math.abs(viewportShell.width - viewportShell.viewport) <= 2,
            'Main site shell must span the entire browser width');
          assert.equal(viewportShell.radius, '0px', 'Desktop browser must have no outer card-frame corners');
          assert.equal(viewportShell.frameBorder, '0px', 'No floating outer site border');
          if (label === 'desktop')
            assert(viewportShell.heroHeight >= viewport.height - 150,
              'Desktop hero fills the initial browser viewport');
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

          const originalCamera = await page.locator('#services').evaluate(section => {
            const backdrop = getComputedStyle(section, '::before');
            const rect = section.getBoundingClientRect();
            const width = parseFloat(backdrop.width);
            const mask = backdrop.maskImage || backdrop.webkitMaskImage;
            return {width,sectionWidth:rect.width,mask,photo:backdrop.backgroundImage};
          });
          if (label === 'desktop') {
            assert(originalCamera.width < originalCamera.sectionWidth * .5,
              'Original compact camera remains on left, not stretched across section');
          }
          assert(originalCamera.mask.includes('radial-gradient'),
            'Original soft oval lens mask has been restored');
          assert(originalCamera.photo.includes('reference-camera-lens.webp'),
            'Original photographic lens is still visible');
          assert(glassSkin.actionBackground.includes('linear-gradient'), 'Existing booking buttons have a gold glass finish');
          const crystalFinish = await page.evaluate(() => {
            const card = document.querySelector('#services .card');
            const inner = card.querySelector('div:last-child');
            const section = document.querySelector('#services');
            const styles = {
              card: getComputedStyle(card),
              inner: getComputedStyle(inner),
              aurora: getComputedStyle(section, '::after'),
              steps: getComputedStyle(document.querySelector('.steps li')),
              faq: getComputedStyle(document.querySelector('.booking-faq details')),
              contact: getComputedStyle(document.querySelector('.contact-links a'))
            };
            return {
              cardBlur: styles.card.backdropFilter || styles.card.webkitBackdropFilter || '',
              innerBlur: styles.inner.backdropFilter || styles.inner.webkitBackdropFilter || '',
              cardLayers:styles.card.backgroundImage,
              scene:styles.aurora.backgroundImage,
              faqGlass:styles.faq.backgroundImage,
              stepsGlass:styles.steps.backgroundImage,
              contactGlass:styles.contact.backgroundImage
            };
          });
          assert(crystalFinish.cardBlur.includes('blur(') && crystalFinish.innerBlur.includes('blur('),
            'Crystal cards and inner card panels both refract the background');
          assert(crystalFinish.cardLayers.includes('rgba('),
            'Main card is built from translucent glass layers');
          const compactGlass = await page.locator('#services .card').first().evaluate(el => {
            const panel = el.querySelector(':scope > div:last-child');
            const art = el.querySelector(':scope > .art');
            const cardRect = el.getBoundingClientRect();
            const panelRect = panel.getBoundingClientRect();
            const artRect = art.getBoundingClientRect();
            const buttonRect = el.querySelector('a[data-service]').getBoundingClientRect();
            const panelStyle = getComputedStyle(panel);
            return { cardWidth:cardRect.width, panelWidth:panelRect.width,
              panelInside:panelRect.left>=cardRect.left-2 && panelRect.right<=cardRect.right+2,
              artWidth:artRect.width, buttonHeight:buttonRect.height,
              background:panelStyle.backgroundImage,
              blur:panelStyle.backdropFilter || panelStyle.webkitBackdropFilter || '' };
          });
          assert(compactGlass.panelInside && compactGlass.panelWidth < compactGlass.cardWidth * .96,
            'Small inner glass is narrower than the unchanged outer card');
          assert(compactGlass.artWidth <= 93, 'Service illustration is no larger than 92px');
          assert(compactGlass.blur.includes('blur(') && compactGlass.background.includes('rgba('),
            'Compact service panel is translucent layered crystal');
          assert(compactGlass.buttonHeight >= 43, 'Smaller glass keeps the booking action accessible');
          assert(crystalFinish.scene.includes('radial-gradient'),
            'Emerald and gold cinematic background is present behind cards');
          assert(crystalFinish.stepsGlass.includes('linear-gradient') &&
            crystalFinish.faqGlass.includes('linear-gradient') &&
            crystalFinish.contactGlass.includes('linear-gradient'),
            'Booking steps, FAQs and contact continue the same glass design');
          await page.locator('#services').screenshot({
            path: path.join(output, lang + '-' + label + '-crystal-services.png'),
            animations:'disabled'
          });
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
          // The last click listener runs in the SAME event dispatch, after
          // the site's capture listener. If it is already open here, no timer,
          // animation, idle task or network load can delay the visual response.
          await service.evaluate(el => {
            el.addEventListener('click', () => {
              const dialog = document.getElementById('direct-booking');
              const panel = getComputedStyle(dialog);
              const button = getComputedStyle(el);
              window.__hamdiZeroWaitBooking = {
                open:dialog.open,
                visible:panel.display !== 'none',
                loading:dialog.hasAttribute('data-loading'),
                buttonTransition:button.transitionDuration
              };
            }, {once:true});
          });
          await service.click();
          const instant = await page.evaluate(() => window.__hamdiZeroWaitBooking);
          assert(instant?.open && instant.visible,
            'Booking must open synchronously within the card click, no wait');
          assert(instant.loading, 'Remote form loads only after immediate modal display');
          assert(instant.buttonTransition.split(',').every(t => parseFloat(t) === 0),
            'Service card button has no transition or animation delay');
          assert.equal(await page.locator('#direct-booking').evaluate(el => el.open), true, 'Booking modal opens');
          const naturalBooking = await page.locator('#direct-booking').evaluate(el => {
            const st = getComputedStyle(el);
            return {clip:st.clipPath,opacity:st.opacity,transition:st.transitionDuration};
          });
          assert(naturalBooking.clip === 'none', 'Booking opens naturally without vortex mask');
          assert(Number(naturalBooking.opacity) >= .99, 'Booking remains readable');
          assert(naturalBooking.transition === '0s', 'No black-hole transition on booking');
          const bookingLook = await page.locator('#direct-booking').evaluate(el => {
            const panel = getComputedStyle(el);
            const bar = el.querySelector('.direct-booking-bar');
            const close = el.querySelector('#direct-booking-close');
            return {background:panel.backgroundImage,borderRadius:panel.borderTopLeftRadius,
              backdrop:panel.backdropFilter || panel.webkitBackdropFilter || '',
              logo:Boolean(bar.querySelector('.booking-glass-emblem')),
              closeHeight:close.getBoundingClientRect().height,
              panelWidth:el.getBoundingClientRect().width,
              vw:window.innerWidth};
          });
          assert(bookingLook.background.includes('linear-gradient'), 'Booking panel has emerald crystal finish');
          assert(bookingLook.logo, 'Luxury booking header contains a camera emblem');
          assert(bookingLook.closeHeight >= 43, 'Close booking control stays touch-friendly');
          assert(bookingLook.panelWidth <= bookingLook.vw + 2, 'Booking never spills off browser viewport');
          const fullBooking = await page.locator('#direct-booking').evaluate(el => {
            const b = el.getBoundingClientRect();
            const frame = el.querySelector('#direct-booking-frame');
            const header = el.querySelector('.direct-booking-bar').getBoundingClientRect();
            return {left:b.left,top:b.top,width:b.width,height:b.height,
              vw:innerWidth,vh:innerHeight,headerWidth:header.width,
              iframeWidth:frame.getBoundingClientRect().width,
              closeVisible:el.querySelector('#direct-booking-close').getBoundingClientRect().width > 30};
          });
          assert(fullBooking.width <= 510 && fullBooking.width <= fullBooking.vw - 20,
            'Booking is compact with margins on both sides');
          assert(fullBooking.height <= 705 && fullBooking.height < fullBooking.vh * .85,
            'Booking is smaller than the browser height');
          assert(Math.abs(fullBooking.left - (fullBooking.vw-fullBooking.width)/2) <= 3,
            'Compact booking is horizontally centered');
          assert(Math.abs(fullBooking.top - (fullBooking.vh-fullBooking.height)/2) <= 3,
            'Compact booking is vertically centered');
          assert(Math.abs(fullBooking.headerWidth - fullBooking.width) <= 2,
            'Booking header matches compact panel width');
          assert(fullBooking.closeVisible, 'Close button remains available in compact booking');
          assert(bookingLook.backdrop.includes('blur('), 'Luxury booking panel is translucent');
          if (lang === 'ar' && label === 'desktop') {
            await page.waitForFunction(
              () => !document.getElementById('direct-booking')?.hasAttribute('data-loading'),
              undefined, { timeout: 7500 }).catch(() => {});
            const detail = await page.locator('#direct-booking').evaluate(el => ({
              stillLoading:el.hasAttribute('data-loading'),
              frameHidden:el.querySelector('#direct-booking-frame').hidden,
              iframeUrl:el.querySelector('#direct-booking-frame').src
            }));
            console.log('Booking iframe diagnostic (no form submission):', JSON.stringify(detail));
          }
          await page.waitForTimeout(700); // preserve a realistic booking overlay screenshot
          await page.screenshot({
            path: path.join(output, lang + '-' + label + '-booking.png'),
            animations: 'disabled'
          });
          await page.locator('#direct-booking-close').click();
          assert.equal(await page.locator('#direct-booking').evaluate(el => el.open), false, 'Booking closes');
          const closedLook = await page.locator('#direct-booking').evaluate(el => ({
            open:el.open, display:getComputedStyle(el).display
          }));
          assert(!closedLook.open && closedLook.display === 'none',
            'Booking closes immediately without lingering vortex animation');
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
      await reduced.waitForFunction(() => !document.getElementById('hamdi-entry')?.open, undefined, {timeout:10000});
      await reduced.locator('.card a[data-service]').first().click();
      assert.equal(await reduced.locator('#direct-booking').evaluate(el => el.open),true,'Reduced-motion booking opens');
      const saferPortal = await reduced.locator('#direct-booking').evaluate(el => {
        const st=getComputedStyle(el);
        return {mask:st.clipPath,animation:st.animationName,transition:st.transitionDuration};
      });
      assert.equal(saferPortal.mask,'none','Reduced motion keeps booking free of vortex mask');
      await reduced.locator('#direct-booking-close').click();
      assert.equal(await reduced.locator('#direct-booking').evaluate(el => el.open),false,'Reduced-motion booking closes');
      console.log('PASS reduced-motion preference');
    } finally { await reduced.close(); }
  } finally { await browser.close(); }
}

run().catch(err => { console.error(err); process.exitCode = 1; });
