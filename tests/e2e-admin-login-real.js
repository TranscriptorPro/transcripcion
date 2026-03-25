'use strict';

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log('[BROWSER]', msg.type(), msg.text());
    }
  });
  page.on('request', req => {
    if (req.url().includes('script.google.com')) {
      console.log('[REQ]', req.method(), req.url());
    }
  });
  page.on('response', async res => {
    if (res.url().includes('script.google.com')) {
      let body = '';
      try { body = await res.text(); } catch (_) {}
      console.log('[RES]', res.status(), res.url(), body.slice(0, 300));
    }
  });
  page.on('requestfailed', req => {
    if (req.url().includes('script.google.com')) {
      console.log('[REQ FAILED]', req.method(), req.url(), req.failure()?.errorText || 'unknown');
    }
  });

  try {
    await page.goto('https://transcriptorpro.github.io/transcripcion/recursos/login.html?_t=' + Date.now(), {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin2026');
    await page.click('#btnLogin');

    await page.waitForTimeout(7000);

    console.log('URL_FINAL=' + page.url());
    const session = await page.evaluate(() => sessionStorage.getItem('adminSession'));
    console.log('SESSION_PRESENT=' + !!session);
    const body = await page.locator('body').innerText().catch(() => '');
    console.log('BODY_EXCERPT=' + body.slice(0, 500));

    await page.screenshot({ path: 'accesorios/reportes/admin-login-real-check.png', fullPage: true });

    await page.waitForTimeout(15000);
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
