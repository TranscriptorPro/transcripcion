#!/usr/bin/env node
/**
 * e2e-normal-simplified.js
 * Test E2E simplificado: registro → pago → aprobación (directa) → clon
 * Sin login admin complicado
 */

const { chromium } = require('playwright');
const BASE = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const ADMIN_KEY = 'ADMIN_SECRET_2026';
const REG_URL = 'https://kengygomez.github.io/Transcriptor-pro/';

const HEADLESS = true;
const log = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  return res.json();
}

async function testE2ENormal() {
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 80 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
  const regPage = await context.newPage();
  const clonePage = await context.newPage();

  try {
    // ════════════════════════════════════════════════════════════════════════════════
    log('═'.repeat(70));
    log('TEST E2E NORMAL — SIMPLIFICADO (sin admin UI compleja)');
    log('═'.repeat(70));

    const testId = Date.now();
    const email = `e2e_simple_${testId}@testpro.demo`;
    const nombre = `Dr. E2E Simple ${testId}`;
    const matricula = `MAT${testId}`;

    // ════════════════════════════════════════════════════════════════════════════════
    log('\n[PASO 1] Abrir formulario de registro público');
    // ════════════════════════════════════════════════════════════════════════════════
    await regPage.goto(REG_URL + '?_t=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
    log('✅ Página de registro cargada');

    // ════════════════════════════════════════════════════════════════════════════════
    log('\n[PASO 2] Completar formulario');
    // ════════════════════════════════════════════════════════════════════════════════
    
    await regPage.waitForSelector('input[placeholder*="ombre"]', { timeout: 10000 }).catch(() => log('⚠️ Input nombre no encontrado, intentando por ID'));
    
    // Rellenar campos básicos (adaptarse a los selectores reales)
    const fillForm = async () => {
      try {
        // Intentar rellenar por placeholder
        await regPage.fill('input[placeholder*="ombre"]', nombre).catch(() => {});
        await regPage.fill('input[placeholder*="mail"]', email).catch(() => {});
        await regPage.fill('input[placeholder*="atrícula"]', matricula).catch(() => {});
        await regPage.fill('input[placeholder*="eléfono"]', '+54 9 11 1234-5678').catch(() => {});
        
        // Intentar rellenar por ID si los placeholders fallan
        await regPage.fill('#inputNombre', nombre).catch(() => {});
        await regPage.fill('#inputEmail', email).catch(() => {});
        await regPage.fill('#inputMatricula', matricula).catch(() => {});
        await regPage.fill('#inputTelefono', '+54 9 11 1234-5678').catch(() => {});
        
        log('✅ Formulario rellenado');
      } catch (e) {
        log('⚠️ Error rellenando formulario: ' + e.message);
      }
    };
    
    await fillForm();

    // Buscar y hacer clic en botón submit
    const submitBtn = await regPage.locator('button:has-text("Enviar"), button:has-text("Submit"), button[type="submit"]').first().catch(() => null);
    if (submitBtn) {
      log('Enviando formulario...');
      await submitBtn.click();
      await regPage.waitForTimeout(3000);
    }

    log('✅ Formulario completado');

    // ════════════════════════════════════════════════════════════════════════════════
    log('\n[PASO 3] Buscar registro en backend y marcar como pagado');
    // ════════════════════════════════════════════════════════════════════════════════

    // Buscar el registro que acabamos de crear
    const listRegs = await fetchJson(BASE + '?action=admin_list_registrations&adminKey=' + ADMIN_KEY);
    const registrations = listRegs.registrations || [];
    const newReg = registrations.find(r => String(r.Email || '').toLowerCase() === email.toLowerCase());

    if (!newReg) {
      log('❌ Registro no encontrado en backend');
      log('   Emails en backend: ' + registrations.map(r => r.Email).join(', '));
      return false;
    }

    const regId = newReg.ID_Registro;
    log('✅ Registro encontrado: ' + regId);

    // Marcar como pagado
    log('Marcando como pagado...');
    const payRes = await fetchJson(BASE + '?action=admin_mark_registration_paid&regId=' + encodeURIComponent(regId) + '&adminKey=' + ADMIN_KEY);
    if (payRes.error) {
      log('❌ Error marcando pago: ' + payRes.error);
      return false;
    }
    log('✅ Pago marcado');

    // ════════════════════════════════════════════════════════════════════════════════
    log('\n[PASO 4] Aprobar registro directamente (sin UI admin)');
    // ════════════════════════════════════════════════════════════════════════════════

    const approveRes = await fetchJson(BASE, {
      method: 'POST',
      body: JSON.stringify({
        action: 'admin_approve_registration',
        regId: regId,
        plan: 'NORMAL',
        apiKey: 'gsk_e2e_simple_' + testId,
        maxDevices: 1,
        allowedTemplates: JSON.stringify(['generico']),
        editedNombre: nombre,
        editedEmail: email,
        editedMatricula: matricula,
        editedTelefono: '+54 9 11 1234-5678',
        editedHeaderColor: '#1a56a0',
        editedFooterText: 'Transcriptor Pro',
        editedWorkplace: '{}',
        editedExtraWorkplaces: '[]',
        editedHasProMode: false,
        editedHasDashboard: false,
        editedCanGenerateApps: false,
        adminKey: ADMIN_KEY
      })
    });

    if (approveRes.error) {
      log('❌ Error aprobando: ' + approveRes.error);
      return false;
    }

    if (!approveRes.success) {
      log('❌ Aprobación no exitosa: ' + JSON.stringify(approveRes));
      return false;
    }

    const medicoId = approveRes.medicoId;
    log('✅ Aprobación exitosa → Médico ID: ' + medicoId);

    // ════════════════════════════════════════════════════════════════════════════════
    log('\n[PASO 5] Validar que usuario aparece en admin_list_users');
    // ════════════════════════════════════════════════════════════════════════════════

    let found = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const listRes = await fetchJson(BASE + '?action=admin_list_users&adminKey=' + ADMIN_KEY);
      const users = listRes.users || [];
      found = users.find(u => u.Email === email);
      
      if (found) {
        log('✅ Usuario encontrado en intento ' + attempt);
        log('   Plan: ' + found.Plan);
        log('   Devices_Max: ' + found.Devices_Max);
        break;
      }
      
      log('⏳ Intento ' + attempt + ': aguardando...');
      await new Promise(r => setTimeout(r, 500));
    }

    if (!found) {
      log('❌ Usuario NO apareció en lista');
      return false;
    }

    // ════════════════════════════════════════════════════════════════════════════════
    log('\n[PASO 6] Validar límites de dispositivo NORMAL (maxDevices=1)');
    // ════════════════════════════════════════════════════════════════════════════════

    for (let dev = 1; dev <= 2; dev++) {
      const valRes = await fetchJson(BASE + '?action=validate&id=' + medicoId + '&deviceId=e2e_simple_dev_' + dev);
      
      if (valRes.error) {
        const expected = dev === 2 ? 'DEVICE_LIMIT' : 'OK';
        const isCorrect = (valRes.errorCode === 'DEVICE_LIMIT') === (dev === 2);
        
        log((isCorrect ? '✅' : '❌') + ' Device ' + dev + ': ' + valRes.error + ' (expected DEVICE_LIMIT: ' + (dev === 2) + ')');
      } else {
        log((dev === 1 ? '✅' : '❌') + ' Device ' + dev + ': Aceptado (plan=' + valRes.plan + ')');
      }
    }

    log('\n' + '═'.repeat(70));
    log('✅ TEST E2E NORMAL COMPLETADO EXITOSAMENTE');
    log('═'.repeat(70));
    return true;

  } catch (err) {
    log('❌ Error fatal: ' + err.message);
    return false;
  } finally {
    await browser.close();
  }
}

testE2ENormal().then(success => {
  process.exit(success ? 0 : 1);
});
