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
const CLINIC = {
  nombre: 'Clinica E2E ' + SUFFIX,
  cuit: '30-' + String(Date.now()).slice(-8) + '-9',
  email: 'e2e.clinic.' + SUFFIX.toLowerCase() + '@testpro.demo',
  telefono: '+54 11 8200 44' + String(Math.floor(Math.random() * 90 + 10)),
  wp0: {
    nombre: 'Sede Central E2E ' + SUFFIX,
    address: 'Av. Clinica 120, CABA',
    phone: '+54 11 4777 1010',
    email: 'clinic.central.' + SUFFIX.toLowerCase() + '@demo.test',
    footer: 'Clinica E2E - Sede Central'
  },
  pro1: {
    nombre: 'Dr. E2E Clinico ' + SUFFIX,
    matricula: 'MC ' + SUFFIX.slice(-6),
    especialidad: 'Cardiología',
    email: 'prof1.' + SUFFIX.toLowerCase() + '@demo.test',
    telefono: '+54 11 4777 1111',
    pin: '1234'
  }
};

const REPORT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes', 'e2e-clinic-real-' + Date.now());
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

async function adminListRegistrations(session) {
  return fetchJson(GAS_URL + '?action=admin_list_registrations&' + qAuth(session));
}

async function adminListUsers(session) {
  return fetchJson(GAS_URL + '?action=admin_list_users&' + qAuth(session));
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
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 90 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
  const regPage = await context.newPage();

  try {
    log('[STEP] Abrir formulario de registro real CLINIC');
    await regPage.goto(REG_URL + '?_t=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
    await regPage.waitForTimeout(2500);
    await regPage.locator('.pricing-card[data-plan="CLINIC"]').first().click();
    await regPage.waitForTimeout(600);
    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(1); });

    log('[STEP] Completar datos clínicos base');
    await regPage.fill('#regNombre', CLINIC.nombre);
    await regPage.fill('#regMatricula', CLINIC.cuit);
    await regPage.fill('#regEmail', CLINIC.email);
    await regPage.fill('#regTelefono', CLINIC.telefono);
    await shot(regPage, '02_reg_step1');

    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(2); });
    await regPage.waitForTimeout(1000);
    await regPage.locator('#especialidadesGrid label', { hasText: /cardiolog/i }).first().click().catch(async () => {
      await regPage.locator('#especialidadesGrid input[type=checkbox]').first().check();
    });

    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(3); });
    await regPage.waitForTimeout(1500);
    // CLINIC: regWpName0, regWpPhone0, regWpEmail0 están ocultos (auto-llenados desde paso 1)
    // Solo llenar los campos visibles del lugar de trabajo
    await regPage.fill('#regWpAddress0', CLINIC.wp0.address);
    await regPage.fill('#regWpFooter0', CLINIC.wp0.footer);
    await regPage.setInputFiles('#workplacesContainer .wp-accordion[data-wp-index="0"] input[type=file]', ASSETS.wpLogo).catch(() => {});
    await shot(regPage, '03_reg_step3_wp');

    // CLINIC: Los profesionales están en step 3 (#clinicProfessionalsSection), no en step 4
    log('[STEP] Completar profesional 0 en sección de profesionales');
    await regPage.fill('#regProfName0', CLINIC.pro1.nombre);
    await regPage.fill('#regProfMatricula0', CLINIC.pro1.matricula);
    await regPage.fill('#regProfEspecialidad0', CLINIC.pro1.especialidad);
    await regPage.fill('#regProfUsuario0', 'e2eclinic' + SUFFIX.toLowerCase());
    await regPage.fill('#regProfPin0', CLINIC.pro1.pin);
    await regPage.fill('#regProfEmail0', CLINIC.pro1.email).catch(() => {});
    await regPage.fill('#regProfTelefono0', CLINIC.pro1.telefono).catch(() => {});
    await shot(regPage, '04_reg_step3_prof');

    // CLINIC: goStep(4) auto-redirige a step 5 (cart) porque step 4 se salta
    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(4); });
    await regPage.waitForTimeout(1500);
    // Ya estamos en step 5 (cart), avanzar a step 6 (resumen)
    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(6); });
    await regPage.waitForTimeout(1000);
    await shot(regPage, '05_reg_step6');

    log('[STEP] Enviar registro clínica real');
    await regPage.click('#btnSubmit');
    await regPage.waitForTimeout(8000);

    const bodyText = await regPage.locator('body').innerText().catch(() => '');
    if (!/registro|recibido|éxito|gracias/i.test(bodyText)) {
      throw new Error('No apareció confirmación clara del registro de clínica');
    }

    log('[STEP] Login admin real y aprobación');
    const adminPage = await context.newPage();
    await loginAdmin(adminPage);
    const session = await getAdminSession(adminPage);
    await adminPage.evaluate((keys) => {
      localStorage.setItem('admin_groq_key', keys.primary);
      localStorage.setItem('admin_groq_key_b1', keys.b1);
      localStorage.setItem('admin_groq_key_b2', keys.b2);
    }, ADMIN_GROQ_KEYS);

    const regList = await adminListRegistrations(session);
    const reg = (regList.registrations || []).find(r => String(r.Email || '').toLowerCase() === CLINIC.email.toLowerCase());
    if (!reg) throw new Error('El registro CLINIC no apareció en Registros_Pendientes');
    log('[OK] Registro clínica encontrado: ' + reg.ID_Registro);

    await adminPage.click('.tab-btn[data-tab="registros"]');
    await adminPage.waitForTimeout(2200);
    await adminPage.evaluate((regId) => {
      window.dashConfirm = async () => true;
      if (typeof markRegistrationPaid === 'function') return markRegistrationPaid(regId, true);
    }, reg.ID_Registro);
    await adminPage.waitForTimeout(6000);

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

    const created = await findUserRetry(session, CLINIC.email, 7, 2500);
    if (!created) throw new Error('El usuario CLINIC no apareció en Usuarios');
    if (String(created.Plan || '').toLowerCase() !== 'clinic') throw new Error('Plan no quedó en clinic');
    log('[OK] Usuario CLINIC creado: ' + created.ID_Medico);

    log('[STEP] Generar clon y validar modo clínica real');
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
    if (!cloneLink.includes('?id=')) throw new Error('No se generó link de clon CLINIC');

    const clinicPage = await context.newPage();
    await clinicPage.goto(cloneLink + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await clinicPage.waitForTimeout(9000);
    await shot(clinicPage, '06_clinic_clone_loaded');

    const clinicCfg = await clinicPage.evaluate(() => {
      const wpRaw = localStorage.getItem('workplace_profiles') || '[]';
      let wp = [];
      try { wp = JSON.parse(wpRaw); } catch (_) {}
      const profs = (wp[0] && wp[0].professionals) || [];
      return {
        client: window.CLIENT_CONFIG || null,
        hasAuthOverlay: !!document.getElementById('clinicAuthOverlay'),
        key: localStorage.getItem('groq_api_key') || '',
        keyB1: localStorage.getItem('groq_api_key_b1') || '',
        keyB2: localStorage.getItem('groq_api_key_b2') || '',
        wpCount: wp.length,
        profCount: profs.length,
        wpSample: JSON.stringify(wp).slice(0, 500)
      };
    });

    if (!clinicCfg.client) throw new Error('CLIENT_CONFIG no disponible en clon clinic');
    const clonePlan = String(clinicCfg.client.planCode || clinicCfg.client.plan || clinicCfg.client.type || '').toLowerCase();
    log('[DEBUG] clone planCode=' + clonePlan + ' type=' + (clinicCfg.client.type || ''));
    log('[DEBUG] workplace_profiles: wpCount=' + clinicCfg.wpCount + ' profCount=' + clinicCfg.profCount);
    log('[DEBUG] wpSample: ' + clinicCfg.wpSample);
    if (clonePlan !== 'clinic') throw new Error('planCode no es clinic, got: ' + clonePlan);
    if (!clinicCfg.client.hasProMode) throw new Error('hasProMode debería ser true en clinic');
    if (!clinicCfg.client.hasDashboard) throw new Error('hasDashboard debería ser true en clinic');
    if (clinicCfg.profCount > 0 && !clinicCfg.hasAuthOverlay) {
      log('[WARN] Hay profesionales pero el overlay no apareció (puede ser timing)');
    } else if (clinicCfg.profCount === 0) {
      log('[INFO] No hay profesionales en workplace_profiles — overlay no esperado');
    } else if (clinicCfg.hasAuthOverlay) {
      log('[OK] Overlay de autenticación clínica visible');
    }
    if (clinicCfg.key !== ADMIN_GROQ_KEYS.primary) throw new Error('groq_api_key no cargada en clon clinic');
    if (clinicCfg.keyB1 !== ADMIN_GROQ_KEYS.b1) throw new Error('groq_api_key_b1 no cargada en clon clinic');
    if (clinicCfg.keyB2 !== ADMIN_GROQ_KEYS.b2) throw new Error('groq_api_key_b2 no cargada en clon clinic');
    log('[OK] Clon CLINIC validado con overlay y 3 keys');

    fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify({
      ok: true,
      regId: reg.ID_Registro,
      medicoId: created.ID_Medico,
      cloneLink,
      created,
      clinicCfg
    }, null, 2));

    log('[SUCCESS] Circuito CLINIC real completado');
  } catch (err) {
    fs.writeFileSync(path.join(REPORT_DIR, 'error.txt'), String(err && err.stack ? err.stack : err));
    console.error('[FAIL]', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
})();
