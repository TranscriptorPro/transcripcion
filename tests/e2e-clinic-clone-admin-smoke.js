const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_URL = process.env.APP_URL || 'https://transcriptorpro.github.io/transcripcion/';
const CLONE_ID = process.env.CLINIC_CLONE_ID || 'MEDMN62S30P';
const ADMIN_PASS = process.env.CLINIC_ADMIN_PASS || 'clinica';
const OUT_DIR = path.join(__dirname, '..', 'accesorios', 'logs', 'clinic-clone-smoke');

fs.mkdirSync(OUT_DIR, { recursive: true });

function stamp() {
    return new Date().toISOString().replace(/[.:]/g, '-');
}

function logPass(name, detail) {
    console.log(`PASS ${name}${detail ? ' -> ' + detail : ''}`);
}

function fail(name, detail) {
    throw new Error(`${name}${detail ? ' -> ' + detail : ''}`);
}

async function clickIfVisible(page, selector) {
    const el = page.locator(selector).first();
    if (await el.count()) {
        if (await el.isVisible().catch(() => false)) {
            await el.click();
            return true;
        }
    }
    return false;
}

async function handleOnboarding(page) {
    const overlay = page.locator('#onboardingOverlay');
    const visible = await overlay.isVisible().catch(() => false);
    if (!visible) return false;

    await clickIfVisible(page, '#onboardingNext1');
    await page.waitForTimeout(250);
    await clickIfVisible(page, '#onboardingNext2');
    await page.waitForTimeout(250);
    await clickIfVisible(page, '#onboardingNext3');
    await page.waitForTimeout(250);

    const acceptTerms = page.locator('#acceptTerms');
    if (await acceptTerms.count()) {
        await acceptTerms.check({ force: true });
    }

    await clickIfVisible(page, '#btnSubmitOnboarding');
    await page.waitForTimeout(1500);
    return true;
}

async function readUiSnapshot(page) {
    return await page.evaluate(() => {
        const styleVisible = (el) => {
            if (!el) return false;
            const cs = getComputedStyle(el);
            return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || '1') > 0;
        };

        const toast = document.getElementById('toast');
        const toastBtn = toast ? toast.querySelector('.toast-action-btn') : null;
        const banner = document.getElementById('apiKeyWarningBanner');
        const auth = document.getElementById('clinicAuthOverlay');
        const admin = document.getElementById('clinicAdminOverlay');
        const assistant = document.getElementById('sessionAssistantOverlay');
        const adminBox = document.getElementById('clinicAdminBox');
        const adminContent = document.getElementById('clinicAdminContent');
        const cards = Array.from(document.querySelectorAll('#caaProList .caa-pro-card'));
        const lastCard = cards[cards.length - 1];

        let panelGeometry = null;
        if (adminBox && adminContent && lastCard) {
            const boxRect = adminBox.getBoundingClientRect();
            const contentRect = adminContent.getBoundingClientRect();
            const cardRect = lastCard.getBoundingClientRect();
            panelGeometry = {
                boxBottom: boxRect.bottom,
                contentBottom: contentRect.bottom,
                lastCardBottom: cardRect.bottom,
                contentScrollHeight: adminContent.scrollHeight,
                contentClientHeight: adminContent.clientHeight,
                contentScrollTop: adminContent.scrollTop
            };
        }

        const clientCfg = (() => {
            try { return JSON.parse(localStorage.getItem('client_config_stored') || '{}'); }
            catch (_) { return {}; }
        })();

        return {
            title: document.title,
            planCode: String(clientCfg.planCode || ''),
            type: String(clientCfg.type || ''),
            onboardingAccepted: localStorage.getItem('onboarding_accepted') === 'true',
            authVisible: styleVisible(auth),
            adminVisible: styleVisible(admin),
            assistantVisible: !!(assistant && assistant.classList.contains('active')),
            bannerVisible: styleVisible(banner),
            bannerText: banner ? banner.innerText.trim() : '',
            toastVisible: !!(toast && toast.classList.contains('show')),
            toastText: toast ? toast.innerText.trim() : '',
            toastAction: toastBtn ? toastBtn.textContent.trim() : '',
            adminCloseTopVisible: styleVisible(document.getElementById('caaPanelCloseTop')),
            adminCloseBottomVisible: styleVisible(document.getElementById('caaPanelClose')),
            adminCards: cards.length,
            adminNames: cards.map((card) => {
                const el = card.querySelector('.caa-pro-name');
                return el ? el.textContent.trim() : '';
            }),
            panelGeometry
        };
    });
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage();
    const ts = stamp();

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            console.log('BROWSER_ERROR', msg.text());
        }
    });

    try {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        const targetUrl = `${APP_URL.replace(/\/$/, '')}/?id=${encodeURIComponent(CLONE_ID)}&smoke=${Date.now()}`;
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        await handleOnboarding(page);
        await page.waitForTimeout(1500);

        let snap = await readUiSnapshot(page);
        if (snap.planCode !== 'clinic') fail('planCode clinic', JSON.stringify({ planCode: snap.planCode, type: snap.type }));
        logPass('planCode clinic', JSON.stringify({ planCode: snap.planCode, type: snap.type }));

        if (snap.bannerVisible) fail('banner api key oculto', snap.bannerText || 'visible');
        logPass('banner api key oculto');

        if (snap.toastVisible && /api key|configurar/i.test(`${snap.toastText} ${snap.toastAction}`)) {
            fail('toast api key oculto', `${snap.toastText} | ${snap.toastAction}`);
        }
        logPass('toast api key oculto');

        if (!snap.authVisible) fail('modal clinic auth visible', 'no se ve antes del login');
        logPass('modal clinic auth visible');

        await page.fill('#clinicAuthPin', ADMIN_PASS);
        await page.click('#clinicAuthEnterBtn');
        await page.waitForTimeout(2500);

        snap = await readUiSnapshot(page);

        if (!snap.adminVisible) fail('panel admin visible tras login', JSON.stringify(snap));
        logPass('panel admin visible tras login');

        if (snap.assistantVisible) fail('session assistant oculto para admin', 'sigue activo');
        logPass('session assistant oculto para admin');

        if (snap.authVisible) fail('modal clinic auth cerrado tras login admin', 'sigue visible');
        logPass('modal clinic auth cerrado tras login admin');

        if (snap.adminCards < 4) fail('panel admin lista 4 profesionales', JSON.stringify(snap.adminNames));
        logPass('panel admin lista 4 profesionales', snap.adminNames.join(' | '));

        if (!snap.adminCloseTopVisible || !snap.adminCloseBottomVisible) {
            fail('botones de cierre visibles', JSON.stringify({ top: snap.adminCloseTopVisible, bottom: snap.adminCloseBottomVisible }));
        }
        logPass('botones de cierre visibles');

        await page.evaluate(() => {
            const content = document.getElementById('clinicAdminContent');
            if (content) content.scrollTop = content.scrollHeight;
        });
        await page.waitForTimeout(300);

        snap = await readUiSnapshot(page);
        if (snap.panelGeometry) {
            const geom = snap.panelGeometry;
            if (geom.contentScrollHeight > geom.contentClientHeight && geom.lastCardBottom > geom.contentBottom + 8) {
                fail('ultimo card contenido dentro del scroll', JSON.stringify(geom));
            }
            logPass('ultimo card contenido dentro del scroll', JSON.stringify(geom));
        }

        await page.screenshot({ path: path.join(OUT_DIR, `clinic-admin-open-${ts}.png`), fullPage: false });
        await page.click('#caaPanelCloseTop');
        await page.waitForTimeout(400);

        snap = await readUiSnapshot(page);
        if (snap.adminVisible) fail('panel admin cierra correctamente', 'sigue visible');
        logPass('panel admin cierra correctamente');

        await page.screenshot({ path: path.join(OUT_DIR, `clinic-admin-closed-${ts}.png`), fullPage: false });
        console.log('OK smoke completado');
    } finally {
        await context.close();
        await browser.close();
    }
}

run().catch((err) => {
    console.error('SMOKE_FAIL', err.message);
    process.exit(1);
});