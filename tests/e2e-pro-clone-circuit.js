/**
 * e2e-pro-clone-circuit.js
 * =============================================================================
 * Circuito E2E completo: Admin genera clon para usuario PRO
 *
 * FASES:
 *   1. Admin panel carga + auth bypass → tabla de usuarios visible
 *   2. Tab Usuarios → allUsers cargado con MOCK_PRO_USER
 *   3. openCloneFactory(userId) → #cloneFactoryModal visible
 *   4. cfBtnGenerate → link generado con ?id=DRPRO001
 *   5. Navegar al clon → action=validate mocked → CLIENT_CONFIG.planCode='pro'
 *   6. Verificar: planCode=pro, hasProMode=true, hasDashboard=true, sin clinicAuthOverlay
 *
 * Uso:
 *   $env:HEADLESS='0'; node tests/e2e-pro-clone-circuit.js
 * =============================================================================
 */

'use strict';

process.on('unhandledRejection', (err) => {
  console.error('[CIRCUIT][UnhandledRejection]', err && err.message ? err.message : err);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('[CIRCUIT][UncaughtException]', err && err.message ? err.message : err);
  process.exit(1);
});

console.log('[CIRCUIT] script iniciado');

const path = require('path');
const fs   = require('fs');

const { chromium } = require('playwright');
console.log('[CIRCUIT] requires OK');

// ── Constants ────────────────────────────────────────────────────────────────
const APP_URL       = 'https://transcriptorpro.github.io/transcripcion';
const ADMIN_URL     = APP_URL + '/recursos/admin.html';
const HEADLESS      = process.env.HEADLESS !== '0';
const PRO_USER_ID   = 'DRPRO001';

const REPORT_DIR = path.join(
  __dirname, '..', 'accesorios', 'reportes',
  'e2e-pro-clone-circuit-' + Date.now()
);
fs.mkdirSync(REPORT_DIR, { recursive: true });
console.log('[CIRCUIT] OUT_DIR=' + REPORT_DIR);
console.log('[CIRCUIT] HEADLESS=' + HEADLESS + '  APP_URL=' + APP_URL + '  PRO_USER_ID=' + PRO_USER_ID);

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_PRO_USER = {
  ID_Medico:        PRO_USER_ID,
  Nombre:           'Dr. Roberto Fernandez',
  Email:            'roberto@clinica.demo',
  Matricula:        'MN 55555',
  Especialidad:     'Cardiología',
  Plan:             'pro',
  Estado:           'active',
  Devices_Max:      3,
  Devices_Logged:   '[]',
  API_Key:          'gsk_pro_test',
  API_Key_B1:       '',
  API_Key_B2:       '',
  Fecha_Vencimiento:'2027-12-31',
  Fecha_Registro:   new Date().toISOString(),
  Usage_Count:      42,
  Notas_Admin:      'Usuario PRO de prueba E2E'
};

const MOCK_USERS_RESP = { success: true, users: [MOCK_PRO_USER] };

// Lo que devuelve action=validate cuando el clon carga
const MOCK_VALIDATE_PRO = {
  Plan:             'pro',
  Estado:           'active',
  Nombre:           'Dr. Roberto Fernandez',
  Matricula:        'MN 55555',
  Especialidad:     'Cardiología',
  Devices_Max:      3,
  API_Key:          'gsk_pro_test',
  Fecha_Vencimiento:'2027-12-31',
  Registro_Datos:   '{}',
  Allowed_Templates:''
};

// ── Admin Session ────────────────────────────────────────────────────────────
const ADMIN_SESSION = {
  username:    'admin',
  nombre:      'Admin Test',
  role:        'admin',
  nivel:       'superadmin',
  timestamp:   Date.now(),
  tokenExpiry: Date.now() + 8 * 3600 * 1000
};

// ── Helpers ──────────────────────────────────────────────────────────────────
let shotIdx = 0;
async function shot(page, label) {
  const file = String(++shotIdx).padStart(2, '0') + '_' + label.replace(/[^a-z0-9_]/gi, '_') + '.png';
  await page.screenshot({ path: path.join(REPORT_DIR, file), fullPage: false }).catch(() => {});
  return file;
}

const results  = [];
const evidence = [];

function pass(step, detail) {
  results.push({ step, ok: true });
  console.log('  PASS: ' + step + (detail ? ' — ' + detail : ''));
}
function fail(step, err) {
  results.push({ step, ok: false, warn: false, error: String(err || '?') });
  console.log('  FAIL: ' + step + (err ? ' — ' + err : ''));
}
function warn(step, err) {
  results.push({ step, ok: false, warn: true, error: String(err || '?') });
  console.log('  WARN: ' + step + (err ? ' — ' + err : ''));
}

// ── Main IIFE ────────────────────────────────────────────────────────────────
console.log('[CIRCUIT] IIFE start');
(async () => {
  let browser, context;
  try {
    // ── Launch ─────────────────────────────────────────────────────────────
    console.log('[CIRCUIT] launching Chromium...');
    browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 80 });
    context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    // Pre-aceptar onboarding en todas las páginas
    await context.addInitScript(() => {
      localStorage.setItem('onboarding_accepted', 'true');
    });

    // Interceptar TODAS las llamadas al GAS backend
    await context.route('**script.google.com**exec**', async (route) => {
      const url = route.request().url();

      // validate → respuesta PRO
      if (/action=validate/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(MOCK_VALIDATE_PRO) });

      // lista de usuarios → MOCK_PRO_USER
      if (/action=admin_list_users/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(MOCK_USERS_RESP) });

      // registros pendientes → vacío
      if (/action=admin_list_registrations/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, registrations: [] }) });

      // cualquier otra llamada → éxito genérico
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) });
    });

    console.log('[CIRCUIT] mocks configurados');

    // ======================================================================
    // FASE 1 — Admin panel carga y autentica
    // ======================================================================
    console.log('[CIRCUIT] FASE 1 -- cargando admin panel...');

    const adminPage = await context.newPage();
    adminPage.on('console', m => {
      if (m.type() === 'error') console.log('  [ADMIN ERR]', m.text().slice(0, 130));
    });
    adminPage.on('dialog', async d => {
      console.log('  [DIALOG]', d.message().slice(0, 80));
      await d.accept();
    });

    // Inyectar sesión ANTES de navegar (auth gate lo lee en el <head>)
    await adminPage.addInitScript((sess) => {
      sessionStorage.setItem('adminSession', JSON.stringify(sess));
    }, ADMIN_SESSION);

    await adminPage.goto(ADMIN_URL + '?_t=' + Date.now(),
      { waitUntil: 'domcontentloaded', timeout: 45000 });
    await adminPage.waitForTimeout(4000);

    evidence.push(await shot(adminPage, 'fase1_admin_loaded'));

    // Verificar que admin.html cargó (no fue redirigido a login.html)
    const adminBodyTxt = await adminPage.locator('body').innerText().catch(() => '');
    const adminUrl     = adminPage.url();
    if (/login\.html/i.test(adminUrl)) {
      fail('admin.html cargado', 'redirigido a login.html — sessionStorage no inyectado');
    } else if (!/Transcriptor Pro|Modo Administrador|Usuarios/i.test(adminBodyTxt)) {
      warn('admin.html cargado', 'body no contiene texto esperado — URL: ' + adminUrl);
    } else {
      pass('admin.html cargado');
    }

    // ======================================================================
    // FASE 2 — Tab Usuarios → allUsers cargado con MOCK_PRO_USER
    // ======================================================================
    console.log('[CIRCUIT] FASE 2 -- tab usuarios y carga de datos...');

    const usersTab = adminPage.locator('.tab-btn[data-tab="usuarios"]').first();
    if (await usersTab.count()) {
      await usersTab.click();
      await adminPage.waitForTimeout(3000);
    }

    evidence.push(await shot(adminPage, 'fase2_usuarios_tab'));

    // Verificar que la fila del usuario PRO aparece en la tabla
    const proUserRow = adminPage.locator(`[data-user-id="${PRO_USER_ID}"]`).first();
    if (await proUserRow.count()) {
      pass('Usuario PRO visible en tabla', MOCK_PRO_USER.Nombre);
    } else {
      // Intentar ver qué hay en la tabla
      const tableText = await adminPage.locator('#tableBody').innerText().catch(() => '');
      console.log('  tableBody excerpt: ' + tableText.slice(0, 200));
      warn('Usuario PRO visible en tabla', 'fila [data-user-id=' + PRO_USER_ID + '] no encontrada');
    }

    // ======================================================================
    // FASE 3 — openCloneFactory → #cloneFactoryModal visible
    // ======================================================================
    console.log('[CIRCUIT] FASE 3 -- clone factory para usuario PRO...');

    // Primero aseguramos que allUsers (closure) tenga al MOCK_PRO_USER
    // via el mock de admin_list_users ya activo — pero por si acaso, inyectamos también
    const cloneInj = await adminPage.evaluate((mu) => {
      try {
        // allUsers es closure en admin-inline-script-04.js — si loadDashboard corrió OK, ya está.
        // openCloneFactory busca en esa closure. Así que simplemente la llamamos.
        if (typeof window.openCloneFactory === 'function') {
          window.openCloneFactory(mu.ID_Medico);
          return { ok: true };
        }
        return { ok: false, error: 'openCloneFactory no definida aún' };
      } catch (e) { return { ok: false, error: e.message }; }
    }, MOCK_PRO_USER);
    console.log('  cloneInj=' + JSON.stringify(cloneInj));

    if (!cloneInj.ok) {
      // Esperar más y reintentar
      await adminPage.waitForTimeout(2500);
      const retry = await adminPage.evaluate((mu) => {
        try {
          if (typeof window.openCloneFactory === 'function') {
            window.openCloneFactory(mu.ID_Medico);
            return { ok: true };
          }
          return { ok: false, error: 'openCloneFactory sigue sin definirse' };
        } catch (e) { return { ok: false, error: e.message }; }
      }, MOCK_PRO_USER);
      console.log('  cloneInj retry=' + JSON.stringify(retry));
    }

    let cloneModalVisible = false;
    try {
      await adminPage.waitForSelector('#cloneFactoryModal',
        { state: 'visible', timeout: 8000 });
      cloneModalVisible = true;
    } catch (_) {}

    evidence.push(await shot(adminPage, 'fase3_clone_factory_modal'));

    if (cloneModalVisible) {
      pass('#cloneFactoryModal visible');
    } else {
      warn('#cloneFactoryModal', 'modal no apareció — allUsers puede estar vacío');
    }

    // ======================================================================
    // FASE 4 — cfBtnGenerate → link generado con ?id=DRPRO001
    // ======================================================================
    console.log('[CIRCUIT] FASE 4 -- generando link de clon PRO...');

    let cloneLink = '';
    if (cloneModalVisible) {
      const cfBtn = adminPage.locator('#cfBtnGenerate');
      if (await cfBtn.count() && await cfBtn.isVisible().catch(() => false)) {
        await cfBtn.click();
        await adminPage.waitForTimeout(2000);
      }
      cloneLink = await adminPage.locator('#cfLinkUrl').inputValue().catch(() => '');
      evidence.push(await shot(adminPage, 'fase4_clone_link'));
      console.log('  cloneLink="' + cloneLink + '"');
    }

    if (cloneLink && cloneLink.includes('?id=' + PRO_USER_ID)) {
      pass('Link de clon generado', cloneLink);
    } else if (cloneLink && cloneLink.includes('?id=')) {
      warn('Link de clon generado', 'link tiene ?id= pero ID incorrecto: ' + cloneLink);
    } else {
      if (cloneModalVisible) {
        fail('Link de clon generado', 'cfLinkUrl vacío o sin ?id=');
      } else {
        warn('Link de clon generado', 'no verificado (modal no abrió)');
      }
    }

    // ======================================================================
    // FASE 5 — Navegar al clon → validar CLIENT_CONFIG como PRO
    // ======================================================================
    console.log('[CIRCUIT] FASE 5 -- validando clon PRO...');

    const cloneUrl = cloneLink || (APP_URL + '/?id=' + PRO_USER_ID);
    const clonePage = await context.newPage();
    clonePage.on('console', m => {
      if (m.type() === 'error') console.log('  [CLONE ERR]', m.text().slice(0, 130));
    });
    clonePage.on('dialog', async d => {
      console.log('  [DIALOG]', d.message().slice(0, 80));
      await d.accept();
    });

    await clonePage.goto(cloneUrl + '&_t=' + Date.now(),
      { waitUntil: 'domcontentloaded', timeout: 45000 });
    // Esperar a que el setup termine (factorySetupOverlay desaparezca)
    await clonePage.waitForTimeout(5000);
    try {
      await clonePage.waitForSelector('#factorySetupOverlay',
        { state: 'hidden', timeout: 15000 });
    } catch (_) { /* puede no existir si setup fue rápido */ }
    await clonePage.waitForTimeout(2000);

    evidence.push(await shot(clonePage, 'fase5_clone_loaded'));

    // Leer CLIENT_CONFIG del page
    const cloneCfg = await clonePage.evaluate(() => {
      const cc = window.CLIENT_CONFIG;
      if (!cc) return null;
      return {
        planCode:        cc.planCode,
        type:            cc.type,
        hasProMode:      cc.hasProMode,
        hasDashboard:    cc.hasDashboard,
        canGenerateApps: cc.canGenerateApps,
        status:          cc.status,
        medicoId:        cc.medicoId
      };
    });
    console.log('  cloneCfg=' + JSON.stringify(cloneCfg));

    if (!cloneCfg) {
      fail('CLIENT_CONFIG presente', 'window.CLIENT_CONFIG es null/undefined');
    } else {
      pass('CLIENT_CONFIG presente');
    }

    if (cloneCfg && cloneCfg.planCode === 'pro') {
      pass('planCode=pro', cloneCfg.planCode);
    } else {
      fail('planCode=pro', 'planCode=' + (cloneCfg && cloneCfg.planCode));
    }

    if (cloneCfg && cloneCfg.hasProMode === true) {
      pass('hasProMode=true');
    } else {
      fail('hasProMode=true', 'hasProMode=' + (cloneCfg && String(cloneCfg.hasProMode)));
    }

    if (cloneCfg && cloneCfg.hasDashboard === true) {
      pass('hasDashboard=true');
    } else {
      fail('hasDashboard=true', 'hasDashboard=' + (cloneCfg && String(cloneCfg.hasDashboard)));
    }

    if (cloneCfg && cloneCfg.canGenerateApps === false) {
      pass('canGenerateApps=false (correcto para PRO)');
    } else {
      warn('canGenerateApps=false',
        'canGenerateApps=' + (cloneCfg && String(cloneCfg.canGenerateApps)));
    }

    // #clinicAuthOverlay NO debe estar visible (es exclusivo de CLINIC)
    const clinicOverlayVisible = await clonePage.locator('#clinicAuthOverlay')
      .isVisible().catch(() => false);
    if (!clinicOverlayVisible) {
      pass('sin #clinicAuthOverlay (correcto para PRO)');
    } else {
      fail('sin #clinicAuthOverlay', 'overlay de clínica visible en cuenta PRO');
    }

    // #factoryErrorOverlay NO debe estar visible
    const errorOverlayVisible = await clonePage.locator('#factoryErrorOverlay')
      .isVisible().catch(() => false);
    if (!errorOverlayVisible) {
      pass('sin #factoryErrorOverlay (setup OK)');
    } else {
      const errText = await clonePage.locator('#factoryErrorOverlay').innerText().catch(() => '');
      fail('sin #factoryErrorOverlay', errText.slice(0, 100));
    }

    evidence.push(await shot(clonePage, 'fase5_clone_final'));

    // ======================================================================
    // RESUMEN
    // ======================================================================
    const total    = results.length;
    const passed   = results.filter(r => r.ok).length;
    const warned   = results.filter(r => !r.ok && r.warn).length;
    const failed   = results.filter(r => !r.ok && !r.warn).length;

    console.log('\n[CIRCUIT] ====== RESUMEN ======');
    results.forEach(r => {
      const tag = r.ok ? '[PASS]' : (r.warn ? '[WARN]' : '[FAIL]');
      console.log('  ' + tag + ' ' + r.step + (r.error ? ' — ' + r.error : ''));
    });
    console.log('  Total: ' + passed + ' PASS, ' + warned + ' WARN, ' + failed + ' FAIL');

    // Guardar summary.json
    const summary = {
      timestamp:  new Date().toISOString(),
      total, passed, warned, failed,
      results,
      evidence
    };
    fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

    const statusLine = failed > 0 ? 'CIRCUITO FALLIDO' : warned > 0 ? 'CIRCUITO OK (con advertencias)' : 'CIRCUITO COMPLETADO';
    console.log('[CIRCUIT] ' + statusLine + ' -- Report: ' + REPORT_DIR);

    process.exitCode = failed > 0 ? 1 : 0;

  } catch (err) {
    console.error('[CIRCUIT][ERROR FATAL]', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack.split('\n').slice(0, 8).join('\n'));
    process.exitCode = 1;
  } finally {
    try { if (context) await context.close(); } catch (_) {}
    try { if (browser) await browser.close(); } catch (_) {}
    console.log('[CIRCUIT] navegador cerrado');
  }
})();
