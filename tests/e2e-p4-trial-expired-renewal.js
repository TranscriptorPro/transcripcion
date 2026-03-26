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

// ── Usuario de prueba (TRIAL con vencimiento MAÑANA — válido para primer acceso) ─────
const SUFFIX = Date.now().toString(36).toUpperCase();
// Fecha de vencimiento = MAÑANA (trial válida para el primer acceso)
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const VALID_DATE = tomorrow.toISOString().split('T')[0];
// Fecha de expiración forzada = ayer
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
    Fecha_Vencimiento: VALID_DATE,   // ← Mañana (VÁLIDO para primer acceso)
    Devices_Max:       3,
    Usage_Count:       0,
    Notas_Admin:       'Trial válida mañana — creado por E2E P4 para prueba de degradación'
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
    // Ir a la tab de usuarios y refrescar — esperar suficiente tiempo para GAS
    await adminPage.click('.tab-btn[data-tab="usuarios"]').catch(() => {});
    await adminPage.waitForTimeout(1500);
    await adminPage.click('#btnRefresh').catch(() => {});
    await adminPage.waitForTimeout(8000); // GAS puede tardar en devolver usuarios

    // Reintentar hasta 3 veces la apertura del Clone Factory
    let cfVisible = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
        await closeDashModal(adminPage);
        await adminPage.evaluate((uid) => {
            if (typeof openCloneFactory === 'function') openCloneFactory(uid);
        }, userId);
        await adminPage.waitForTimeout(3000);
        await closeDashModal(adminPage);
        cfVisible = await adminPage.locator('#cloneFactoryModal').isVisible().catch(() => false);
        if (cfVisible) break;
        log('[WARN] openCloneFactory intento ' + attempt + '/3 — modal no visible, reintentando...');
        // Refrescar de nuevo y esperar
        await adminPage.click('#btnRefresh').catch(() => {});
        await adminPage.waitForTimeout(6000);
    }
    if (!cfVisible) throw new Error('Clone Factory modal no se abrió para userId=' + userId);

    await adminPage.evaluate(() => {
        const btn = document.getElementById('cfBtnGenerate');
        if (btn) btn.click();
    });
    await adminPage.waitForTimeout(8000);

    const link = await adminPage.locator('#cfLinkUrl').inputValue().catch(() => '');
    if (!link.includes('?id=')) throw new Error('Clone Factory no generó link con ?id= para userId=' + userId);
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

        // ── FASE 2: Crear usuario TRIAL con fecha VÁLIDA (mañana) ─────────────
        log('\n[FASE 2] Crear usuario TRIAL con Fecha_Vencimiento=' + VALID_DATE + ' (mañana)');
        const createResult = await adminCreateUser(session, TRIAL_USER);
        if (!createResult.success) {
            throw new Error('admin_create_user falló: ' + JSON.stringify(createResult));
        }
        log('[OK] Usuario TRIAL creado: ' + TRIAL_USER.ID_Medico);

        // Verificar que el backend reporta OK (no EXPIRED)
        const validateOk = await fetchJson(
            GAS_URL + '?action=validate&id=' + encodeURIComponent(TRIAL_USER.ID_Medico) + '&deviceId=e2e_p4_firstcheck_' + Date.now()
        );
        log('[DEBUG] validate inicial (espero OK): ' + JSON.stringify(validateOk).slice(0, 200));
        if (validateOk.error) {
            throw new Error('Backend debería devolver OK para trial válida, recibido: error=' + validateOk.error + ' code=' + validateOk.code);
        }
        const planInitial = String(validateOk.Plan || validateOk.plan || '').toLowerCase();
        log('[OK] Backend confirma trial válida: plan=' + planInitial + ' estado=' + validateOk.Estado);

        // ── FASE 3: Clone Factory → generar link ──────────────────────────────
        log('\n[FASE 3] Generar clone link para trial válida');
        const cloneLinkTrial = await generateCloneLink(adminPage, TRIAL_USER.ID_Medico);
        await shot(adminPage, '03_clone_factory_trial');
        log('[OK] Clone trial link: ' + cloneLinkTrial);

        // ── FASE 4: Abrir clone con trial VÁLIDA → setup debe completarse ──────
        log('\n[FASE 4] Abrir clone con trial válida — setup debe completarse');
        const clonePage = await context.newPage();
        clonePage.on('console', msg => {
            const text = msg.text();
            if (/licenseManager|EXPIRED|degradado|trial|TRIAL/i.test(text) || msg.type() === 'error') {
                log('[CLONE][console] ' + msg.type() + ': ' + text.slice(0, 200));
            }
        });

        await clonePage.goto(cloneLinkTrial + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
        await clonePage.waitForTimeout(12000);
        await shot(clonePage, '04_clone_trial_valid_loaded');

        const cfgInitial = await clonePage.evaluate(() => ({
            type:       window.CLIENT_CONFIG ? window.CLIENT_CONFIG.type : 'N/A',
            hasProMode: window.CLIENT_CONFIG ? window.CLIENT_CONFIG.hasProMode : 'N/A',
            medicoId:   window.CLIENT_CONFIG ? window.CLIENT_CONFIG.medicoId : 'N/A',
            planCode:   window.CLIENT_CONFIG ? (window.CLIENT_CONFIG.planCode || '') : 'N/A'
        }));
        log('[DEBUG] CLIENT_CONFIG tras carga con trial válida: ' + JSON.stringify(cfgInitial));

        // Con trial válida, el setup debe completarse (type != ADMIN && medicoId != N/A)
        if (cfgInitial.type === 'ADMIN' || cfgInitial.medicoId === 'N/A') {
            throw new Error('Setup falló con trial válida — CLIENT_CONFIG.type=' + cfgInitial.type + ' medicoId=' + cfgInitial.medicoId);
        }
        log('[OK] Setup con trial válida completado: type=' + cfgInitial.type + ' planCode=' + cfgInitial.planCode);

        // ── FASE 5: Admin expira la trial ─────────────────────────────────────
        log('\n[FASE 5] Admin expira la trial (Fecha_Vencimiento=' + EXPIRED_DATE + ')');
        const expireResult = await adminUpdateUser(session, TRIAL_USER.ID_Medico, {
            Fecha_Vencimiento: EXPIRED_DATE,
            Estado:            'expired',
            Notas_Admin:       'Trial expirada a propósito — E2E P4'
        });
        if (!expireResult.success) {
            throw new Error('admin_update_user (expirar) falló: ' + JSON.stringify(expireResult));
        }
        log('[OK] Trial expirada en backend');

        // Esperar brevemente para que el backend actualice
        await new Promise(r => setTimeout(r, 2000));

        // Confirmar EXPIRED en backend
        const validateExpired = await fetchJson(
            GAS_URL + '?action=validate&id=' + encodeURIComponent(TRIAL_USER.ID_Medico) + '&deviceId=' + encodeURIComponent(TRIAL_USER.ID_Medico + '_p4_expire')
        );
        log('[DEBUG] validate tras expirar: ' + JSON.stringify(validateExpired).slice(0, 200));
        if (validateExpired.code !== 'EXPIRED') {
            throw new Error('Backend debería devolver EXPIRED, recibido: code=' + validateExpired.code);
        }
        log('[OK] Backend confirma: code=EXPIRED');

        // ── FASE 6: Forzar re-validate en la app → degradación ────────────────
        log('\n[FASE 6] Forzar re-validate en la app (limpiar cache + llamar validateLicense)');

        // Limpiar cache de licencia en el browser para forzar nueva call al backend
        await clonePage.evaluate(() => {
            localStorage.removeItem('license_cache');
            if (typeof appDB !== 'undefined') {
                appDB.remove('license_cache').catch(() => {});
            }
        });

        // Llamar validateLicense() — licenseManager recibirá EXPIRED y degradará
        const validateInPage = await clonePage.evaluate(async () => {
            if (typeof window.validateLicense !== 'function') {
                return { error: 'validateLicense no disponible en window' };
            }
            try {
                const result = await window.validateLicense();
                return { done: true, result };
            } catch (e) {
                return { error: String(e && e.message ? e.message : e) };
            }
        });
        log('[DEBUG] validateLicense() en página: ' + JSON.stringify(validateInPage).slice(0, 300));

        await clonePage.waitForTimeout(3000);
        await shot(clonePage, '05_clone_after_expire');

        // ── FASE 7: Verificar degradación ─────────────────────────────────────
        log('\n[FASE 7] Verificar degradación a NORMAL');
        const cfgAfterExpiry = await clonePage.evaluate(() => ({
            type:       window.CLIENT_CONFIG ? window.CLIENT_CONFIG.type : 'N/A',
            hasProMode: window.CLIENT_CONFIG ? window.CLIENT_CONFIG.hasProMode : 'N/A',
            maxDevices: window.CLIENT_CONFIG ? window.CLIENT_CONFIG.maxDevices : 'N/A'
        }));
        log('[DEBUG] CLIENT_CONFIG tras expiración: ' + JSON.stringify(cfgAfterExpiry));

        const typeAfterExpiry = String(cfgAfterExpiry.type || '').toUpperCase();
        if (typeAfterExpiry !== 'NORMAL') {
            throw new Error('Degradación no ocurrió: CLIENT_CONFIG.type=' + typeAfterExpiry + ' (esperado: NORMAL). validateLicense result=' + JSON.stringify(validateInPage).slice(0, 200));
        }
        if (cfgAfterExpiry.hasProMode !== false) {
            throw new Error('Degradación incompleta: hasProMode=' + cfgAfterExpiry.hasProMode + ' (esperado: false)');
        }
        log('[OK] Degradación confirmada: type=NORMAL, hasProMode=false, maxDevices=' + cfgAfterExpiry.maxDevices);
        await shot(clonePage, '06_clone_degraded_normal');

        // ── FASE 8: Admin activa PRO ──────────────────────────────────────────
        log('\n[FASE 8] Admin activa PRO');
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

        await new Promise(r => setTimeout(r, 2000));

        // ── FASE 9: Recargar clone post-renovación → setup fresh → PRO ──────────
        log('\n[FASE 9] Recargar clone post-renovación → setup fresh debe cargar PRO');
        // validateLicense() solo degrada, NO promueve. La renovación requiere recarga
        // de la página para que handleFactorySetupCore corra de nuevo con plan=pro.
        // Esto es el comportamiento real del usuario tras ser renovado.
        await clonePage.goto(cloneLinkTrial + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
        await clonePage.waitForTimeout(12000);
        await shot(clonePage, '07_clone_renewed_pro');

        const cfgRenewed = await clonePage.evaluate(() => ({
            type:         window.CLIENT_CONFIG ? window.CLIENT_CONFIG.type : 'N/A',
            hasProMode:   window.CLIENT_CONFIG ? window.CLIENT_CONFIG.hasProMode : 'N/A',
            hasDashboard: window.CLIENT_CONFIG ? window.CLIENT_CONFIG.hasDashboard : 'N/A',
            planCode:     window.CLIENT_CONFIG ? (window.CLIENT_CONFIG.planCode || '') : 'N/A'
        }));
        log('[DEBUG] CLIENT_CONFIG tras renovación PRO: ' + JSON.stringify(cfgRenewed));

        // Después de renovar a PRO, licenseManager actualiza CLIENT_CONFIG
        const typeRenewed = String(cfgRenewed.type || '').toUpperCase();
        if (typeRenewed !== 'PRO') {
            throw new Error('Renovación no activó PRO: type=' + cfgRenewed.type + ' planCode=' + cfgRenewed.planCode + ' (esperado: PRO)');
        }
        if (!cfgRenewed.hasProMode) {
            throw new Error('Renovación PRO: hasProMode debe ser true tras activación, recibido: ' + cfgRenewed.hasProMode);
        }
        log('[OK] Renovación PRO verificada: type=PRO, hasProMode=true, hasDashboard=' + cfgRenewed.hasDashboard);
        await shot(clonePage, '08_final_pro_state');

        fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify({
            ok: true,
            medicoId:         TRIAL_USER.ID_Medico,
            validDate:        VALID_DATE,
            expiredDate:      EXPIRED_DATE,
            renewDate:        formattedRenew,
            cfgInitial,
            cfgAfterExpiry,
            validateExpired,
            cfgRenewed
        }, null, 2));

        log('\n[SUCCESS] ✅ P4 — TRIAL expirada → degradación NORMAL → renovación PRO completado');

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
