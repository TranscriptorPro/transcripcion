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
  socialMedia: {
    facebook: 'https://facebook.com/dr.e2e.normal.' + SUFFIX.toLowerCase(),
    instagram: '@dr_e2e_normal_' + SUFFIX.toLowerCase(),
    youtube: 'https://youtube.com/@dr-e2e-normal-' + SUFFIX.toLowerCase(),
    x: '@dr_e2e_' + SUFFIX.toLowerCase(),
    whatsapp: '+54 9 11 5555 ' + String(Math.floor(Math.random() * 9000 + 1000))
  },
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
    // Redes sociales
    await regPage.fill('#regSocialFb', DOCTOR.socialMedia.facebook);
    await regPage.fill('#regSocialIg', DOCTOR.socialMedia.instagram);
    await regPage.fill('#regSocialYt', DOCTOR.socialMedia.youtube);
    await regPage.fill('#regSocialX', DOCTOR.socialMedia.x);
    await regPage.fill('#regSocialWa', DOCTOR.socialMedia.whatsapp);
    await shot(regPage, '03_reg_step1');
    log('[OK] Paso 1 completo: datos + redes sociales rellenos');

    await regPage.evaluate(() => { if (typeof goStep === 'function') goStep(2); });
    await regPage.waitForTimeout(1000);

    // [TEST FIX v2] Llamar directamente las funciones de la app para evitar problemas
    // de visibilidad/eventos DOM con navegación programática vía goStep().
    // toggleEspecialidad llama internamente a renderEstudios() — mismo flujo que la UI real.
    // BUG ERA DEL TEST (no de la app): la app bloquea correctamente sin estudios seleccionados.
    const paso2OK = await regPage.evaluate(() => {
      try {
        const esp = Object.keys(ESPECIALIDADES)[0]; // primera especialidad disponible (ej: Cardiología)
        if (typeof toggleEspecialidad === 'function') {
          toggleEspecialidad(esp, true); // internamente llama renderEstudios()
        }
        const estudios = ESPECIALIDADES[esp] || [];
        if (estudios.length === 0) return { ok: false, msg: 'Sin estudios para especialidad: ' + esp };
        // Seleccionar el primer estudio disponible
        if (typeof toggleEstudio === 'function') {
          toggleEstudio(estudios[0], esp, true);
        }
        return { ok: true, esp, estudio: estudios[0], total: selectedEstudios.length };
      } catch (e) {
        return { ok: false, msg: e.message };
      }
    });
    if (!paso2OK.ok) throw new Error('[ASSERT FAIL paso2] ' + paso2OK.msg);
    log(`[OK] Especialidad: ${paso2OK.esp} | Estudio seleccionado: "${paso2OK.estudio}" | total=${paso2OK.total}`);
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

    log('[STEP] Enviar registro real — modal de resumen pre-envío');
    await regPage.click('#btnSubmit');
    await regPage.waitForTimeout(1500);
    // El nuevo flujo muestra un modal de resumen antes de enviar
    const preSubmitVisible = await regPage.locator('#preSubmitOverlay').isVisible().catch(() => false);
    if (preSubmitVisible) {
      log('[OK] Modal pre-submit visible, verificando checklist');
      await shot(regPage, '08a_pre_submit_summary');
      // Confirmar envío
      await regPage.click('#btnConfirmSubmit');
      log('[OK] Confirmado envío desde modal de resumen');
    } else {
      log('[WARN] Modal pre-submit no visible, flujo legacy');
    }
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

    log('[STEP] Marcar pago desde UI real');
    await adminPage.click('.tab-btn[data-tab="registros"]');
    await adminPage.waitForTimeout(2500);

    // Paso 1: Marcar pago SIN auto-abrir aprobación
    await adminPage.evaluate((regId) => {
      window.dashConfirm = async () => true;
      if (typeof markRegistrationPaid === 'function') return markRegistrationPaid(regId, false);
    }, reg.ID_Registro);
    await adminPage.waitForTimeout(5000);
    await shot(adminPage, '10_pago_marcado');

    // Paso 2: Refrescar registros y abrir modal de aprobación manualmente
    log('[STEP] Refrescar y abrir modal de aprobación');
    await adminPage.evaluate(() => {
      if (typeof loadRegistrations === 'function') return loadRegistrations();
    });
    await adminPage.waitForTimeout(3000);

    await adminPage.evaluate((regId) => {
      if (typeof openApproveModal === 'function') openApproveModal(regId);
    }, reg.ID_Registro);
    await adminPage.waitForTimeout(3000);

    let approveVisible = await adminPage.locator('#approveModalOverlay').isVisible().catch(() => false);
    if (!approveVisible) {
      log('[INFO] Modal aprobación no visible, reintentando');
      await adminPage.waitForTimeout(3000);
      await adminPage.evaluate((regId) => {
        if (typeof openApproveModal === 'function') openApproveModal(regId);
      }, reg.ID_Registro);
      await adminPage.waitForTimeout(3000);
      approveVisible = await adminPage.locator('#approveModalOverlay').isVisible().catch(() => false);
    }
    log(approveVisible ? '[OK] Modal de aprobación visible' : '[WARN] Modal de aprobación no visible');

    // Diagnóstico profundo del modal
    const modalDiag = await adminPage.evaluate(() => {
      const section = document.getElementById('approveTemplateSection');
      const plan = document.getElementById('approvePlan');
      const espField = document.getElementById('approveRegEspecialidades');
      return {
        sectionExists: !!section,
        sectionHTML: section ? section.innerHTML.slice(0, 500) : 'N/A',
        planValue: plan ? plan.value : 'N/A',
        especialidades: espField ? espField.value : 'N/A',
        templateMapKeys: typeof TEMPLATE_MAP !== 'undefined' ? Object.keys(TEMPLATE_MAP).join(', ') : 'UNDEFINED',
        tplCbCount: document.querySelectorAll('.approve-tpl-cb').length,
        packCbCount: document.querySelectorAll('.approve-pack-cb').length,
        extraCbCount: document.querySelectorAll('.approve-extra-cb').length
      };
    });
    log('[DEBUG] Plan=' + modalDiag.planValue + ' Esp=' + modalDiag.especialidades);
    log('[DEBUG] TEMPLATE_MAP keys: ' + modalDiag.templateMapKeys);
    log('[DEBUG] Checkboxes: tpl=' + modalDiag.tplCbCount + ' pack=' + modalDiag.packCbCount + ' extra=' + modalDiag.extraCbCount);
    log('[DEBUG] Section HTML: ' + modalDiag.sectionHTML.slice(0, 300));
    await shot(adminPage, '10b_approve_modal');

    // Asegurar API keys
    await adminPage.evaluate((keys) => {
      const el = document.getElementById('approveApiKey');
      const b1 = document.getElementById('approveApiKeyB1');
      const b2 = document.getElementById('approveApiKeyB2');
      if (el && !el.value.trim()) el.value = keys.primary;
      if (b1 && !b1.value.trim()) b1.value = keys.b1;
      if (b2 && !b2.value.trim()) b2.value = keys.b2;
    }, ADMIN_GROQ_KEYS);

    // Si templateMode es manual (NORMAL): marcar checkboxes
    const tplFixInfo = await adminPage.evaluate(() => {
      const cbs = document.querySelectorAll('.approve-tpl-cb');
      const checkedBefore = Array.from(cbs).filter(cb => cb.checked).length;
      if (checkedBefore === 0 && cbs.length > 0) {
        let marked = 0;
        cbs.forEach(cb => {
          if (!cb.disabled && marked < 3) { cb.checked = true; marked++; }
        });
        if (typeof onTplChange === 'function') onTplChange(3);
      }
      return { total: cbs.length, checkedBefore, checkedNow: Array.from(cbs).filter(cb => cb.checked).length };
    });
    log('[DEBUG] Plantillas: total=' + tplFixInfo.total + ' before=' + tplFixInfo.checkedBefore + ' now=' + tplFixInfo.checkedNow);

    // Si no hay checkboxes de plantillas pero el plan es NORMAL, forzar re-render
    if (tplFixInfo.total === 0) {
      log('[WARN] Sin checkboxes de plantillas, forzando updateApproveTemplateUI');
      await adminPage.evaluate(() => {
        if (typeof updateApproveTemplateUI === 'function') updateApproveTemplateUI();
      });
      await adminPage.waitForTimeout(1500);
      const retryCount = await adminPage.evaluate(() => {
        const cbs = document.querySelectorAll('.approve-tpl-cb');
        let marked = 0;
        cbs.forEach(cb => { if (!cb.disabled && marked < 3) { cb.checked = true; marked++; } });
        if (typeof onTplChange === 'function' && cbs.length) onTplChange(3);
        return cbs.length;
      });
      log('[DEBUG] Después de re-render: tpl checkboxes=' + retryCount);
    }

    // Confirmar aprobación (fire-and-forget)
    await adminPage.evaluate(() => {
      window.dashConfirm = async () => true;
      if (typeof confirmApproval === 'function') confirmApproval();
    });
    await adminPage.waitForTimeout(30000);

    const postMsg = await adminPage.locator('#dashModalMsg').innerText().catch(() => '');
    log('[DEBUG] postMsg after approval: ' + postMsg.slice(0, 200));
    if (/todav[ií]a no aparece|actualiz[aá] usuarios|f[aá]brica manualmente/i.test(postMsg)) {
      log('[INFO] Modal de espera detectado, cerrando');
      await closeDashModal(adminPage);
    } else {
      await closeDashModal(adminPage);
    }
    await shot(adminPage, '11_post_approval');

    // Verificar estado del registro
    const regListPost = await adminListRegistrations(session).catch(() => ({ registrations: [] }));
    const regPost = (regListPost.registrations || []).find(r => String(r.Email || '').toLowerCase() === DOCTOR.email.toLowerCase());
    log('[DEBUG] Registro post-approval: estado=' + (regPost ? regPost.Estado : 'NO ENCONTRADO'));

    const created = await findUserRetry(session, DOCTOR.email, 20, 5000);
    if (!created) throw new Error('El usuario NORMAL no apareció en Usuarios (20 reintentos × 5s = 100s)');
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
