import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('qa-screenshots',{recursive:true});
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  for (const [label, viewport] of [['phone',{width:375,height:812}], ['desktop',{width:1280,height:900}]]) {
    const page = await browser.newPage({viewport,reducedMotion:'no-preference'});
    try {
      await page.goto('http://127.0.0.1:8090/hamdi-ai/assistant.html?embed=1&lang=ar&parentOrigin=http%3A%2F%2F127.0.0.1%3A8090', {waitUntil:'domcontentloaded'});
      const state = await page.evaluate(() => {
        document.documentElement.dataset.floatingNur='true';
        document.documentElement.dataset.consultation='true';
        const proj = document.querySelector('.tau-projection');
        const art = document.querySelector('.tau-projection-art');
        const dlg = document.querySelector('#voice-dialog');
        const circle = getComputedStyle(proj,'::before').content;
        const circleAfter = getComputedStyle(proj,'::after').content;
        const other = getComputedStyle(document.querySelector('.orb-scene'),'::before').content;
        const figureAnimation = getComputedStyle(art).animationName;
        if (!dlg.open) dlg.showModal();
        const glass = getComputedStyle(dlg).backgroundColor;
        const scrim = getComputedStyle(dlg,'::backdrop').backgroundColor;
        return {circle,circleAfter,other,figureAnimation,glass,scrim};
      });
      assert.equal(state.circle,'none','Gold wheel before image must be absent');
      assert.equal(state.circleAfter,'none','Gold wheel over image must be absent');
      assert.equal(state.other,'none','Orb pseudo-circle must be absent');
      assert(state.figureAnimation.includes('nur-figure-float'),'Nur figure should move');
      assert(state.glass.includes('rgba('),'Consent must be translucent, not white');
      assert.equal(state.scrim,'rgba(0, 0, 0, 0)','Consent backdrop should be transparent');
      await page.screenshot({path:'qa-screenshots/nur-glass-'+label+'.png',animations:'disabled'});
      await page.locator('#voice-dialog .dialog-close').click();
      await page.screenshot({path:'qa-screenshots/nur-no-ring-'+label+'.png',animations:'disabled'});
      console.log('PASS Nur transparent glass and moving ringless figure',label,JSON.stringify(state));
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
