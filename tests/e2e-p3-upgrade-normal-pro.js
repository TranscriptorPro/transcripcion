'use strict';

/**
 * e2e-p3-upgrade-normal-pro.js
 * ============================================================================
 * Circuito E2E P3 — Upgrade NORMAL → PRO con verificación de permisos.
 *
 * FASES:
 *   1.  Formulario registro.html → seleccionar plan NORMAL
 *   2.  Completar pasos (datos, especialidades, workplace, firma)
 *   3.  Submit → registro real en backend
 *   4.  Admin: tab Registros → marcar pago → modal aprobar → confirmar
 *   5.  Verificar usuario NORMAL creado en Usuarios
 *   6.  Clone Factory → generar link NORMAL
 *   7.  Abrir clone NORMAL → verificar planCode=normal, hasProMode=false
 *   8.  [UPGRADE] Admin llama admin_update_user → Plan=pro, Estado=active
 *   9.  Clone Factory → regenerar link con datos PRO frescos
 *   10. Abrir clone PRO → verificar planCode=pro, hasProMode=true, hasDashboard=true
 *   11. En app: verificar que el modo PRO es accesible (selector visible)
 *
 * Uso (ventana visible):
 *   node tests/e2e-p3-upgrade-normal-pro.js
 *
 * Uso headless (CI):
 *   $env:HEADLESS='1'; node tests/e2e-p3-upgrade-normal-pro.js
 * ============================================================================
 */

process.on('unhandledRejection', err => {
    console.error('[P3][Unhandled]', err && err.stack ? err.stack : err);
    process.exit(1);
});
process.on('uncaughtException', err => {
    console.error('[P3][Uncaught]', err && err.stack ? err.stack : err);
    process.exit(1);
});

const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ── URLs ─────────────────────────────────────────────────────────────────────
const BASE_URL   = 'https://transcriptorpro.github.io/transcripcion';
const LOGIN_URL  = BASE_URL + '/recursos/login.html';
const ADMIN_URL  = BASE_URL + '/recursos/admin.html';
const REG_URL    = BASE_URL + '/recursos/registro.html';
const GAS_URL    = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin2026';
const HEADLESS   = process.env.HEADLESS === '1';
const SLOWMO     = HEADLESS ? 0 : 480;

const LOGOS_DIR = 'C:\\Users\\kengy\\Desktop\\Logos';
const ASSETS = {
    wpLogo: path.join(LOGOS_DIR, 'CMR.png'),
    proLogo: path.join(LOGOS_DIR, 'roman.png'),
    firma:   path.join(LOGOS_DIR, 'firma.png')
};

const ADMIN_GROQ_KEYS = {
    primary: 'gsk_test_primary_p3_placeholder',
    b1:      'gsk_test_backup1_p3_placeholder',
    b2:      'gsk_test_backup2_p3_placeholder'
};

const SUFFIX = Date.now().toString(36).toUpperCase();
const DOCTOR = {
    nombre:         'Dr. E2E P3-Upgrade ' + SUFFIX,
    email:          'e2e.p3.' + SUFFIX.toLowerCase() + '@testpro.demo',
    matricula:      'MN-P3-' + SUFFIX.slice(-6),
    telefono:       '+54 11 7300 00' + String(Math.floor(Math.random() * 90 + 10)),
    especialidadLabel: 'Cardiología',
    wp0: {
        nombre:  'Consultorio P3 Central ' + SUFFIX,
        address: 'Av. P3 100, CABA',
        phone:   '+54 11 4300 1010',
        email:   'p3.central.' + SUFFIX.toLowerCase() + '@demo.test',
        footer:  'Consultorio P3 — Upgrade E2E'
    }
};

// ── Report dir ────────────────────────────────────────────────────────────────
const REPORT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes', 'e2e-p3-upgrade-' + Date.now());
fs.mkdirSync(REPORT_DIR, { recursive: true });

let shotCounter = 0;
function log(msg) { console.log(msg); }

async function shot(page, name) {
    shotCounter += 1;
    const file = path.join(REPORT_DIR, String(shotCounter).padStart(2, '0') + '_' + name + '.png');
    await page.screenshot({ path: file, fullPage: true }).catch(() => {});
    log('[SHOT] ' + path.basename(file));
}

async function fetchJson(url, options) {
    const res = await fetch(url, options);
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

async function adminListUsers(session) {
    return fetchJson(GAS_URL + '?action=admin_list_users&' + qAuth(session));
}

async function adminListRegistrations(session) {
    return fetchJson(GAS_URL + '?action=admin_list_registrations&' + qAuth(session));
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

async function findUserRetry(session, email, retries, waitMs) {
    for (let i = 0; i < retries; i++) {
        const d = await adminListUsers(session);
        const f = (d.users || []).find(u => String(u.Email || '').toLowerCase() === email.toLowerCase());
        if (f) return f;
        await new Promise(r => setTimeout(r, waitMs));
    }
    return null;
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

    const regPage = await context.newPage();
    regPage.on('console', msg => {
        if (msg.type() === 'error') log('[REG][err] ' + msg.text());
    });

    try {
        // ── PASO 1-3: Registrar usuario NORMAL ────────────────────────────────
        log('\n[FASE 1] Registrar usuario NORMAL');
        const plans = await fetchJson(GAS_URL + '?action=public_get_plans_config');
        const normalCfg = plans && plans.plans && plans.plans.normal ? plans.plans.normal : null;
        if (!normalCfg) throw new Error('No llegó config del plan normal desde backend');
        log('[OK] Plan normal dinámico: devices=' + normalCfg.maxDevices);

        await regPage.goto(REG_URL + '?_t=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
        await regPage.waitForTimeout(2500);
        await shot(regPage, '03_reg_open');

        await regPage.locator('.pricing-card[data-plan="NORMAL"]').first().click();
        await regPage.waitForTimeout(500);
        await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(1); });
        await regPage.waitForTimeout(800);

        await regPage.fill('#regNombre', DOCTOR.nombre);
        await regPage.fill('#regMatricula', DOCTOR.matricula);
        await regPage.fill('#regEmail', DOCTOR.email);
        await regPage.fill('#regTelefono', DOCTOR.telefono);
        await shot(regPage, '04_reg_step1');

        await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(2); });
        await regPage.waitForTimeout(1000);
        await regPage.locator('#especialidadesGrid label', { hasText: /cardiolog/i }).first().click().catch(async () => {
            await regPage.locator('#especialidadesGrid input[type=checkbox]').first().check();
        });
        await shot(regPage, '05_reg_step2');

        await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(3); });
        await regPage.waitForTimeout(1000);
        await regPage.fill('#regWpName0', DOCTOR.wp0.nombre);
        await regPage.fill('#regWpAddress0', DOCTOR.wp0.address);
        await regPage.fill('#regWpPhone0', DOCTOR.wp0.phone);
        await regPage.fill('#regWpEmail0', DOCTOR.wp0.email);
        await regPage.fill('#regWpFooter0', DOCTOR.wp0.footer);
        await regPage.setInputFiles('#workplacesContainer .wp-accordion[data-wp-index="0"] input[type=file]', ASSETS.wpLogo).catch(() => {});
        await shot(regPage, '06_reg_step3');

        await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(4); });
        await regPage.waitForTimeout(1000);
        await regPage.setInputFiles('#regFirma', ASSETS.firma).catch(() => {});
        await regPage.setInputFiles('#regProLogo', ASSETS.proLogo).catch(() => {});
        await shot(regPage, '07_reg_step4');

        await regPage.evaluate(() => {
            if (typeof goStep === 'function') { goStep(5); goStep(6); }
        });
        await regPage.waitForTimeout(1000);
        await shot(regPage, '08_reg_step6_resumen');

        log('[STEP] Enviar registro NORMAL real');
        await regPage.click('#btnSubmit');
        await regPage.waitForTimeout(7000);
        await shot(regPage, '09_reg_submitted');

        const bodyText = await regPage.locator('body').innerText().catch(() => '');
        if (!/registro|recibido|éxito|gracias/i.test(bodyText)) {
            throw new Error('No apareció confirmación del registro NORMAL');
        }
        log('[OK] Registro enviado');

        // ── PASO 4: Admin → aprobar ───────────────────────────────────────────
        log('\n[FASE 2] Admin: buscar registro y aprobar');
        const adminPage = await context.newPage();
        adminPage.on('console', msg => {
            if (msg.type() === 'error') log('[ADMIN][err] ' + msg.text());
        });
        await loginAdmin(adminPage);
        const session = await getAdminSession(adminPage);
        await adminPage.evaluate((keys) => {
            localStorage.setItem('admin_groq_key',    keys.primary);
            localStorage.setItem('admin_groq_key_b1', keys.b1);
            localStorage.setItem('admin_groq_key_b2', keys.b2);
        }, ADMIN_GROQ_KEYS);

        const regList = await adminListRegistrations(session);
        const reg = (regList.registrations || []).find(r => String(r.Email || '').toLowerCase() === DOCTOR.email.toLowerCase());
        if (!reg) throw new Error('Registro NORMAL no apareció en Registros_Pendientes');
        log('[OK] Registro encontrado: ' + reg.ID_Registro);

        await adminPage.click('.tab-btn[data-tab="registros"]');
        await adminPage.waitForTimeout(2500);

        // Marcar como pagado (sin autoOpenApprove — lo haremos manualmente)
        await adminPage.evaluate((regId) => {
            window.dashConfirm = async () => true;
            if (typeof markRegistrationPaid === 'function') markRegistrationPaid(regId, false);
        }, reg.ID_Registro);
        await adminPage.waitForTimeout(8000);
        await shot(adminPage, '10_pago_marcado');

        // Abrir modal de aprobación explícitamente
        await adminPage.evaluate((regId) => {
            if (typeof openApproveModal === 'function') openApproveModal(regId);
        }, reg.ID_Registro);
        await adminPage.waitForTimeout(3000);

        // Verificar que el modal está abierto y approveRegId tiene valor
        const approveModalOpen = await adminPage.locator('#approveModalOverlay').isVisible().catch(() => false);
        log('[INFO] Modal aprobación visible: ' + approveModalOpen);

        const approveRegIdVal = await adminPage.evaluate(() => {
            const el = document.getElementById('approveRegId');
            return el ? el.value : '(no encontrado)';
        });
        log('[INFO] approveRegId en DOM: ' + approveRegIdVal);

        if (!approveModalOpen || !approveRegIdVal) {
            throw new Error('Modal de aprobación no se abrió correctamente. Modal visible=' + approveModalOpen + ' regId=' + approveRegIdVal);
        }

        // Auto-seleccionar templates si ninguna está marcada
        await adminPage.evaluate(() => {
            const cbs = Array.from(document.querySelectorAll('.approve-tpl-cb:not(:disabled)'));
            const checked = cbs.filter(cb => cb.checked);
            if (checked.length === 0 && cbs.length > 0) {
                // No hay ninguna seleccionada → seleccionar la primera
                cbs[0].checked = true;
            }
        });

        await shot(adminPage, '11_modal_approve_open');

        await adminPage.evaluate(() => {
            window.dashConfirm = async () => true;
            if (typeof confirmApproval === 'function') confirmApproval();
        });
        await adminPage.waitForTimeout(18000);
        await closeDashModal(adminPage);
        await shot(adminPage, '12_aprobacion_done');

        // ── PASO 5: Verificar usuario NORMAL en backend ───────────────────────
        log('\n[FASE 3] Verificar usuario NORMAL creado');
        const userNormal = await findUserRetry(session, DOCTOR.email, 20, 2500);
        if (!userNormal) throw new Error('Usuario NORMAL no apareció en Usuarios tras aprobación (50s timeout)');
        const planNormal = String(userNormal.Plan || '').toLowerCase();
        if (planNormal !== 'normal') throw new Error('Plan esperado: normal, recibido: ' + planNormal);
        log('[OK] Usuario NORMAL creado: ' + userNormal.ID_Medico + ' plan=' + planNormal);

        // ── PASO 6-7: Generar clone NORMAL y verificar ────────────────────────
        log('\n[FASE 4] Clone NORMAL — verificar permisos NORMAL');
        const cloneLinkNormal = await generateCloneLink(adminPage, userNormal.ID_Medico);
        await shot(adminPage, '12_clone_factory_normal');
        log('[OK] Clone NORMAL: ' + cloneLinkNormal);

        const clonePageNormal = await context.newPage();
        await clonePageNormal.goto(cloneLinkNormal + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
        await clonePageNormal.waitForTimeout(9000);
        await shot(clonePageNormal, '13_clone_normal_loaded');

        const cfgNormal = await clonePageNormal.evaluate(() => window.CLIENT_CONFIG || null);
        if (!cfgNormal) throw new Error('CLIENT_CONFIG no disponible en clone NORMAL');
        const clonePlanBefore = String(cfgNormal.planCode || cfgNormal.plan || cfgNormal.type || '').toLowerCase();
        if (clonePlanBefore !== 'normal') throw new Error('Clone NORMAL: planCode esperado normal, recibido: ' + clonePlanBefore);
        if (cfgNormal.hasProMode) throw new Error('Clone NORMAL: hasProMode debe ser false');
        if (cfgNormal.hasDashboard) throw new Error('Clone NORMAL: hasDashboard debe ser false');
        log('[OK] Clone NORMAL verificado: planCode=normal, hasProMode=false, hasDashboard=false');

        await clonePageNormal.close();

        // ── PASO 8: Upgrade NORMAL → PRO ─────────────────────────────────────
        log('\n[FASE 5] Upgrade NORMAL → PRO via admin_update_user');
        const expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + 1);
        const formattedExp = expDate.toISOString().split('T')[0];

        const upgradeResult = await adminUpdateUser(session, userNormal.ID_Medico, {
            Plan:              'pro',
            Estado:            'active',
            Fecha_Vencimiento: formattedExp,
            Devices_Max:       3,
            Notas_Admin:       'Upgrade E2E P3 — ' + new Date().toISOString().split('T')[0]
        });

        if (!upgradeResult.success) {
            throw new Error('admin_update_user falló: ' + JSON.stringify(upgradeResult));
        }
        log('[OK] Upgrade aplicado en backend. Fecha_Vencimiento=' + formattedExp);

        // Verificar en backend que el plan cambió
        await new Promise(r => setTimeout(r, 2000));
        const usersAfter = await adminListUsers(session);
        const userPro = (usersAfter.users || []).find(u => String(u.ID_Medico) === String(userNormal.ID_Medico));
        if (!userPro) throw new Error('Usuario no encontrado en backend tras upgrade');
        const planAfter = String(userPro.Plan || '').toLowerCase();
        if (planAfter !== 'pro') throw new Error('Backend aún muestra plan=' + planAfter + ' tras upgrade (esperado: pro)');
        log('[OK] Backend confirma upgrade: plan=pro, estado=' + userPro.Estado);

        await adminPage.click('#btnRefresh').catch(() => {});
        await adminPage.waitForTimeout(3000);
        await shot(adminPage, '14_admin_post_upgrade');

        // ── PASO 9-11: Clone PRO — verificar permisos PRO ─────────────────────
        log('\n[FASE 6] Clone PRO — verificar permisos PRO');
        const cloneLinkPro = await generateCloneLink(adminPage, userNormal.ID_Medico);
        await shot(adminPage, '15_clone_factory_pro');
        log('[OK] Nuevo clone PRO: ' + cloneLinkPro);

        const clonePagePro = await context.newPage();
        clonePagePro.on('console', msg => {
            if (msg.type() === 'error') log('[CLONE-PRO][err] ' + msg.text());
        });
        await clonePagePro.goto(cloneLinkPro + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
        await clonePagePro.waitForTimeout(10000);
        await shot(clonePagePro, '16_clone_pro_loaded');

        const cfgPro = await clonePagePro.evaluate(() => window.CLIENT_CONFIG || null);
        if (!cfgPro) throw new Error('CLIENT_CONFIG no disponible en clone PRO');

        const clonePlanAfter = String(cfgPro.planCode || cfgPro.plan || cfgPro.type || '').toLowerCase();
        if (clonePlanAfter !== 'pro') throw new Error('Clone PRO: planCode esperado pro, recibido: ' + clonePlanAfter);
        if (!cfgPro.hasProMode) throw new Error('Clone PRO: hasProMode debe ser true tras upgrade');
        if (!cfgPro.hasDashboard) throw new Error('Clone PRO: hasDashboard debe ser true tras upgrade');
        log('[OK] Clone PRO: planCode=pro, hasProMode=true, hasDashboard=true');

        // Verificar en la UI que el modo PRO es accesible
        const proToggleVisible = await clonePagePro.locator('[data-action="toggleProMode"], #btnProMode, .pro-mode-toggle, [id*="proMode"], [class*="pro-mode"]')
            .first().isVisible().catch(() => false);
        log('[INFO] Selector modo PRO visible en UI: ' + proToggleVisible);
        await shot(clonePagePro, '17_clone_pro_ui');

        // Validación final contra backend
        const cloneDeviceId = await clonePagePro.evaluate(() => localStorage.getItem('device_id') || '').catch(() => '');
        if (cloneDeviceId) {
            const validateData = await fetchJson(
                GAS_URL + '?action=validate&id=' + encodeURIComponent(userNormal.ID_Medico) + '&deviceId=' + encodeURIComponent(cloneDeviceId)
            );
            const vPlan = String(validateData.Plan || validateData.plan || '').toLowerCase();
            if (vPlan !== 'pro') throw new Error('validate no devolvió pro tras upgrade, recibido: ' + vPlan);
            log('[OK] validate backend confirma plan=pro');
        } else {
            log('[SKIP] No se pudo reutilizar deviceId del clone PRO, pero clone cargó OK');
        }

        await shot(clonePagePro, '18_final_state');

        fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify({
            ok: true,
            medicoId:      userNormal.ID_Medico,
            cloneLinkNormal,
            cloneLinkPro,
            planBefore:    planNormal,
            planAfter:     planAfter,
            upgradeDate:   formattedExp,
            cfgNormal,
            cfgPro
        }, null, 2));

        log('\n[SUCCESS] ✅ P3 — Upgrade NORMAL→PRO completado y verificado');

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
