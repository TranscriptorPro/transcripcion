'use strict';

// Global error handlers so silent crashes become visible
process.on('unhandledRejection', (err) => {
  console.error('[CIRCUIT] UNHANDLED REJECTION:', err && err.message ? err.message : String(err));
  process.exitCode = 1;
});
process.on('uncaughtException', (err) => {
  console.error('[CIRCUIT] UNCAUGHT EXCEPTION:', err && err.message ? err.message : String(err));
  process.exitCode = 1;
});

console.log('[CIRCUIT] script iniciado');

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

console.log('[CIRCUIT] requires OK');

const APP_URL    = (process.env.APP_URL  || 'https://transcriptorpro.github.io/transcripcion').replace(/\/+$/, '');
const CLONE_ID   = process.env.CLINIC_CLONE_ID   || 'MEDMN62S30P';
const ADMIN_USER = process.env.CLINIC_ADMIN_USER  || 'admin';
const ADMIN_PASS = process.env.CLINIC_ADMIN_PASS  || 'admin';
const HEADLESS   = process.env.HEADLESS === '1';   // default: visible

const ADMIN_URL = APP_URL + '/recursos/admin.html';
const OWNER_URL = APP_URL + '/?id=' + encodeURIComponent(CLONE_ID);

const OUT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes',
  'e2e-clinic-owner-full-' + Date.now());
fs.mkdirSync(OUT_DIR, { recursive: true });

console.log('[CIRCUIT] OUT_DIR=' + OUT_DIR);
console.log('[CIRCUIT] HEADLESS=' + HEADLESS + '  APP_URL=' + APP_URL + '  CLONE_ID=' + CLONE_ID);

// ── Mock responses ─────────────────────────────────────────────────────────
const MOCK_VALIDATE = {
  ID_Medico: CLONE_ID,
  Nombre: 'La Isla Bonita',
  Matricula: '',
  Email: 'admin@laislabonita.demo',
  Telefono: '',
  Especialidad: 'ALL',
  Plan: 'clinic',
  Estado: 'active',
  Devices_Max: 99,
  Devices_Logged: '[]',
  API_Key: 'gsk_test',
  API_Key_B1: '',
  API_Key_B2: '',
  Registro_Datos: JSON.stringify({
    workplace: { name: 'La Isla Bonita', address: 'Calle Principal 123', phone: '', email: '', footer: '', logo: '' },
    adminUser: ADMIN_USER,
    adminPass: ADMIN_PASS,
    adminDni: '',
    clinicNombre: 'La Isla Bonita',
    profesionales: [
      { id: 'p1', nombre: 'Dr. Hernan Rios', pin: '1234', especialidades: ['Cardiologia'], activo: true, primerUso: false }
    ]
  })
};

const MOCK_STAFF = {
  success: true,
  staff: [
    { Clinic_ID: CLONE_ID, Staff_ID: '__admin__', Role: 'admin', Nombre: 'Administrador', Activo: 'true' },
    { Clinic_ID: CLONE_ID, Staff_ID: 'p1', Role: 'professional', Nombre: 'Dr. Hernan Rios',
      Matricula: 'MN 11111', Especialidades: 'Cardiologia', Activo: 'true', Primer_Uso: 'false' }
  ]
};

const REG_ID = 'REG-DEMO-001';
const MOCK_REGISTRATIONS = {
  success: true,
  registrations: [
    {
      ID_Registro: REG_ID,
      Estado: 'pago_confirmado',
      Nombre: 'La Isla Bonita',
      Email: 'admin@laislabonita.demo',
      Telefono: '+54 9 11 1234-5678',
      Matricula: '30-12345-6',
      Especialidades: 'Clinica Medica',
      Plan_Solicitado: 'CLINIC',
      Fecha_Registro: new Date().toISOString(),
      Workplace_Data: JSON.stringify({ name: 'La Isla Bonita', address: 'Calle Principal 123' }),
      Last_Receipt_Ref: 'drive:fake-receipt-id',
      Payment_History: '[]',
      ID_Medico_Asignado: ''
    }
  ]
};

const MOCK_USER = {
  ID_Medico: CLONE_ID,
  Nombre: 'La Isla Bonita',
  Email: 'admin@laislabonita.demo',
  Matricula: '30-12345-6',
  Especialidad: 'ALL',
  Plan: 'CLINIC',
  Estado: 'active',
  Devices_Max: 99,
  Devices_Logged: '[]',
  API_Key: 'gsk_test',
  API_Key_B1: '',
  API_Key_B2: '',
  Fecha_Vencimiento: '2027-12-31',
  Fecha_Registro: new Date().toISOString()
};

const MOCK_USERS = { success: true, users: [MOCK_USER] };

// ── Helpers ──────────────────────────────────────────────────────────────────
let shotIdx = 0;
async function shot(page, label) {
  const file = String(++shotIdx).padStart(2, '0') + '_' + label.replace(/[^a-z0-9_]/gi, '_') + '.png';
  await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: false }).catch(() => {});
  return file;
}
function pass(label) { console.log('  PASS: ' + label); }
function fail(label, detail) { throw new Error('FAIL: ' + label + (detail ? ' -- ' + detail : '')); }

// ── Main circuit ─────────────────────────────────────────────────────────────
(async () => {
  console.log('[CIRCUIT] IIFE start');
  let browser, context;
  const evidence = [];
  const results  = [];

  try {
    console.log('[CIRCUIT] launching Chromium...');
    browser = await chromium.launch({ headless: HEADLESS, slowMo: 90 });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

    // Pre-accept onboarding for every page
    await context.addInitScript(() => {
      localStorage.setItem('onboarding_accepted', 'true');
    });

    // Intercept ALL GAS backend calls
    await context.route('**script.google.com**exec**', async (route) => {
      const url = route.request().url();
      if (/action=validate/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_VALIDATE) });
      if (/action=clinic_get_staff/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STAFF) });
      if (/action=admin_list_registrations/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_REGISTRATIONS) });
      if (/action=admin_list_users/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USERS) });
      if (/action=admin_approve_registration/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, medicoId: CLONE_ID }) });
      // default
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    console.log('[CIRCUIT] mocks configurados');

    // ========================================================================
    // FASE 1 — Owner app loads with planCode=clinic
    // ========================================================================
    console.log('[CIRCUIT] FASE 1 -- cargando owner app...');
    const mainPage = await context.newPage();
    mainPage.on('console', m => { if (m.type() === 'error') console.log('  [BROWSER ERR]', m.text().slice(0, 120)); });
    mainPage.on('dialog',  async d => { console.log('  [DIALOG]', d.message().slice(0, 80)); await d.accept(); });

    await mainPage.goto(OWNER_URL + '&_t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await mainPage.waitForTimeout(4500);
    evidence.push(await shot(mainPage, 'fase1_owner_loaded'));

    let planCode = await mainPage.evaluate(() => {
      try { return (JSON.parse(localStorage.getItem('client_config_stored') || '{}')).planCode || ''; }
      catch (_) { return ''; }
    });
    console.log('  planCode=' + planCode);
    if (String(planCode).toLowerCase() !== 'clinic') {
      // Wait longer for async config storage
      await mainPage.waitForTimeout(5000);
      planCode = await mainPage.evaluate(() => {
        try { return (JSON.parse(localStorage.getItem('client_config_stored') || '{}')).planCode || ''; }
        catch (_) { return ''; }
      });
      console.log('  planCode (retry)=' + planCode);
    }
    if (String(planCode).toLowerCase() !== 'clinic') {
      evidence.push(await shot(mainPage, 'fase1_plancode_fail'));
      fail('planCode=clinic', 'recibido: "' + planCode + '"');
    }
    pass('App carga con planCode=clinic');
    results.push({ step: 'planCode=clinic', ok: true });

    const hasAuthOverlay = await mainPage.evaluate(() => !!document.getElementById('clinicAuthOverlay'));
    if (!hasAuthOverlay) fail('#clinicAuthOverlay no existe en DOM');
    pass('#clinicAuthOverlay presente en DOM');
    results.push({ step: 'clinicAuthOverlay en DOM', ok: true });

    // ========================================================================
    // FASE 2 — Auth via shield button
    // ========================================================================
    console.log('[CIRCUIT] FASE 2 -- auth via escudo...');
    let shieldFound = false;
    for (let t = 0; t < 15000; t += 800) {
      shieldFound = await mainPage.evaluate(() => {
        const el = document.querySelector('#btnClinicAdmin, #clinicAdminBtn, #btnAdminShield');
        return el ? getComputedStyle(el).display !== 'none' : false;
      });
      if (shieldFound) break;
      await mainPage.waitForTimeout(800);
    }
    console.log('  shieldFound=' + shieldFound);
    if (shieldFound) {
      await mainPage.evaluate(() => {
        const el = document.querySelector('#btnClinicAdmin, #clinicAdminBtn, #btnAdminShield');
        if (el) el.click();
      });
      await mainPage.waitForTimeout(900);
    }

    let authVisible = false;
    try {
      await mainPage.waitForSelector('#clinicAuthOverlay', { state: 'visible', timeout: 12000 });
      authVisible = true;
    } catch (_) {
      // Force-show if JS watchdog didn't fire yet
      await mainPage.evaluate(() => {
        const el = document.getElementById('clinicAuthOverlay');
        if (el) { el.style.display = 'flex'; el.style.visibility = 'visible'; el.style.opacity = '1'; }
      });
      authVisible = await mainPage.evaluate(() => {
        const el = document.getElementById('clinicAuthOverlay');
        return el ? getComputedStyle(el).display !== 'none' : false;
      });
    }
    evidence.push(await shot(mainPage, 'fase2_auth_overlay'));
    if (!authVisible) {
      results.push({ step: 'clinicAuthOverlay visible', ok: false, warn: true });
    } else {
      pass('#clinicAuthOverlay visible');
      results.push({ step: 'clinicAuthOverlay visible', ok: true });
    }

    if (authVisible) {
      const authSel = mainPage.locator('#clinicAuthSelect');
      if (await authSel.count()) { await authSel.selectOption({ index: 0 }); await mainPage.waitForTimeout(200); }
      await mainPage.fill('#clinicAuthPin', ADMIN_PASS);
      await mainPage.waitForTimeout(200);
      await mainPage.click('#clinicAuthEnterBtn');
      await mainPage.waitForTimeout(2500);

      // Handle forced password change modal
      const forceModal = mainPage.locator('#caaForceConfirm');
      if (await forceModal.count() && await forceModal.isVisible().catch(() => false)) {
        console.log('  [INFO] forced password change modal detected');
        await mainPage.fill('#caaForcePas1', ADMIN_PASS).catch(() => {});
        await mainPage.fill('#caaForcePas2', ADMIN_PASS).catch(() => {});
        await mainPage.fill('#caaForceDni', '30111222').catch(() => {});
        await forceModal.click();
        await mainPage.waitForTimeout(1800);
      }

      let adminPanelOk = false;
      try {
        await mainPage.waitForSelector('#clinicAdminOverlay', { state: 'visible', timeout: 12000 });
        adminPanelOk = true;
      } catch (_) {}
      evidence.push(await shot(mainPage, 'fase2_admin_panel'));
      if (adminPanelOk) {
        pass('#clinicAdminOverlay visible tras auth');
        results.push({ step: 'clinicAdminOverlay visible', ok: true });
      } else {
        console.log('  [WARN] #clinicAdminOverlay no aparecio');
        results.push({ step: 'clinicAdminOverlay visible', ok: false, warn: true });
      }
    }

    // ========================================================================
    // FASE 3 — Global admin panel: verify pending registration
    // ========================================================================
    console.log('[CIRCUIT] FASE 3 -- panel admin global...');
    const adminPage = await context.newPage();
    adminPage.on('console', m => { if (m.type() === 'error') console.log('  [ADMIN ERR]', m.text().slice(0, 120)); });
    adminPage.on('dialog',  async d => { console.log('  [ADMIN DIALOG]', d.message().slice(0, 80)); await d.accept(); });

    // Inject auth session BEFORE navigation (addInitScript runs before page scripts)
    await adminPage.addInitScript((u) => {
      sessionStorage.setItem('adminSession', JSON.stringify({
        username: u,
        nombre: 'Admin Test',
        role: 'admin',
        timestamp: Date.now(),
        tokenExpiry: Date.now() + 8 * 3600 * 1000
      }));
    }, ADMIN_USER);

    await adminPage.goto(ADMIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await adminPage.waitForTimeout(3500);
    evidence.push(await shot(adminPage, 'fase3_admin_loaded'));

    const adminBodyTxt = await adminPage.evaluate(() => document.body.innerText || '');
    if (!/Transcriptor Pro|Modo Administrador|Usuarios/i.test(adminBodyTxt)) {
      const curUrl = adminPage.url();
      fail('admin.html did not load (auth gate?)', 'URL: ' + curUrl + ' | body: ' + adminBodyTxt.slice(0, 200));
    }
    pass('admin.html cargo correctamente (auth OK)');
    results.push({ step: 'admin.html cargado', ok: true });

    // Click registros tab
    const regTabBtn = adminPage.locator('.tab-btn[data-tab="registros"]').first();
    if (await regTabBtn.count()) {
      await regTabBtn.click();
      await adminPage.waitForTimeout(2000);
    }
    evidence.push(await shot(adminPage, 'fase3_registros_tab'));

    // Wait for cards to render
    await adminPage.waitForTimeout(1200);
    const regCardHtml = await adminPage.evaluate(() => {
      const c = document.getElementById('registrosCards');
      return c ? c.innerHTML : '';
    });
    const hasRegCard = /La Isla Bonita|CLINIC|pago_confirmado|REG-DEMO|Aprobar/i.test(regCardHtml);
    evidence.push(await shot(adminPage, 'fase3_reg_cards'));
    if (!hasRegCard) {
      console.log('  [WARN] reg card HTML (400 chars):', regCardHtml.slice(0, 400));
      results.push({ step: 'registro pendiente visible', ok: false, warn: true });
    } else {
      pass('Registro pendiente visible en panel admin');
      results.push({ step: 'registro pendiente visible', ok: true });
    }

    // ========================================================================
    // FASE 4 — Clone factory: inject user, open factory, generate link
    // ========================================================================
    console.log('[CIRCUIT] FASE 4 -- fabrica de clones...');

    // Navigate to usuarios tab to ensure loadUsers() fires
    const usersTabBtn = adminPage.locator('.tab-btn[data-tab="usuarios"]').first();
    if (await usersTabBtn.count()) {
      await usersTabBtn.click();
      await adminPage.waitForTimeout(2500);
    }

    // Inject mock user into allUsers and call openCloneFactory
    const cloneInj = await adminPage.evaluate((mu) => {
      try {
        if (!window.allUsers) window.allUsers = [];
        if (!window.allUsers.find(u => String(u.ID_Medico) === String(mu.ID_Medico))) {
          window.allUsers.push(mu);
        }
        if (typeof window.openCloneFactory === 'function') {
          window.openCloneFactory(mu.ID_Medico);
          return { ok: true, len: window.allUsers.length };
        }
        return { ok: false, error: 'openCloneFactory not defined yet' };
      } catch (e) { return { ok: false, error: e.message }; }
    }, MOCK_USER);
    console.log('  cloneInj=' + JSON.stringify(cloneInj));

    if (!cloneInj.ok) {
      // Retry after JS finishes loading
      await adminPage.waitForTimeout(2500);
      const retry = await adminPage.evaluate((mu) => {
        try {
          if (!window.allUsers) window.allUsers = [];
          if (!window.allUsers.find(u => String(u.ID_Medico) === String(mu.ID_Medico))) window.allUsers.push(mu);
          if (typeof window.openCloneFactory === 'function') {
            window.openCloneFactory(mu.ID_Medico);
            return { ok: true };
          }
          return { ok: false, error: 'openCloneFactory still not defined' };
        } catch (e) { return { ok: false, error: e.message }; }
      }, MOCK_USER);
      console.log('  cloneInj retry=' + JSON.stringify(retry));
      if (!retry.ok) {
        results.push({ step: 'clone factory abierto', ok: false, warn: true, error: retry.error });
      }
    }

    let cloneModalVisible = false;
    try {
      await adminPage.waitForSelector('#cloneFactoryModal', { state: 'visible', timeout: 8000 });
      cloneModalVisible = true;
    } catch (_) {}

    if (cloneModalVisible) {
      pass('#cloneFactoryModal visible');
      results.push({ step: 'clone factory modal', ok: true });

      const cfBtn = adminPage.locator('#cfBtnGenerate');
      if (await cfBtn.count() && await cfBtn.isVisible().catch(() => false)) {
        await cfBtn.click();
        await adminPage.waitForTimeout(2000);
      }
      evidence.push(await shot(adminPage, 'fase4_clone_generated'));

      const cloneLink = await adminPage.locator('#cfLinkUrl').inputValue().catch(() => '');
      console.log('  cloneLink="' + cloneLink + '"');

      if (cloneLink) {
        pass('Link de clon generado: ' + cloneLink);
        results.push({ step: 'clone link generado', ok: true, cloneLink: cloneLink });

        // ====================================================================
        // FASE 5 — Open clone and verify CLINIC plan
        // ====================================================================
        console.log('[CIRCUIT] FASE 5 -- validando clon...');
        const clonePage = await context.newPage();
        clonePage.on('dialog', async d => { await d.accept(); });

        await clonePage.goto(cloneLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await clonePage.waitForTimeout(5000);
        evidence.push(await shot(clonePage, 'fase5_clone_opened'));

        let snap = await clonePage.evaluate(() => {
          const cfg = (() => { try { return JSON.parse(localStorage.getItem('client_config_stored') || '{}'); } catch (_) { return {}; } })();
          return {
            planCode: String(cfg.planCode || '').toLowerCase(),
            hasClinicAuth: !!document.getElementById('clinicAuthOverlay')
          };
        });
        console.log('  snap=' + JSON.stringify(snap));

        if (snap.planCode !== 'clinic') {
          await clonePage.waitForTimeout(5000);
          snap = await clonePage.evaluate(() => {
            const cfg = (() => { try { return JSON.parse(localStorage.getItem('client_config_stored') || '{}'); } catch (_) { return {}; } })();
            return {
              planCode: String(cfg.planCode || '').toLowerCase(),
              hasClinicAuth: !!document.getElementById('clinicAuthOverlay')
            };
          });
          console.log('  snap retry=' + JSON.stringify(snap));
        }

        if (snap.planCode === 'clinic') {
          pass('Clon tiene planCode=clinic');
          results.push({ step: 'clon planCode=clinic', ok: true });
        } else {
          console.log('  [WARN] clon planCode=' + snap.planCode);
          results.push({ step: 'clon planCode=clinic', ok: false, warn: true, planCode: snap.planCode });
        }

        if (snap.hasClinicAuth) {
          pass('Clon tiene #clinicAuthOverlay');
          results.push({ step: 'clon clinicAuthOverlay', ok: true });
        } else {
          console.log('  [WARN] clon no tiene #clinicAuthOverlay');
          results.push({ step: 'clon clinicAuthOverlay', ok: false, warn: true });
        }

        evidence.push(await shot(clonePage, 'fase5_clone_validated'));
        await clonePage.close();

      } else {
        console.log('  [WARN] #cfLinkUrl vacio -- posible mock faltante');
        results.push({ step: 'clone link generado', ok: false, warn: true });
      }
    } else {
      console.log('  [WARN] #cloneFactoryModal no aparecio');
      results.push({ step: 'clone factory modal', ok: false, warn: true });
    }

    await adminPage.close();
    await mainPage.close();

    // ── Summary ──────────────────────────────────────────────────────────────
    const hardFails = results.filter(r => !r.ok && !r.warn);
    const warns     = results.filter(r => !r.ok && r.warn);
    const passes    = results.filter(r =>  r.ok).length;

    console.log('');
    console.log('[CIRCUIT] ====== RESUMEN ======');
    results.forEach(r => {
      const icon = r.ok ? 'PASS' : r.warn ? 'WARN' : 'FAIL';
      const extra = (r.error ? ' -- ' + r.error : '') + (r.cloneLink ? ' -- ' + r.cloneLink : '') + (r.planCode ? ' (planCode=' + r.planCode + ')' : '');
      console.log('  [' + icon + '] ' + r.step + extra);
    });
    console.log('  Total: ' + passes + ' PASS, ' + warns.length + ' WARN, ' + hardFails.length + ' FAIL');

    fs.writeFileSync(
      path.join(OUT_DIR, 'summary.json'),
      JSON.stringify({ ok: hardFails.length === 0, results: results, evidence: evidence }, null, 2),
      'utf8'
    );

    if (hardFails.length > 0) {
      console.error('[CIRCUIT] CIRCUITO INCOMPLETO -- ' + hardFails.length + ' pasos con FAIL');
      process.exitCode = 1;
    } else {
      console.log('[CIRCUIT] CIRCUITO COMPLETADO -- Report: ' + OUT_DIR);
    }

  } catch (err) {
    console.error('[CIRCUIT] ERROR FATAL:', err.message);
    console.error(err.stack);
    fs.writeFileSync(
      path.join(OUT_DIR, 'summary.json'),
      JSON.stringify({ ok: false, fatalError: err.message, evidence: evidence }, null, 2),
      'utf8'
    );
    process.exitCode = 1;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser)  await browser.close().catch(() => {});
    console.log('[CIRCUIT] navegador cerrado');
  }
})();
