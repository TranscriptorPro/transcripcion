'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = 'https://transcriptorpro.github.io/transcripcion';
const LOGIN_URL = BASE_URL + '/recursos/login.html';
const ADMIN_URL = BASE_URL + '/recursos/admin.html';
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
  nombre: 'Dr. E2E Pro ' + SUFFIX,
  email: 'e2e.pro.' + SUFFIX.toLowerCase() + '@testpro.demo',
  matricula: 'MP ' + SUFFIX.slice(-6),
  telefono: '+54 11 8000 22' + String(Math.floor(Math.random() * 90 + 10)),
  especialidadLabel: 'Cardiología',
  wp0: {
    nombre: 'Instituto Pro Central ' + SUFFIX,
    address: 'Av. Central 100, CABA',
    phone: '+54 11 4555 1010',
    email: 'pro.central.' + SUFFIX.toLowerCase() + '@demo.test',
    footer: 'Instituto Pro Central - Cardiología'
  },
  wp1: {
    nombre: 'Consultorio Pro Norte ' + SUFFIX,
    address: 'Calle Norte 200, CABA',
    phone: '+54 11 4555 2020',
    email: 'pro.norte.' + SUFFIX.toLowerCase() + '@demo.test',
    footer: 'Consultorio Pro Norte - Informes'
  }
};

const REPORT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes', 'e2e-pro-real-' + Date.now());
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
  return fetchJson(GAS_URL + '?action=validate&id=' + encodeURIComponent(userId) + '&deviceId=e2e_pro_' + Date.now());
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
    const proCfg = plans && plans.plans && plans.plans.pro ? plans.plans.pro : null;
    if (!proCfg) throw new Error('No llegó config pro');
    log('[OK] Pro dinámico: devices=' + proCfg.maxDevices + ' workplaces=' + proCfg.workplaces);

    log('[STEP] Abrir formulario público real');
    await regPage.goto(REG_URL + '?_t=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
    await regPage.waitForTimeout(2500);
    await shot(regPage, '02_reg_open');

    log('[STEP] Completar formulario PRO real');
    await regPage.locator('.pricing-card[data-plan="PRO"]').first().click();
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

    if (Number(proCfg.workplaces) > 1) {
      await regPage.evaluate(() => { if (typeof addWorkplace === 'function') addWorkplace(); });
      await regPage.waitForTimeout(1000);
      await regPage.fill('#regWpName1', DOCTOR.wp1.nombre);
      await regPage.fill('#regWpAddress1', DOCTOR.wp1.address);
      await regPage.fill('#regWpPhone1', DOCTOR.wp1.phone);
      await regPage.fill('#regWpEmail1', DOCTOR.wp1.email);
      await regPage.fill('#regWpFooter1', DOCTOR.wp1.footer);
      await regPage.setInputFiles('#workplacesContainer .wp-accordion[data-wp-index="1"] input[type=file]', ASSETS.wpLogo).catch(() => {});
    }
    await shot(regPage, '05_reg_step3');

    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(4); });
    await regPage.waitForTimeout(1000);
    await regPage.setInputFiles('#regFirma', ASSETS.firma).catch(() => {});
    await regPage.setInputFiles('#regProLogo', ASSETS.proLogo).catch(() => {});
    await shot(regPage, '06_reg_step4');

    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(5); });
    await regPage.waitForTimeout(1000);
    await shot(regPage, '07_reg_step5');

    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(6); });
    await regPage.waitForTimeout(1000);
    await shot(regPage, '08_reg_step6');

    log('[STEP] Enviar registro real');
    await regPage.click('#btnSubmit');
    await regPage.waitForTimeout(7000);
    await shot(regPage, '09_reg_submitted');

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
    await shot(adminPage, '10_admin_open');

    log('[STEP] Verificar registro en backend real');
    const regList = await adminListRegistrations(session);
    const reg = (regList.registrations || []).find(r => String(r.Email || '').toLowerCase() === DOCTOR.email.toLowerCase());
    if (!reg) throw new Error('El registro PRO no apareció en Registros_Pendientes');
    log('[OK] Registro encontrado: ' + reg.ID_Registro + ' estado=' + reg.Estado);

    log('[STEP] Abrir tab registros y marcar pago desde UI real');
    await adminPage.click('.tab-btn[data-tab="registros"]');
    await adminPage.waitForTimeout(2500);
    await shot(adminPage, '11_admin_registros');

    await adminPage.evaluate((regId) => {
      window.dashConfirm = async () => true;
      if (typeof markRegistrationPaid === 'function') return markRegistrationPaid(regId, true);
    }, reg.ID_Registro);
    await adminPage.waitForTimeout(5000);
    await shot(adminPage, '12_pago_confirmado');

    log('[STEP] Verificar modal de aprobación y herencia de keys');
    const approveVisible = await adminPage.locator('#approveModalOverlay').isVisible().catch(() => false);
    if (!approveVisible) throw new Error('No abrió modal de aprobación');
    const inherited = await adminPage.evaluate(() => ({
      k: document.getElementById('approveApiKey')?.value || '',
      b1: document.getElementById('approveApiKeyB1')?.value || '',
      b2: document.getElementById('approveApiKeyB2')?.value || ''
    }));
    if (inherited.k !== ADMIN_GROQ_KEYS.primary || inherited.b1 !== ADMIN_GROQ_KEYS.b1 || inherited.b2 !== ADMIN_GROQ_KEYS.b2) {
      throw new Error('El modal de aprobación no heredó las 3 keys');
    }
    log('[OK] El modal de aprobación heredó las 3 keys del owner');
    await shot(adminPage, '13_approve_modal');

    log('[STEP] Aprobar registro real');
    await adminPage.evaluate(() => {
      window.dashConfirm = async () => true;
      if (typeof confirmApproval === 'function') return confirmApproval();
    });
    await adminPage.waitForTimeout(9000);
    const postApproveMsg = await adminPage.locator('#dashModalMsg').innerText().catch(() => '');
    if (/todav[ií]a no aparece en la tabla|actualiz[aá] usuarios|f[aá]brica manualmente/i.test(postApproveMsg)) {
      await adminPage.evaluate(() => {
        const actions = document.getElementById('dashModalActions');
        const btn = actions ? actions.querySelector('button') : null;
        if (btn) btn.click();
      });
      await adminPage.waitForTimeout(1500);
    }
    await shot(adminPage, '14_approved');

    const usersData = await adminListUsers(session);
    const created = (usersData.users || []).find(u => String(u.Email || '').toLowerCase() === DOCTOR.email.toLowerCase());
    if (!created) throw new Error('El usuario PRO no apareció en Usuarios');
    log('[OK] Usuario PRO creado: ' + created.ID_Medico);
    if (String(created.Plan || '').toLowerCase() !== 'pro') throw new Error('Plan no quedó en pro');
    if (created.API_Key !== ADMIN_GROQ_KEYS.primary) throw new Error('API_Key no persistida en Usuarios');
    if ((created.API_Key_B1 || '') !== ADMIN_GROQ_KEYS.b1) throw new Error('API_Key_B1 no persistida en Usuarios');
    if ((created.API_Key_B2 || '') !== ADMIN_GROQ_KEYS.b2) throw new Error('API_Key_B2 no persistida en Usuarios');
    log('[OK] Las 3 keys quedaron persistidas en Usuarios');

    log('[STEP] Generar link de clon real');
    await adminPage.click('.tab-btn[data-tab="usuarios"]').catch(() => {});
    await adminPage.waitForTimeout(1200);
    await adminPage.click('#btnRefresh').catch(() => {});
    await adminPage.waitForTimeout(3000);

    let cloneFactoryVisible = await adminPage.locator('#cloneFactoryModal').isVisible().catch(() => false);
    if (!cloneFactoryVisible) {
      await adminPage.evaluate((userId) => {
        if (typeof openCloneFactory === 'function') openCloneFactory(userId);
      }, created.ID_Medico);
      await adminPage.waitForTimeout(2000);
      cloneFactoryVisible = await adminPage.locator('#cloneFactoryModal').isVisible().catch(() => false);
    }
    if (!cloneFactoryVisible) throw new Error('No abrió cloneFactoryModal');

    const cfKeys = await adminPage.evaluate(() => ({
      k: document.getElementById('cfApiKey')?.value || '',
      b1: document.getElementById('cfApiKeyB1')?.value || '',
      b2: document.getElementById('cfApiKeyB2')?.value || ''
    }));
    if (cfKeys.k !== ADMIN_GROQ_KEYS.primary || cfKeys.b1 !== ADMIN_GROQ_KEYS.b1 || cfKeys.b2 !== ADMIN_GROQ_KEYS.b2) {
      throw new Error('Clone Factory no mostró las 3 keys del usuario');
    }

    await adminPage.evaluate(() => {
      const btn = document.getElementById('cfBtnGenerate');
      if (btn) btn.click();
    });
    await adminPage.waitForTimeout(4000);
    const cloneLink = await adminPage.locator('#cfLinkUrl').inputValue().catch(() => '');
    if (!cloneLink.includes('?id=')) throw new Error('No se generó link de clon PRO');
    await shot(adminPage, '15_clone_link');

    log('[STEP] Abrir clon PRO real');
    const clonePage = await context.newPage();
    clonePage.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') console.log('[CLONE]', msg.type(), msg.text());
    });
    await clonePage.goto(cloneLink + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await clonePage.waitForTimeout(9000);
    await shot(clonePage, '16_clone_loaded');

    const cloneCfg = await clonePage.evaluate(() => ({
      client: window.CLIENT_CONFIG || null,
      prof: JSON.parse(localStorage.getItem('prof_data') || '{}'),
      wps: JSON.parse(localStorage.getItem('workplace_profiles') || '[]'),
      key: localStorage.getItem('groq_api_key') || '',
      keyB1: localStorage.getItem('groq_api_key_b1') || '',
      keyB2: localStorage.getItem('groq_api_key_b2') || ''
    }));

    if (!cloneCfg.client) throw new Error('CLIENT_CONFIG no disponible');
    if (String(cloneCfg.client.planCode).toLowerCase() !== 'pro') throw new Error('planCode no es pro');
    if (!cloneCfg.client.hasProMode) throw new Error('hasProMode=false');
    if (!cloneCfg.client.hasDashboard) throw new Error('hasDashboard=false');
    if (cloneCfg.key !== ADMIN_GROQ_KEYS.primary) throw new Error('groq_api_key no cargada en clon');
    if (cloneCfg.keyB1 !== ADMIN_GROQ_KEYS.b1) throw new Error('groq_api_key_b1 no cargada en clon');
    if (cloneCfg.keyB2 !== ADMIN_GROQ_KEYS.b2) throw new Error('groq_api_key_b2 no cargada en clon');
    if (!Array.isArray(cloneCfg.wps) || cloneCfg.wps.length < Math.min(1, Number(proCfg.workplaces))) throw new Error('workplace_profiles incompleto');
    log('[OK] Clon PRO cargó con las 3 keys');

    log('[STEP] Verificar validate real');
    const validateData = await validateClone(created.ID_Medico);
    if (String(validateData.Plan || '').toLowerCase() !== 'pro') throw new Error('validate no devolvió pro');
    log('[OK] validate real consistente');

    fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify({
      ok: true,
      regId: reg.ID_Registro,
      medicoId: created.ID_Medico,
      cloneLink,
      proCfg,
      created,
      cloneCfg
    }, null, 2));

    log('[SUCCESS] Circuito PRO real completado');
  } catch (err) {
    fs.writeFileSync(path.join(REPORT_DIR, 'error.txt'), String(err && err.stack ? err.stack : err));
    console.error('[FAIL]', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
})();
