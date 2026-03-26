'use strict';

/**
 * e2e-p4-trial-expired-renewal.js
 * ============================================================================
 * Circuito E2E P4 — TRIAL vencida → degradación en app → renovación → PRO activo.
 *
 * FASES:
 *   1. Admin login
 *   2. Crear usuario TRIAL directamente vía admin_create_user
 *      con Fecha_Vencimiento = ayer (trial ya vencida)
 *   3. Clone Factory → generar link con CLIENT_CONFIG type=TRIAL
 *   4. Abrir clone → licenseManager llama validate → backend devuelve EXPIRED
 *      → licenseManager degrada CLIENT_CONFIG a NORMAL (type=NORMAL, hasProMode=false)
 *      → toast "Tu período de prueba finalizó" visible
 *   5. Verificar degradación en window.CLIENT_CONFIG
 *   6. Admin activa PRO (admin_update_user: Plan=pro, Estado=active, Fecha_Vencimiento=+1yr)
 *   7. Regenerar clone link (datos frescos del backend)
 *   8. Abrir nuevo clone → validate devuelve OK con plan=pro → CLIENT_CONFIG.hasProMode=true
 *   9. Screenshots + report JSON
 *
 * Uso (ventana visible):
 *   node tests/e2e-p4-trial-expired-renewal.js
 *
 * Uso headless (CI):
 *   $env:HEADLESS='1'; node tests/e2e-p4-trial-expired-renewal.js
 * ============================================================================
 */

process.on('unhandledRejection', err => {
    console.error('[P4][Unhandled]', err && err.stack ? err.stack : err);
    process.exit(1);
});
process.on('uncaughtException', err => {
    console.error('[P4][Uncaught]', err && err.stack ? err.stack : err);
    process.exit(1);
});

const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ── URLs ─────────────────────────────────────────────────────────────────────
const BASE_URL   = 'https://transcriptorpro.github.io/transcripcion';
const LOGIN_URL  = BASE_URL + '/recursos/login.html';
const GAS_URL    = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin2026';
const HEADLESS   = process.env.HEADLESS === '1';
const SLOWMO     = HEADLESS ? 0 : 480;

const ADMIN_GROQ_KEYS = {
    primary: 'gsk_test_primary_p4_placeholder',
    b1:      'gsk_test_backup1_p4_placeholder',
    b2:      'gsk_test_backup2_p4_placeholder'
};

// ── Usuario de prueba (TRIAL ya vencida) ──────────────────────────────────────
const SUFFIX = Date.now().toString(36).toUpperCase();
// Fecha de vencimiento = ayer
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const EXPIRED_DATE = yesterday.toISOString().split('T')[0];

const TRIAL_USER = {
    ID_Medico:  'TRIALDR_TEST_P4_' + SUFFIX,
    Nombre:     'Dr. E2E P4-Trial ' + SUFFIX,
    Email:      'e2e.p4.' + SUFFIX.toLowerCase() + '@testpro.demo',
    Matricula:  'MN-P4-' + SUFFIX.slice(-6),
    Telefono:   '+54 11 9400 00' + String(Math.floor(Math.random() * 90 + 10)),
    Especialidad: 'Cardiología',
    Plan:       'trial',
    Estado:     'trial',
    Fecha_Registro:    new Date().toISOString().split('T')[0],
    Fecha_Vencimiento: EXPIRED_DATE,   // ← ya vencida: ayer
    Devices_Max:       3,
    Usage_Count:       0,
    Notas_Admin:       'Trial expirado — creado por E2E P4 para prueba de degradación'
};

// ── Report dir ────────────────────────────────────────────────────────────────
const REPORT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes', 'e2e-p4-trial-' + Date.now());
fs.mkdirSync(REPORT_DIR, { recursive: true });

let shotCounter = 0;
function log(msg) { console.log(msg); }

async function shot(page, name) {
    shotCounter += 1;
    const file = path.join(REPORT_DIR, String(shotCounter).padStart(2, '0') + '_' + name + '.png');
    await page.screenshot({ path: file, fullPage: true }).catch(() => {});
    log('[SHOT] ' + path.basename(file));
}

async function fetchJson(url) {
    const res = await fetch(url);
    const text = await res.text();
    try { return JSON.parse(text); } catch (_) {
        throw new Error('JSON inválido: ' + text.slice(0, 300));
    }
}

function qAuth(session) {
    return 'sessionToken=' + encodeURIComponent(session.sessionToken)
        + '&sessionUser=' + encodeURIComponent(session.username)
        + '&sessionNivel=' + encodeURIComponent(session.nivel)
        + '&sessionExpiry=' + encodeURIComponent(session.tokenExpiry);
}

async function loginAdmin(page) {
    await page.goto(LOGIN_URL + '?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.fill('#username', ADMIN_USER);
    await page.fill('#password', ADMIN_PASS);
    await shot(page, '01_login');
    await page.click('#btnLogin');
    await page.waitForURL(/recursos\/admin\.html/, { timeout: 30000 });
    await page.waitForTimeout(5000);
    await shot(page, '02_admin_open');
}

async function getAdminSession(page) {
    const raw = await page.evaluate(() => sessionStorage.getItem('adminSession'));
    if (!raw) throw new Error('Sin adminSession tras login');
    return JSON.parse(raw);
}

async function adminCreateUser(session, userData) {
    const updatesJson = encodeURIComponent(JSON.stringify(userData));
    return fetchJson(
        GAS_URL + '?action=admin_create_user&updates=' + updatesJson + '&' + qAuth(session)
    );
}

async function adminUpdateUser(session, userId, updates) {
    const updatesJson = encodeURIComponent(JSON.stringify(updates));
    return fetchJson(
        GAS_URL + '?action=admin_update_user&userId=' + encodeURIComponent(userId)
        + '&updates=' + updatesJson + '&' + qAuth(session)
    );
}

async function closeDashModal(page) {
    const vis = await page.locator('#dashModalOverlay').isVisible().catch(() => false);
    if (!vis) return;
    await page.evaluate(() => {
        const a = document.getElementById('dashModalActions');
        const b = a ? a.querySelector('button') : null;
        if (b) { b.click(); return; }
        const c = document.getElementById('dashModalCloseBtn');
        if (c) c.click();
    }).catch(() => {});
    await page.waitForTimeout(1200);
}

async function generateCloneLink(adminPage, userId) {
    await adminPage.click('.tab-btn[data-tab="usuarios"]').catch(() => {});
    await adminPage.waitForTimeout(1200);
    await adminPage.click('#btnRefresh').catch(() => {});
    await adminPage.waitForTimeout(3000);

    await adminPage.evaluate((uid) => {
        if (typeof openCloneFactory === 'function') openCloneFactory(uid);
    }, userId);
    await adminPage.waitForTimeout(2500);
    await closeDashModal(adminPage);

    let cfVisible = await adminPage.locator('#cloneFactoryModal').isVisible().catch(() => false);
    if (!cfVisible) {
        await adminPage.evaluate((uid) => {
            if (typeof openCloneFactory === 'function') openCloneFactory(uid);
        }, userId);
        await adminPage.waitForTimeout(2500);
        await closeDashModal(adminPage);
    }

    await adminPage.evaluate(() => {
        const btn = document.getElementById('cfBtnGenerate');
        if (btn) btn.click();
    });
    await adminPage.waitForTimeout(6000);

    const link = await adminPage.locator('#cfLinkUrl').inputValue().catch(() => '');
    if (!link.includes('?id=')) throw new Error('Clone Factory no generó link con ?id=');
    return link;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
(async () => {
    const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOWMO });
    const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });

    const adminPage = await context.newPage();
    adminPage.on('console', msg => {
        if (msg.type() === 'error') log('[ADMIN][err] ' + msg.text());
    });

    try {
        // ── FASE 1: Login admin ───────────────────────────────────────────────
        log('\n[FASE 1] Login admin');
        await loginAdmin(adminPage);
        const session = await getAdminSession(adminPage);
        await adminPage.evaluate((keys) => {
            localStorage.setItem('admin_groq_key',    keys.primary);
            localStorage.setItem('admin_groq_key_b1', keys.b1);
            localStorage.setItem('admin_groq_key_b2', keys.b2);
        }, ADMIN_GROQ_KEYS);
        log('[OK] Admin logueado');

        // ── FASE 2: Crear usuario TRIAL con fecha ya vencida ──────────────────
        log('\n[FASE 2] Crear usuario TRIAL con Fecha_Vencimiento=' + EXPIRED_DATE + ' (ayer)');
        const createResult = await adminCreateUser(session, TRIAL_USER);
        if (!createResult.success) {
            throw new Error('admin_create_user falló: ' + JSON.stringify(createResult));
        }
        log('[OK] Usuario TRIAL creado: ' + TRIAL_USER.ID_Medico);

        // Verificar vía validate que el backend ya reporta EXPIRED
        const validateExpired = await fetchJson(
            GAS_URL + '?action=validate&id=' + encodeURIComponent(TRIAL_USER.ID_Medico) + '&deviceId=e2e_p4_check_' + Date.now()
        );
        log('[DEBUG] validate inicial: ' + JSON.stringify(validateExpired).slice(0, 300));
        if (validateExpired.code !== 'EXPIRED') {
            throw new Error('Backend debería devolver EXPIRED inmediatamente, recibido: code=' + validateExpired.code + ' error=' + validateExpired.error);
        }
        log('[OK] Backend confirma: code=EXPIRED, plan=' + validateExpired.plan);

        // ── FASE 3: Clone Factory → generar link ──────────────────────────────
        log('\n[FASE 3] Generar clone link para usuario TRIAL expirado');
        const cloneLinkExpired = await generateCloneLink(adminPage, TRIAL_USER.ID_Medico);
        await shot(adminPage, '03_clone_factory_trial');
        log('[OK] Clone link trial: ' + cloneLinkExpired);

        // ── FASE 4: Abrir clone → verificar degradación ───────────────────────
        log('\n[FASE 4] Abrir clone — esperar degradación a NORMAL');
        const clonePageExpired = await context.newPage();
        clonePageExpired.on('console', msg => {
            const text = msg.text();
            // Log mensajes relevantes del licenseManager
            if (/licenseManager|EXPIRED|degradado|trial/i.test(text) || msg.type() === 'error') {
                log('[CLONE][console] ' + msg.type() + ': ' + text.slice(0, 200));
            }
        });

        // Capturar toasts (el DOM puede cambiar rápido)
        let toastTexts = [];
        clonePageExpired.on('response', () => {}); // mantener page activa

        await clonePageExpired.goto(cloneLinkExpired + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });

        // Esperar a que licenseManager ejecute su validate
        await clonePageExpired.waitForTimeout(12000);
        await shot(clonePageExpired, '04_clone_trial_loaded');

        // Capturar texto visible de toast (si existe)
        const toastEl = await clonePageExpired.locator('.toast, .toast-msg, [class*="toast"], [id*="toast"]').first();
        const toastText = await toastEl.innerText().catch(() => '');
        if (toastText) log('[INFO] Toast visible: "' + toastText.slice(0, 150) + '"');

        // Verificar degradación en window.CLIENT_CONFIG
        const cfgAfterLoad = await clonePageExpired.evaluate(() => ({
            type:       window.CLIENT_CONFIG ? window.CLIENT_CONFIG.type : 'N/A',
            hasProMode: window.CLIENT_CONFIG ? window.CLIENT_CONFIG.hasProMode : 'N/A',
            maxDevices: window.CLIENT_CONFIG ? window.CLIENT_CONFIG.maxDevices : 'N/A',
            planCode:   window.CLIENT_CONFIG ? (window.CLIENT_CONFIG.planCode || window.CLIENT_CONFIG.plan || '') : 'N/A'
        }));
        log('[DEBUG] CLIENT_CONFIG tras carga con trial expirado: ' + JSON.stringify(cfgAfterLoad));

        // El licenseManager degrada a NORMAL si plan=trial + EXPIRED
        const typeAfterLoad = String(cfgAfterLoad.type || '').toUpperCase();
        if (typeAfterLoad !== 'NORMAL') {
            throw new Error('Degradación no ocurrió: CLIENT_CONFIG.type=' + typeAfterLoad + ' (esperado: NORMAL)');
        }
        if (cfgAfterLoad.hasProMode !== false) {
            throw new Error('Degradación incorrecta: hasProMode=' + cfgAfterLoad.hasProMode + ' (esperado: false)');
        }
        log('[OK] Degradación confirmada: type=NORMAL, hasProMode=false, maxDevices=' + cfgAfterLoad.maxDevices);
        await shot(clonePageExpired, '05_clone_degraded_normal');

        await clonePageExpired.close();

        // ── FASE 5: Admin activa PRO ──────────────────────────────────────────
        log('\n[FASE 5] Admin activa PRO para el usuario trial expirado');
        const renewDate = new Date();
        renewDate.setFullYear(renewDate.getFullYear() + 1);
        const formattedRenew = renewDate.toISOString().split('T')[0];

        const activateResult = await adminUpdateUser(session, TRIAL_USER.ID_Medico, {
            Plan:              'pro',
            Estado:            'active',
            Fecha_Vencimiento: formattedRenew,
            Devices_Max:       3,
            Notas_Admin:       'Renovación PRO — E2E P4 — ' + new Date().toISOString().split('T')[0]
        });
        if (!activateResult.success) {
            throw new Error('Activación PRO falló: ' + JSON.stringify(activateResult));
        }
        log('[OK] PRO activado. Fecha_Vencimiento=' + formattedRenew);

        // Verificar en backend
        await new Promise(r => setTimeout(r, 2000));
        const validateRenewed = await fetchJson(
            GAS_URL + '?action=validate&id=' + encodeURIComponent(TRIAL_USER.ID_Medico) + '&deviceId=e2e_p4_check2_' + Date.now()
        );
        log('[DEBUG] validate tras renovación: ' + JSON.stringify(validateRenewed).slice(0, 300));
        if (validateRenewed.error) {
            throw new Error('validate tras renovación tiene error: ' + validateRenewed.error + ' code=' + validateRenewed.code);
        }
        const planRenewed = String(validateRenewed.Plan || validateRenewed.plan || '').toLowerCase();
        if (planRenewed !== 'pro') {
            throw new Error('Backend no refleja plan=pro tras renovación, recibido: ' + planRenewed);
        }
        log('[OK] Backend confirma renovación: plan=pro, estado=' + validateRenewed.Estado);

        // ── FASE 6: Abrir clone renovado → verificar PRO ──────────────────────
        log('\n[FASE 6] Abrir clone con trial renovada → verificar PRO');
        await adminPage.click('#btnRefresh').catch(() => {});
        await adminPage.waitForTimeout(3000);

        const cloneLinkRenewed = await generateCloneLink(adminPage, TRIAL_USER.ID_Medico);
        await shot(adminPage, '06_clone_factory_renewed');
        log('[OK] Nuevo clone PRO: ' + cloneLinkRenewed);

        const clonePageRenewed = await context.newPage();
        clonePageRenewed.on('console', msg => {
            const text = msg.text();
            if (/licenseManager|EXPIRED|degradado|pro|trial/i.test(text) || msg.type() === 'error') {
                log('[CLONE-PRO][console] ' + msg.type() + ': ' + text.slice(0, 200));
            }
        });
        await clonePageRenewed.goto(cloneLinkRenewed + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
        await clonePageRenewed.waitForTimeout(10000);
        await shot(clonePageRenewed, '07_clone_renewed_loaded');

        const cfgRenewed = await clonePageRenewed.evaluate(() => ({
            type:       window.CLIENT_CONFIG ? window.CLIENT_CONFIG.type : 'N/A',
            hasProMode: window.CLIENT_CONFIG ? window.CLIENT_CONFIG.hasProMode : 'N/A',
            hasDashboard: window.CLIENT_CONFIG ? window.CLIENT_CONFIG.hasDashboard : 'N/A',
            planCode:   window.CLIENT_CONFIG ? (window.CLIENT_CONFIG.planCode || window.CLIENT_CONFIG.plan || '') : 'N/A'
        }));
        log('[DEBUG] CLIENT_CONFIG tras renovación: ' + JSON.stringify(cfgRenewed));

        const typeRenewed = String(cfgRenewed.type || cfgRenewed.planCode || '').toLowerCase();
        if (typeRenewed !== 'pro') {
            throw new Error('Renovación no activa PRO: type=' + cfgRenewed.type + ' planCode=' + cfgRenewed.planCode + ' (esperado: pro)');
        }
        if (!cfgRenewed.hasProMode) {
            throw new Error('Renovación PRO: hasProMode debe ser true, recibido: ' + cfgRenewed.hasProMode);
        }
        log('[OK] Renovación verificada: type=PRO, hasProMode=true, hasDashboard=' + cfgRenewed.hasDashboard);
        await shot(clonePageRenewed, '08_final_pro_state');

        fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify({
            ok: true,
            medicoId:         TRIAL_USER.ID_Medico,
            expiredDate:      EXPIRED_DATE,
            renewDate:        formattedRenew,
            cloneLinkExpired,
            cloneLinkRenewed,
            cfgAfterExpiry:   cfgAfterLoad,
            cfgAfterRenewal:  cfgRenewed,
            validateExpired,
            validateRenewed
        }, null, 2));

        log('\n[SUCCESS] ✅ P4 — TRIAL expirada → degradación → renovación PRO completado');

    } catch (err) {
        const errMsg = err && err.stack ? err.stack : String(err);
        fs.writeFileSync(path.join(REPORT_DIR, 'error.txt'), errMsg);
        console.error('\n[FAIL] ❌', errMsg);
        process.exitCode = 1;
    } finally {
        await context.close().catch(() => {});
        await browser.close().catch(() => {});
        log('[REPORT] Evidencia en: ' + REPORT_DIR);
    }
})();
