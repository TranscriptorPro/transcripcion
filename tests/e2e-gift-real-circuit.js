'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = 'https://transcriptorpro.github.io/transcripcion';
const LOGIN_URL = BASE_URL + '/recursos/login.html';
const ADMIN_URL = BASE_URL + '/recursos/admin.html';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const ADMIN_KEY = 'ADMIN_SECRET_2026';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin2026';
const HEADLESS = process.env.HEADLESS === '1';

const REPORT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes', 'e2e-gift-real-' + Date.now());
fs.mkdirSync(REPORT_DIR, { recursive: true });

const LOGOS_DIR = 'C:\\Users\\kengy\\Desktop\\Logos';
const ASSETS = {
  wpLogo: path.join(LOGOS_DIR, 'CMR.png'),
  proLogo: path.join(LOGOS_DIR, 'roman.png'),
  firma: path.join(LOGOS_DIR, 'firma.png')
};

const TEST_ID_SUFFIX = Date.now().toString(36).toUpperCase();
const TEST_USER = {
  name: 'Dr. E2E Gift ' + TEST_ID_SUFFIX,
  email: 'e2e.gift.' + TEST_ID_SUFFIX.toLowerCase() + '@testpro.demo',
  matricula: 'MG ' + TEST_ID_SUFFIX.slice(-6),
  telefono: '+54 11 7000 11' + String(Math.floor(Math.random() * 90 + 10)),
  expectedIdPrefix: 'GIFT',
  specialtyLabel: 'Cardiología'
};

let shotCounter = 0;
function report(msg) { console.log(msg); }
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
  } catch (err) {
    throw new Error('JSON inválido: ' + text.slice(0, 300));
  }
}

async function loginAdmin(page) {
  await page.goto(LOGIN_URL + '?_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.fill('#username', ADMIN_USER);
  await page.fill('#password', ADMIN_PASS);
  await shot(page, '01_login_ready');
  await page.click('#btnLogin');
  await page.waitForURL(/recursos\/admin\.html/, { timeout: 30000 });
  await page.waitForTimeout(5000);
  await shot(page, '02_admin_after_login');
}

async function getAdminSession(page) {
  const raw = await page.evaluate(() => sessionStorage.getItem('adminSession'));
  if (!raw) throw new Error('adminSession no presente');
  return JSON.parse(raw);
}

function buildAuthQuery(session) {
  return 'sessionToken=' + encodeURIComponent(session.sessionToken)
    + '&sessionUser=' + encodeURIComponent(session.username)
    + '&sessionNivel=' + encodeURIComponent(session.nivel)
    + '&sessionExpiry=' + encodeURIComponent(session.tokenExpiry);
}

async function getPlansConfig() {
  return fetchJson(GAS_URL + '?action=public_get_plans_config');
}

async function adminListUsers(session) {
  return fetchJson(GAS_URL + '?action=admin_list_users&' + buildAuthQuery(session));
}

async function validateClone(userId) {
  return fetchJson(GAS_URL + '?action=validate&id=' + encodeURIComponent(userId) + '&deviceId=e2e_real_' + Date.now());
}

(async () => {
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 80 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
  const page = await context.newPage();

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
      let text = '';
      try { text = await res.text(); } catch (_) {}
      console.log('[RES]', res.status(), res.url(), text.slice(0, 300));
    }
  });
  page.on('requestfailed', req => {
    if (req.url().includes('script.google.com')) {
      console.log('[REQ FAILED]', req.method(), req.url(), req.failure()?.errorText || 'unknown');
    }
  });

  try {
    report('[STEP] Leer config dinámica de planes');
    const plans = await getPlansConfig();
    const giftCfg = plans && plans.plans && plans.plans.gift ? plans.plans.gift : null;
    if (!giftCfg) throw new Error('No llegó config gift desde public_get_plans_config');
    report('[OK] Gift dinámico: devices=' + giftCfg.maxDevices + ' workplaces=' + giftCfg.workplaces + ' templateMode=' + giftCfg.templateMode);

    report('[STEP] Login admin real');
    await loginAdmin(page);
    const session = await getAdminSession(page);
    report('[OK] adminSession obtenida para ' + session.username);

    report('[STEP] Abrir fábrica GIFT real');
    await page.click('#btnGiftUser');
    await page.waitForTimeout(1500);
    await shot(page, '03_gift_modal_open');

    report('[STEP] Completar paso 1');
    await page.fill('#giftNombre', TEST_USER.name);
    await page.fill('#giftEmail', TEST_USER.email);
    await page.fill('#giftMatricula', TEST_USER.matricula);
    await page.fill('#giftTelefono', TEST_USER.telefono);
    const specialtySelect = page.locator('#giftEspecialidad');
    await specialtySelect.selectOption({ label: TEST_USER.specialtyLabel }).catch(async () => {
      const firstReal = await specialtySelect.locator('option').nth(1).getAttribute('value').catch(() => '');
      if (firstReal) await specialtySelect.selectOption(firstReal);
    });
    await shot(page, '04_gift_step1');
    await page.click('button[onclick="giftGoStep(2)"]');
    await page.waitForTimeout(1000);

    report('[STEP] Completar workplaces según plan dinámico');
    await page.fill('#gwWpName0', 'Instituto E2E Central ' + TEST_ID_SUFFIX);
    await page.fill('#gwWpAddress0', 'Av. Siempre Viva 123, CABA');
    await page.fill('#gwWpPhone0', '+54 11 4000 1111');
    await page.fill('#gwWpEmail0', 'central.' + TEST_ID_SUFFIX.toLowerCase() + '@demo.test');
    await page.fill('#gwWpFooter0', 'Instituto E2E Central - Cardiología');
    await page.setInputFiles('#giftWorkplacesContainer .gw-wp-accordion[data-wp-index="0"] input[type=file]', ASSETS.wpLogo).catch(() => {});

    if (Number(giftCfg.workplaces) > 1) {
      await page.click('button[onclick="addGiftWorkplace()"]');
      await page.waitForTimeout(800);
      await page.fill('#gwWpName1', 'Consultorio E2E Norte ' + TEST_ID_SUFFIX);
      await page.fill('#gwWpAddress1', 'Calle Demo 456, CABA');
      await page.fill('#gwWpPhone1', '+54 11 4000 2222');
      await page.fill('#gwWpEmail1', 'norte.' + TEST_ID_SUFFIX.toLowerCase() + '@demo.test');
      await page.fill('#gwWpFooter1', 'Consultorio Norte - Informes médicos');
      await page.setInputFiles('#giftWorkplacesContainer .gw-wp-accordion[data-wp-index="1"] input[type=file]', ASSETS.wpLogo).catch(() => {});
    }

    if (Number(giftCfg.workplaces) > 2) {
      await page.click('button[onclick="addGiftWorkplace()"]');
      await page.waitForTimeout(800);
      await page.fill('#gwWpName2', 'Hospital E2E Sur ' + TEST_ID_SUFFIX);
      await page.fill('#gwWpAddress2', 'Ruta Demo 789, CABA');
      await page.fill('#gwWpPhone2', '+54 11 4000 3333');
      await page.fill('#gwWpEmail2', 'sur.' + TEST_ID_SUFFIX.toLowerCase() + '@demo.test');
      await page.fill('#gwWpFooter2', 'Hospital Sur - Servicio médico');
      await page.setInputFiles('#giftWorkplacesContainer .gw-wp-accordion[data-wp-index="2"] input[type=file]', ASSETS.wpLogo).catch(() => {});
    }

    await shot(page, '05_gift_step2_workplaces');
    await page.click('button[onclick="giftGoStep(3)"]');
    await page.waitForTimeout(1200);

    report('[STEP] Subir firma y logo profesional');
    await page.setInputFiles('#giftFirma', ASSETS.firma).catch(() => {});
    await page.setInputFiles('#giftProLogo', ASSETS.proLogo).catch(() => {});
    await page.check('#giftShowPhone').catch(() => {});
    await page.check('#giftShowEmail').catch(() => {});
    await page.check('#giftShowSocial').catch(() => {});
    await shot(page, '06_gift_step3_branding');
    await page.click('button[onclick="giftGoStep(4)"]');
    await page.waitForTimeout(1200);

    report('[STEP] Configurar licencia GIFT dinámica');
    await page.selectOption('#giftPlan', 'GIFT').catch(() => {});
    await page.selectOption('#giftDevices', String(giftCfg.maxDevices)).catch(() => {});
    await page.selectOption('#giftDuration', String(giftCfg.durationDays)).catch(() => {});
    await page.selectOption('#giftProMode', 'true').catch(() => {});
    await page.check('#giftAllTemplates').catch(() => {});
    await shot(page, '07_gift_step4_license');
    await page.click('button[onclick="giftGoStep(5)"]');
    await page.waitForTimeout(1200);

    report('[STEP] Revisar paso 5 y paso 6');
    await shot(page, '08_gift_step5_images');
    await page.click('button[onclick="giftGoStep(6)"]');
    await page.waitForTimeout(1500);
    await shot(page, '09_gift_step6_summary');

    report('[STEP] Generar usuario GIFT real');
    await page.click('button[onclick="document.getElementById(\'cfBtnGenerate\').click()"]');
    await page.waitForTimeout(9000);
    await shot(page, '10_gift_created');

    const dashMsg = await page.locator('#dashModalMsg').innerText().catch(() => '');
    if (dashMsg) {
      console.log('[DASH MODAL]', dashMsg);
    }

    const cloneLink = await page.locator('#cfLinkUrl').inputValue().catch(() => '');
    if (!cloneLink.includes('?id=')) throw new Error('No se generó link de clon');
    report('[OK] Link generado: ' + cloneLink);

    const userId = cloneLink.split('?id=')[1].split('&')[0];
    if (!userId.startsWith(TEST_USER.expectedIdPrefix)) throw new Error('ID inesperado: ' + userId);

    report('[STEP] Verificar alta en Usuarios vía backend real');
    const usersData = await adminListUsers(session);
    const found = (usersData.users || []).find(u => String(u.ID_Medico) === String(userId));
    if (!found) throw new Error('El usuario GIFT no apareció en admin_list_users');
    report('[OK] Usuario presente en backend real: ' + found.ID_Medico + ' / ' + found.Nombre);

    report('[STEP] Abrir clon real');
    const clonePage = await context.newPage();
    clonePage.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log('[CLONE]', msg.type(), msg.text());
      }
    });
    await clonePage.goto(cloneLink + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await clonePage.waitForTimeout(9000);
    await shot(clonePage, '11_clone_loaded');

    const cloneCfg = await clonePage.evaluate(() => ({
      client: window.CLIENT_CONFIG || null,
      prof: JSON.parse(localStorage.getItem('prof_data') || '{}'),
      wps: JSON.parse(localStorage.getItem('workplace_profiles') || '[]'),
      banner: !!document.getElementById('apiKeyWarningBanner') && getComputedStyle(document.getElementById('apiKeyWarningBanner')).display !== 'none'
    }));

    if (!cloneCfg.client) throw new Error('CLIENT_CONFIG no disponible en clon');
    if (String(cloneCfg.client.planCode).toLowerCase() !== 'gift') throw new Error('planCode no es gift: ' + cloneCfg.client.planCode);
    if (!cloneCfg.client.hasProMode) throw new Error('hasProMode=false en gift');
    if (!cloneCfg.client.hasDashboard) throw new Error('hasDashboard=false en gift');
    if (cloneCfg.banner) throw new Error('Banner API key visible en clon GIFT');
    if (!Array.isArray(cloneCfg.wps) || cloneCfg.wps.length < Math.min(1, Number(giftCfg.workplaces))) throw new Error('workplace_profiles incompleto');

    report('[OK] Clon GIFT cargó bien');

    report('[STEP] Verificar validate real directo');
    const validateData = await validateClone(userId);
    if (String(validateData.Plan || '').toLowerCase() !== 'gift') throw new Error('validate no devolvió gift');
    report('[OK] validate real consistente');

    fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify({
      ok: true,
      userId,
      cloneLink,
      foundName: found.Nombre,
      foundPlan: found.Plan,
      giftCfg,
      cloneCfg
    }, null, 2));

    report('[SUCCESS] Circuito GIFT real completado');
  } catch (err) {
    fs.writeFileSync(path.join(REPORT_DIR, 'error.txt'), String(err && err.stack ? err.stack : err));
    console.error('[FAIL]', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
})();
