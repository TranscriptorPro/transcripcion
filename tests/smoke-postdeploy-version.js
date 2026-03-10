/**
 * Smoke postdeploy: verifica carga basica y coherencia de version en entorno desplegado.
 *
 * Uso:
 *   $env:APP_URL='https://transcriptorpro.github.io/transcripcion/'
 *   $env:EXPECTED_APP_VERSION='v58'
 *   node tests/smoke-postdeploy-version.js
 */

const { chromium } = require('playwright');

const APP_URL = process.env.APP_URL || 'https://transcriptorpro.github.io/transcripcion/';
const EXPECTED_APP_VERSION = (process.env.EXPECTED_APP_VERSION || '').trim();

async function run() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
        console.log(`[SMOKE] URL: ${APP_URL}`);
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(1500);

        const runtime = await page.evaluate(() => {
            const title = document.title || '';
            const appVersion = (window.APP_VERSION || '').toString();
            let storedVersion = '';
            try { storedVersion = localStorage.getItem('app_version') || ''; } catch (_) {}

            return {
                title,
                appVersion,
                storedVersion,
                hasHeader: !!document.querySelector('.header')
            };
        });

        if (!runtime.hasHeader) {
            throw new Error('No se detecto la UI principal (header ausente).');
        }
        if (!runtime.appVersion) {
            throw new Error('window.APP_VERSION no esta definido en runtime.');
        }
        if (EXPECTED_APP_VERSION && runtime.appVersion !== EXPECTED_APP_VERSION) {
            throw new Error(`Version distinta a la esperada. Esperada=${EXPECTED_APP_VERSION}, Runtime=${runtime.appVersion}`);
        }
        if (runtime.storedVersion && runtime.storedVersion !== runtime.appVersion) {
            throw new Error(`Deriva entre localStorage(app_version=${runtime.storedVersion}) y runtime(APP_VERSION=${runtime.appVersion}).`);
        }
        if (consoleErrors.length > 0) {
            throw new Error(`Errores de consola detectados (${consoleErrors.length}).`);
        }

        console.log(`[SMOKE] PASS | APP_VERSION=${runtime.appVersion} | title="${runtime.title}"`);
        await browser.close();
        process.exit(0);
    } catch (err) {
        console.error(`[SMOKE] FAIL | ${err.message}`);
        if (consoleErrors.length > 0) {
            console.error('[SMOKE] Console errors:');
            consoleErrors.forEach((e) => console.error(` - ${e}`));
        }
        await browser.close();
        process.exit(1);
    }
}

run();
