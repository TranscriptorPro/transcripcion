'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = 'https://transcriptorpro.github.io/transcripcion';
const LOGIN_URL = BASE_URL + '/recursos/login.html';
const REG_URL = BASE_URL + '/recursos/registro.html';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin2026';
const HEADLESS = process.env.HEADLESS === '1';

const LOGOS_DIR = 'C:\\Users\\kengy\\Desktop\\Logos';
const ASSETS = {
  wpLogo: path.join(LOGOS_DIR, 'CMR.png'),
  proLogo: path.join(LOGOS_DIR, 'roman.png'),
  firma: path.join(LOGOS_DIR, 'firma.png')
};

const ADMIN_GROQ_KEYS = {
  primary: 'gsk_test_primary_real_e2e_placeholder',
  b1: 'gsk_test_backup1_real_e2e_placeholder',
  b2: 'gsk_test_backup2_real_e2e_placeholder'
};

const SUFFIX = Date.now().toString(36).toUpperCase();
const DOCTOR = {
  nombre: 'Dr. E2E Normal ' + SUFFIX,
  email: 'e2e.normal.' + SUFFIX.toLowerCase() + '@testpro.demo',
  matricula: 'MN ' + SUFFIX.slice(-6),
  telefono: '+54 11 8100 33' + String(Math.floor(Math.random() * 90 + 10)),
  especialidadLabel: 'Cardiología',
  wp0: {
    nombre: 'Instituto Normal Central ' + SUFFIX,
    address: 'Av. Normal 100, CABA',
    phone: '+54 11 4666 1010',
    email: 'normal.central.' + SUFFIX.toLowerCase() + '@demo.test',
    footer: 'Instituto Normal Central - Cardiología'
  }
};

const REPORT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes', 'e2e-normal-real-' + Date.now());
fs.mkdirSync(REPORT_DIR, { recursive: true });

let shotCounter = 0;
function log(msg) { console.log(msg); }
async function shot(page, name) {
  shotCounter += 1;
  const file = path.join(REPORT_DIR, String(shotCounter).padStart(2, '0') + '_' + name + '.png');
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (_) {
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
}

async function getAdminSession(page) {
  const raw = await page.evaluate(() => sessionStorage.getItem('adminSession'));
  if (!raw) throw new Error('Sin adminSession');
  return JSON.parse(raw);
}

async function getPlansConfig() {
  return fetchJson(GAS_URL + '?action=public_get_plans_config');
}

async function adminListRegistrations(session) {
  return fetchJson(GAS_URL + '?action=admin_list_registrations&' + qAuth(session));
}

async function adminListUsers(session) {
  return fetchJson(GAS_URL + '?action=admin_list_users&' + qAuth(session));
}

async function validateClone(userId) {
  return fetchJson(GAS_URL + '?action=validate&id=' + encodeURIComponent(userId) + '&deviceId=e2e_normal_' + Date.now());
}

async function closeDashModal(page) {
  const vis = await page.locator('#dashModalOverlay').isVisible().catch(() => false);
  if (!vis) return false;
  await page.evaluate(() => {
    const a = document.getElementById('dashModalActions');
    const b = a ? a.querySelector('button') : null;
    if (b) { b.click(); return; }
    const c = document.getElementById('dashModalCloseBtn');
    if (c) c.click();
  }).catch(() => {});
  await page.waitForTimeout(1200);
  return true;
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

(async () => {
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 80 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
  const regPage = await context.newPage();

  regPage.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') console.log('[REG]', msg.type(), msg.text());
  });

  try {
    log('[STEP] Leer configuración dinámica real');
    const plans = await getPlansConfig();
    const normalCfg = plans && plans.plans && plans.plans.normal ? plans.plans.normal : null;
    if (!normalCfg) throw new Error('No llegó config normal');
    log('[OK] Normal dinámico: devices=' + normalCfg.maxDevices + ' workplaces=' + normalCfg.workplaces);

    log('[STEP] Abrir formulario público real');
    await regPage.goto(REG_URL + '?_t=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
    await regPage.waitForTimeout(2500);
    await shot(regPage, '02_reg_open');

    log('[STEP] Completar formulario NORMAL real');
    await regPage.locator('.pricing-card[data-plan="NORMAL"]').first().click();
    await regPage.waitForTimeout(500);
    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(1); });
    await regPage.waitForTimeout(800);

    await regPage.fill('#regNombre', DOCTOR.nombre);
    await regPage.fill('#regMatricula', DOCTOR.matricula);
    await regPage.fill('#regEmail', DOCTOR.email);
    await regPage.fill('#regTelefono', DOCTOR.telefono);
    await shot(regPage, '03_reg_step1');

    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(2); });
    await regPage.waitForTimeout(1000);
    await regPage.locator('#especialidadesGrid label', { hasText: /cardiolog/i }).first().click().catch(async () => {
      await regPage.locator('#especialidadesGrid input[type=checkbox]').first().check();
    });
    await shot(regPage, '04_reg_step2');

    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(3); });
    await regPage.waitForTimeout(1000);
    await regPage.fill('#regWpName0', DOCTOR.wp0.nombre);
    await regPage.fill('#regWpAddress0', DOCTOR.wp0.address);
    await regPage.fill('#regWpPhone0', DOCTOR.wp0.phone);
    await regPage.fill('#regWpEmail0', DOCTOR.wp0.email);
    await regPage.fill('#regWpFooter0', DOCTOR.wp0.footer);
    await regPage.setInputFiles('#workplacesContainer .wp-accordion[data-wp-index="0"] input[type=file]', ASSETS.wpLogo).catch(() => {});
    await shot(regPage, '05_reg_step3');

    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(4); });
    await regPage.waitForTimeout(1000);
    await regPage.setInputFiles('#regFirma', ASSETS.firma).catch(() => {});
    await regPage.setInputFiles('#regProLogo', ASSETS.proLogo).catch(() => {});
    await shot(regPage, '06_reg_step4');

    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(5); });
    await regPage.waitForTimeout(1000);
    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(6); });
    await regPage.waitForTimeout(1000);
    await shot(regPage, '07_reg_step6');

    log('[STEP] Enviar registro real');
    await regPage.click('#btnSubmit');
    await regPage.waitForTimeout(7000);
    await shot(regPage, '08_reg_submitted');

    const bodyText = await regPage.locator('body').innerText().catch(() => '');
    if (!/registro|recibido|éxito|gracias/i.test(bodyText)) {
      throw new Error('No apareció confirmación clara del registro');
    }

    log('[STEP] Login admin real');
    const adminPage = await context.newPage();
    adminPage.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') console.log('[ADMIN]', msg.type(), msg.text());
    });
    await loginAdmin(adminPage);
    const session = await getAdminSession(adminPage);
    await adminPage.evaluate((keys) => {
      localStorage.setItem('admin_groq_key', keys.primary);
      localStorage.setItem('admin_groq_key_b1', keys.b1);
      localStorage.setItem('admin_groq_key_b2', keys.b2);
    }, ADMIN_GROQ_KEYS);
    await shot(adminPage, '09_admin_open');

    log('[STEP] Verificar registro en backend real');
    const regList = await adminListRegistrations(session);
    const reg = (regList.registrations || []).find(r => String(r.Email || '').toLowerCase() === DOCTOR.email.toLowerCase());
    if (!reg) throw new Error('El registro NORMAL no apareció en Registros_Pendientes');
    log('[OK] Registro encontrado: ' + reg.ID_Registro + ' estado=' + reg.Estado);

    log('[STEP] Marcar pago y aprobar desde UI real');
    await adminPage.click('.tab-btn[data-tab="registros"]');
    await adminPage.waitForTimeout(2500);
    await adminPage.evaluate((regId) => {
      window.dashConfirm = async () => true;
      if (typeof markRegistrationPaid === 'function') return markRegistrationPaid(regId, true);
    }, reg.ID_Registro);
    await adminPage.waitForTimeout(6000);
    await shot(adminPage, '10_pago_marcado');

    log('[STEP] Verificar modal de aprobación');
    let approveVisible = await adminPage.locator('#approveModalOverlay').isVisible().catch(() => false);
    if (!approveVisible) {
      log('[INFO] Modal aprobación no visible aún, esperando más');
      await adminPage.waitForTimeout(4000);
      approveVisible = await adminPage.locator('#approveModalOverlay').isVisible().catch(() => false);
    }
    if (approveVisible) {
      log('[OK] Modal de aprobación visible');
    } else {
      log('[WARN] Modal de aprobación no visible, intentando igual');
    }
    // Fire-and-forget: no retornar la promise para no colgar evaluate
    await adminPage.evaluate(() => {
      window.dashConfirm = async () => true;
      if (typeof confirmApproval === 'function') confirmApproval();
    });
    await adminPage.waitForTimeout(15000);

    const postMsg = await adminPage.locator('#dashModalMsg').innerText().catch(() => '');
    if (/todav[ií]a no aparece|actualiz[aá] usuarios|f[aá]brica manualmente/i.test(postMsg)) {
      log('[INFO] Modal de espera detectado, cerrando y refrescando');
      await closeDashModal(adminPage);
    } else {
      await closeDashModal(adminPage);
    }

    const created = await findUserRetry(session, DOCTOR.email, 7, 2500);
    if (!created) throw new Error('El usuario NORMAL no apareció en Usuarios');
    if (String(created.Plan || '').toLowerCase() !== 'normal') throw new Error('Plan no quedó en normal');
    log('[OK] Usuario NORMAL creado: ' + created.ID_Medico);

    log('[STEP] Verificar clon real');
    await adminPage.click('.tab-btn[data-tab="usuarios"]').catch(() => {});
    await adminPage.waitForTimeout(1200);
    await adminPage.click('#btnRefresh').catch(() => {});
    await adminPage.waitForTimeout(3000);

    await adminPage.evaluate((userId) => {
      if (typeof openCloneFactory === 'function') openCloneFactory(userId);
    }, created.ID_Medico);
    await adminPage.waitForTimeout(2500);

    await closeDashModal(adminPage);

    let cfVisible = await adminPage.locator('#cloneFactoryModal').isVisible().catch(() => false);
    if (!cfVisible) {
      await adminPage.evaluate((userId) => {
        if (typeof openCloneFactory === 'function') openCloneFactory(userId);
      }, created.ID_Medico);
      await adminPage.waitForTimeout(2000);
      await closeDashModal(adminPage);
    }

    await adminPage.evaluate(() => {
      const btn = document.getElementById('cfBtnGenerate');
      if (btn) btn.click();
    });
    await adminPage.waitForTimeout(5000);

    const cloneLink = await adminPage.locator('#cfLinkUrl').inputValue().catch(() => '');
    if (!cloneLink.includes('?id=')) throw new Error('No se generó link de clon NORMAL');

    const clonePage = await context.newPage();
    await clonePage.goto(cloneLink + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await clonePage.waitForTimeout(9000);
    await shot(clonePage, '10_clone_loaded');

    const cloneCfg = await clonePage.evaluate(() => ({
      client: window.CLIENT_CONFIG || null,
      key: localStorage.getItem('groq_api_key') || '',
      keyB1: localStorage.getItem('groq_api_key_b1') || '',
      keyB2: localStorage.getItem('groq_api_key_b2') || ''
    }));

    if (!cloneCfg.client) throw new Error('CLIENT_CONFIG no disponible en clon');
    log('[DEBUG] clone planCode=' + (cloneCfg.client.planCode || 'undefined') + ' type=' + (cloneCfg.client.type || 'undefined') + ' plan=' + (cloneCfg.client.plan || 'undefined'));
    const clonePlan = String(cloneCfg.client.planCode || cloneCfg.client.plan || cloneCfg.client.type || '').toLowerCase();
    if (clonePlan !== 'normal') throw new Error('planCode no es normal, recibido: ' + clonePlan + ' fullConfig=' + JSON.stringify(cloneCfg.client).slice(0, 400));
    if (cloneCfg.client.hasProMode) throw new Error('hasProMode debería ser false en normal');
    if (cloneCfg.client.hasDashboard) throw new Error('hasDashboard debería ser false en normal');
    if (cloneCfg.key !== ADMIN_GROQ_KEYS.primary) throw new Error('groq_api_key no cargada en clon normal');
    if (cloneCfg.keyB1 !== ADMIN_GROQ_KEYS.b1) throw new Error('groq_api_key_b1 no cargada en clon normal');
    if (cloneCfg.keyB2 !== ADMIN_GROQ_KEYS.b2) throw new Error('groq_api_key_b2 no cargada en clon normal');
    log('[OK] Clon NORMAL cargó con restricciones y keys');

    // NORMAL tiene maxDevices=1, ya consumido al abrir el clon.
    // Validate con otro deviceId daría DEVICE_LIMIT, así que
    // verificamos validate reutilizando el deviceId del clon.
    const cloneDeviceId = await clonePage.evaluate(() => localStorage.getItem('device_id') || '').catch(() => '');
    if (cloneDeviceId) {
      const validateData = await fetchJson(GAS_URL + '?action=validate&id=' + encodeURIComponent(created.ID_Medico) + '&deviceId=' + encodeURIComponent(cloneDeviceId));
      log('[DEBUG] validate response: ' + JSON.stringify(validateData).slice(0, 500));
      const vPlan = String(validateData.Plan || validateData.plan || '').toLowerCase();
      if (vPlan !== 'normal') throw new Error('validate no devolvió normal, recibido: ' + vPlan);
      log('[OK] validate real consistente');
    } else {
      log('[SKIP] No se pudo reutilizar deviceId del clon para validate, pero clon cargó OK');
    }

    fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify({
      ok: true,
      regId: reg.ID_Registro,
      medicoId: created.ID_Medico,
      cloneLink,
      normalCfg,
      created,
      cloneCfg
    }, null, 2));

    log('[SUCCESS] Circuito NORMAL real completado');
  } catch (err) {
    fs.writeFileSync(path.join(REPORT_DIR, 'error.txt'), String(err && err.stack ? err.stack : err));
    console.error('[FAIL]', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
})();
