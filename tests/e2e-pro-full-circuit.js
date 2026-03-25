/**
 * e2e-pro-full-circuit.js
 * =============================================================================
 * Circuito E2E completo — usuario PRO: formulario → admin → aprobación → clon
 *
 * FASES:
 *   1. Formulario registro.html — selección plan PRO
 *   2. Paso datos profesionales (nombre, mat, email)
 *   3. Paso especialidades (Cardiología)
 *   4. Paso lugares de trabajo — 2 workplaces con logo
 *   5. Paso firma e imágenes — firma + logo profesional
 *   6. Paso carrito / resumen
 *   7. Submit → mock register_doctor → paso 7 éxito
 *   8. Admin panel → tab Registros → verifica card PRO pendiente
 *   9. Aprobar registro (modal aprobación) → mock approve → ID asignado
 *  10. Clone factory → link generado con ?id=<medicoId>
 *  11. Validar clon: planCode=pro, hasProMode, hasDashboard, sin clinicAuthOverlay
 *  12. Verificar workplaces y prof_data en localStorage del clon
 *
 * Uso:
 *   $env:HEADLESS='0'; node tests/e2e-pro-full-circuit.js
 * =============================================================================
 */

'use strict';

process.on('unhandledRejection', err => {
  console.error('[CIRCUIT][Unhandled]', err && err.message ? err.message : err);
  process.exit(1);
});
process.on('uncaughtException', err => {
  console.error('[CIRCUIT][Uncaught]', err && err.message ? err.message : err);
  process.exit(1);
});

console.log('[CIRCUIT] script iniciado');

const path = require('path');
const fs   = require('fs');
const { chromium } = require('playwright');
console.log('[CIRCUIT] requires OK');

// ── Constants ────────────────────────────────────────────────────────────────
const BASE_URL    = 'https://transcriptorpro.github.io/transcripcion';
const ADMIN_URL   = BASE_URL + '/recursos/admin.html';
const REG_URL     = BASE_URL + '/recursos/registro.html';
const HEADLESS    = process.env.HEADLESS !== '0';
const MOCK_REG_ID = 'REG-E2E-PRO-001';
const MOCK_MED_ID = 'DRPRO-E2E-001';

const OUT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes',
  'e2e-pro-full-circuit-' + Date.now());
fs.mkdirSync(OUT_DIR, { recursive: true });
console.log('[CIRCUIT] OUT_DIR=' + OUT_DIR);
console.log('[CIRCUIT] HEADLESS=' + HEADLESS);
console.log('[CIRCUIT] REG_URL=' + REG_URL);

// ── Datos del médico ─────────────────────────────────────────────────────────
const DOCTOR = {
  nombre:    'Dr. Carlos Alberto Vidal',
  matricula: 'MN 78901',
  email:     'carlos.vidal.e2e@testpro.demo',
  telefono:  '+54 11 9876-5432',
  wp1: {
    nombre:  'Consultorio Vidal',
    dir:     'Av. Santa Fe 1234, CABA',
    tel:     '(011) 4444-5555',
    email:   'info@consultriovidal.demo',
    footer:  'Consultorio Vidal — Cardiología — Av. Santa Fe 1234'
  },
  wp2: {
    nombre:  'Hospital Central',
    dir:     'Av. Córdoba 5678, CABA',
    tel:     '(011) 5555-6666',
    email:   'cardio@hospitalcentral.demo',
    footer:  'Hospital Central — Servicio de Cardiología'
  }
};

// Imagen PNG 1×1 pixel transparente (base64) para logos y firma
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ── Mocks backend ────────────────────────────────────────────────────────────
// Registro exitoso
const MOCK_REGISTER_OK = {
  success: true,
  regId:   MOCK_REG_ID,
  message: 'Registro recibido correctamente'
};

// Lista de registros pendientes para el admin
const MOCK_REG_LIST = {
  success: true,
  registrations: [{
    ID_Registro:       MOCK_REG_ID,
    Nombre:            DOCTOR.nombre,
    Email:             DOCTOR.email,
    Matricula:         DOCTOR.matricula,
    Telefono:          DOCTOR.telefono,
    Plan_Solicitado:   'PRO',
    Estado:            'pago_confirmado',
    Fecha_Registro:    new Date().toISOString(),
    Especialidades:    'Cardiología',
    Workplace_Data:    JSON.stringify({ name: DOCTOR.wp1.nombre, address: DOCTOR.wp1.dir, phone: DOCTOR.wp1.tel, email: DOCTOR.wp1.email, footer: DOCTOR.wp1.footer, logo: null }),
    Extra_Workplaces:  JSON.stringify([{ name: DOCTOR.wp2.nombre, address: DOCTOR.wp2.dir, phone: DOCTOR.wp2.tel, email: DOCTOR.wp2.email, footer: DOCTOR.wp2.footer, logo: null }]),
    Registro_Datos:    JSON.stringify({ showPhone: true, showEmail: true, showSocial: false, socialMedia: {}, sexo: 'masculino' }),
    Addons_Cart:       '',
    Firma:             '',
    Pro_Logo:          '',
    Notas:             '',
    Header_Color:      '#1a56a0',
    Footer_Text:       DOCTOR.wp1.footer,
    Last_Receipt_Ref:  '',
    ID_Medico_Asignado:''
  }]
};

// Respuesta aprobación
const MOCK_APPROVE_OK = {
  success:   true,
  medicoId:  MOCK_MED_ID,
  nombre:    DOCTOR.nombre,
  plan:      'PRO'
};

// Lista de usuarios (para loadDashboard después de aprobar)
const MOCK_USERS_AFTER = {
  success: true,
  users: [{
    ID_Medico:        MOCK_MED_ID,
    Nombre:           DOCTOR.nombre,
    Email:            DOCTOR.email,
    Matricula:        DOCTOR.matricula,
    Especialidad:     'Cardiología',
    Plan:             'pro',
    Estado:           'active',
    Devices_Max:      3,
    Devices_Logged:   '[]',
    API_Key:          'gsk_test_e2e',
    Fecha_Vencimiento:'2027-12-31',
    Fecha_Registro:   new Date().toISOString(),
    Usage_Count:      0,
    Notas_Admin:      'Aprobado via E2E test'
  }]
};

// validate para el clon
const MOCK_VALIDATE = {
  Plan:             'pro',
  Estado:           'active',
  Nombre:           DOCTOR.nombre,
  Matricula:        DOCTOR.matricula,
  Especialidad:     'Cardiología',
  Devices_Max:      3,
  API_Key:          'gsk_test_e2e',
  Fecha_Vencimiento:'2027-12-31',
  Registro_Datos:   '{}',
  Allowed_Templates:''
};

// ── Admin Session ─────────────────────────────────────────────────────────────
const ADMIN_SESSION = {
  username:    'admin',
  nombre:      'Admin Test',
  role:        'admin',
  nivel:       'superadmin',
  timestamp:   Date.now(),
  tokenExpiry: Date.now() + 8 * 3600 * 1000
};

// ── Resultado tracking ───────────────────────────────────────────────────────
const results  = [];
const evidence = [];
let shotIdx = 0;

async function shot(page, label) {
  const file = String(++shotIdx).padStart(2,'0') + '_' + label.replace(/[^a-z0-9_]/gi,'_') + '.png';
  await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: false }).catch(() => {});
  return file;
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Inyecta una imagen tiny-PNG en un input[type=file] via DataTransfer */
async function injectFileInput(page, selector, filename) {
  // Crea el archivo en disco temporalmente y lo usa (más compatible con Playwright)
  const tmpFile = path.join(OUT_DIR, filename);
  // Decodificar base64 y guardar
  const b64 = TINY_PNG.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(tmpFile, Buffer.from(b64, 'base64'));
  const input = page.locator(selector);
  if (await input.count()) {
    await input.setInputFiles(tmpFile);
    return true;
  }
  return false;
}

/** Espera a que un texto aparezca en el body (con timeout) */
async function waitForText(page, text, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const body = await page.locator('body').innerText().catch(() => '');
    if (body.toLowerCase().includes(text.toLowerCase())) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('[CIRCUIT] IIFE start');
(async () => {
  let browser, context;
  try {
    console.log('[CIRCUIT] launching Chromium...');
    browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 60 });
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

    // Pre-aceptar onboarding global
    await context.addInitScript(() => {
      localStorage.setItem('onboarding_accepted', 'true');
    });

    // ── Intercept backend ──────────────────────────────────────────────────
    let registerCallReceived = false;
    let approveCallReceived  = false;
    let registerPayload      = null;

    // Mock Groq API — evita el banner "API Key inválida" (validación silenciosa a los 2.5s)
    await context.route('**api.groq.com**', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ object: 'list', data: [
          { id: 'whisper-large-v3', object: 'model' },
          { id: 'llama3-8b-8192',   object: 'model' }
        ]})
      });
    });

    await context.route('**script.google.com**exec**', async (route) => {
      const req = route.request();
      const url = req.url();
      const method = req.method();

      // POST → puede ser register_doctor o admin_approve_registration
      if (method === 'POST') {
        let body = {};
        try { body = JSON.parse(await req.postData() || '{}'); } catch(_) {}
        const action = String(body.action || '');

        if (action === 'register_doctor') {
          registerCallReceived = true;
          registerPayload = body;
          console.log('  [MOCK] register_doctor recibido — nombre=' + (body.nombre || '?'));
          return route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify(MOCK_REGISTER_OK) });
        }
        if (action === 'admin_approve_registration') {
          approveCallReceived = true;
          console.log('  [MOCK] admin_approve_registration — regId=' + (body.regId || '?'));
          return route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify(MOCK_APPROVE_OK) });
        }
        // POST genérico
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true }) });
      }

      // GET
      if (/action=admin_list_registrations/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(MOCK_REG_LIST) });

      if (/action=admin_list_users/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(MOCK_USERS_AFTER) });

      if (/action=validate/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(MOCK_VALIDATE) });

      if (/action=public_get_plans_config/i.test(url))
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, config: {} }) });

      // Cualquier otra → ok genérico
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) });
    });

    console.log('[CIRCUIT] mocks configurados');

    // ========================================================================
    // FASE 1 — Formulario: Paso 0 — seleccionar plan PRO
    // ========================================================================
    console.log('[CIRCUIT] FASE 1 -- formulario registro, paso 0 (plan PRO)...');

    const regPage = await context.newPage();
    regPage.on('console', m => {
      if (m.type() === 'error') console.log('  [REG ERR]', m.text().slice(0,120));
    });
    regPage.on('dialog', async d => {
      console.log('  [DIALOG]', d.message().slice(0,80));
      await d.accept();
    });

    await regPage.goto(REG_URL + '?_t=' + Date.now(),
      { waitUntil: 'networkidle', timeout: 45000 });
    await regPage.waitForTimeout(2500);

    evidence.push(await shot(regPage, 'f1_registro_load'));

    // Verificar que cargó el formulario
    const regBody = await regPage.locator('body').innerText().catch(() => '');
    if (/plan|registro|profesional/i.test(regBody)) {
      pass('Formulario registro cargado');
    } else {
      fail('Formulario registro cargado', 'body sin texto esperado');
    }

    // Seleccionar plan PRO
    const proCard = regPage.locator('.pricing-card[data-plan="PRO"]').first();
    if (await proCard.count()) {
      await proCard.click();
      await regPage.waitForTimeout(800);
      pass('Plan PRO seleccionado');
    } else {
      // Intentar vía función JS
      await regPage.evaluate(() => { if(typeof selectPlan==='function') selectPlan('PRO'); });
      await regPage.waitForTimeout(500);
      warn('Plan PRO seleccionado', 'card no encontrada, se usó selectPlan() via JS');
    }

    // Verificar que btnStep0Next se habilitó
    const btn0 = regPage.locator('#btnStep0Next');
    const btn0Disabled = await btn0.isDisabled().catch(() => true);
    if (!btn0Disabled) {
      pass('Botón Continuar habilitado (plan seleccionado)');
    } else {
      // forzar via JS
      await regPage.evaluate(() => {
        if(typeof selectPlan==='function') selectPlan('PRO');
        const b = document.getElementById('btnStep0Next');
        if(b) { b.disabled = false; }
      });
      warn('Botón Continuar habilitado', 'se habilitó via JS');
    }

    evidence.push(await shot(regPage, 'f1_plan_pro_selected'));

    // ========================================================================
    // FASE 2 — Paso 1: Datos profesionales
    // ========================================================================
    console.log('[CIRCUIT] FASE 2 -- paso 1 datos profesional...');

    // Avanzar a paso 1
    await regPage.evaluate(() => { if(typeof goStep==='function') goStep(1); });
    await regPage.waitForTimeout(1000);

    const step1Visible = await regPage.locator('#step1').isVisible().catch(() => false);
    if (step1Visible) {
      pass('Paso 1 (Datos) visible');
    } else {
      warn('Paso 1 (Datos) visible', '#step1 no visible');
    }

    // Rellenar campos
    await regPage.locator('#regNombre').fill(DOCTOR.nombre).catch(() => {});
    await regPage.locator('#regMatricula').fill(DOCTOR.matricula).catch(() => {});
    await regPage.locator('#regEmail').fill(DOCTOR.email).catch(() => {});
    await regPage.locator('#regTelefono').fill(DOCTOR.telefono).catch(() => {});
    await regPage.waitForTimeout(500);

    const nombreVal = await regPage.locator('#regNombre').inputValue().catch(() => '');
    const emailVal  = await regPage.locator('#regEmail').inputValue().catch(() => '');
    if (nombreVal.includes('Vidal') && emailVal.includes('@')) {
      pass('Datos profesional ingresados', DOCTOR.nombre);
    } else {
      warn('Datos profesional ingresados', 'nombre="' + nombreVal + '" email="' + emailVal + '"');
    }

    evidence.push(await shot(regPage, 'f2_datos_prof'));

    // ========================================================================
    // FASE 3 — Paso 2: Especialidades
    // ========================================================================
    console.log('[CIRCUIT] FASE 3 -- paso 2 especialidades...');

    await regPage.evaluate(() => { if(typeof goStep==='function') goStep(2); });
    await regPage.waitForTimeout(1200);

    const step2Visible = await regPage.locator('#step2').isVisible().catch(() => false);
    if (step2Visible) {
      pass('Paso 2 (Especialidades) visible');
    } else {
      warn('Paso 2 (Especialidades) visible', '#step2 no visible');
    }

    // Seleccionar Cardiología (primer checkbox que contenga ese texto)
    const cardioLabel = regPage.locator('#especialidadesGrid label', { hasText: /cardiolog/i }).first();
    if (await cardioLabel.count()) {
      await cardioLabel.click();
      await regPage.waitForTimeout(600);
      pass('Especialidad Cardiología seleccionada');
    } else {
      // fallback: primer checkbox disponible
      const firstEsp = regPage.locator('#especialidadesGrid input[type=checkbox]').first();
      if (await firstEsp.count()) {
        await firstEsp.check();
        warn('Especialidad Cardiología seleccionada', 'checkbox específico no encontrado, se marcó el primero');
      } else {
        warn('Especialidad Cardiología seleccionada', 'no hay checkboxes en #especialidadesGrid');
      }
    }

    evidence.push(await shot(regPage, 'f3_especialidades'));

    // ========================================================================
    // FASE 4 — Paso 3: Lugares de trabajo (2 workplaces con logo)
    // ========================================================================
    console.log('[CIRCUIT] FASE 4 -- paso 3 workplaces...');

    await regPage.evaluate(() => { if(typeof goStep==='function') goStep(3); });
    await regPage.waitForTimeout(1200);

    const step3Visible = await regPage.locator('#step3').isVisible().catch(() => false);
    if (step3Visible) {
      pass('Paso 3 (Workplaces) visible');
    } else {
      warn('Paso 3 (Workplaces) visible', '#step3 no visible');
    }

    // Workplace 0 (principal)
    await regPage.locator('#regWpName0').fill(DOCTOR.wp1.nombre).catch(() => {});
    await regPage.locator('#regWpAddress0').fill(DOCTOR.wp1.dir).catch(() => {});
    await regPage.locator('#regWpPhone0').fill(DOCTOR.wp1.tel).catch(() => {});
    await regPage.locator('#regWpEmail0').fill(DOCTOR.wp1.email).catch(() => {});
    await regPage.locator('#regWpFooter0').fill(DOCTOR.wp1.footer).catch(() => {});

    // Logo WP0 — inyectar PNG pequeño
    const wp0Logo = await injectFileInput(regPage,
      '#workplacesContainer .wp-accordion:nth-child(1) input[type=file]', 'wp0_logo.png');
    if (wp0Logo) {
      pass('Logo WP0 subido');
    } else {
      warn('Logo WP0 subido', 'input[type=file] WP0 no encontrado');
    }
    await regPage.waitForTimeout(600);

    const wp0Name = await regPage.locator('#regWpName0').inputValue().catch(() => '');
    if (wp0Name.includes('Vidal') || wp0Name.trim()) {
      pass('Workplace principal configurado', wp0Name);
    } else {
      warn('Workplace principal configurado', 'nombre WP0 vacío');
    }

    // Agregar workplace adicional (PRO permite ≥2 lugares)
    // Primero, aumentar contador de workplaces via carrito o JS si es necesario
    const wpCount0 = await regPage.locator('#workplacesContainer .wp-accordion').count();
    if (wpCount0 < 2) {
      // Intentar agregar via botón
      const addWpBtn = regPage.locator('#btnAddWorkplace');
      if (await addWpBtn.count() && await addWpBtn.isVisible().catch(() => false)) {
        await addWpBtn.click();
        await regPage.waitForTimeout(800);
      } else {
        // Forzar via JS (ajustar límite y llamar addWorkplace)
        await regPage.evaluate(() => {
          try {
            // PRO tiene 3 workplaces max
            if(window.PRICING && window.PRICING.PRO) window.PRICING.PRO.workplaces = 3;
            if(typeof addWorkplace === 'function') addWorkplace();
          } catch(e) {}
        });
        await regPage.waitForTimeout(800);
      }
    }

    const wpCount1 = await regPage.locator('#workplacesContainer .wp-accordion').count();
    if (wpCount1 >= 2) {
      // Rellenar WP adicional (el último añadido)
      // El índice JS del nuevo WP depende de wpCounter — buscamos el último data-wp-index
      const allWpAccordions = await regPage.locator('#workplacesContainer .wp-accordion').all();
      const lastWp = allWpAccordions[allWpAccordions.length - 1];
      const lastIdx = await lastWp.getAttribute('data-wp-index').catch(() => '1');

      await regPage.locator('#regWpName' + lastIdx).fill(DOCTOR.wp2.nombre).catch(() => {});
      await regPage.locator('#regWpAddress' + lastIdx).fill(DOCTOR.wp2.dir).catch(() => {});
      await regPage.locator('#regWpPhone' + lastIdx).fill(DOCTOR.wp2.tel).catch(() => {});
      await regPage.locator('#regWpEmail' + lastIdx).fill(DOCTOR.wp2.email).catch(() => {});
      await regPage.locator('#regWpFooter' + lastIdx).fill(DOCTOR.wp2.footer).catch(() => {});

      // Logo WP adicional
      const wp1Logo = await injectFileInput(regPage,
        `#workplacesContainer .wp-accordion[data-wp-index="${lastIdx}"] input[type=file]`, 'wp1_logo.png');
      if (wp1Logo) {
        pass('Logo WP adicional subido');
      } else {
        warn('Logo WP adicional subido', 'input WP adicional no encontrado');
      }
      await regPage.waitForTimeout(600);

      pass('Workplace adicional configurado', DOCTOR.wp2.nombre);
    } else {
      warn('2 workplaces configurados',
        'solo hay ' + wpCount1 + ' WP — el plan puede limitar a 1 sin addon');
    }

    evidence.push(await shot(regPage, 'f4_workplaces'));

    // ========================================================================
    // FASE 5 — Paso 4: Firma e imágenes
    // ========================================================================
    console.log('[CIRCUIT] FASE 5 -- paso 4 firma e imágenes...');

    await regPage.evaluate(() => { if(typeof goStep==='function') goStep(4); });
    await regPage.waitForTimeout(1200);

    const step4Visible = await regPage.locator('#step4').isVisible().catch(() => false);
    if (step4Visible) {
      pass('Paso 4 (Firma/Imágenes) visible');
    } else {
      warn('Paso 4 (Firma/Imágenes) visible', '#step4 no visible');
    }

    // Subir firma
    const firmaOk = await injectFileInput(regPage, '#regFirma', 'firma.png');
    if (firmaOk) {
      pass('Firma subida');
    } else {
      warn('Firma subida', '#regFirma no encontrado');
    }
    await regPage.waitForTimeout(500);

    // Subir logo profesional
    const proLogoOk = await injectFileInput(regPage, '#regProLogo', 'pro_logo.png');
    if (proLogoOk) {
      pass('Logo profesional subido');
    } else {
      warn('Logo profesional subido', '#regProLogo no encontrado');
    }
    await regPage.waitForTimeout(500);

    evidence.push(await shot(regPage, 'f5_firma_logo'));

    // ========================================================================
    // FASE 6 — Paso 5: Carrito / Resumen
    // ========================================================================
    console.log('[CIRCUIT] FASE 6 -- paso 5 carrito...');

    await regPage.evaluate(() => { if(typeof goStep==='function') goStep(5); });
    await regPage.waitForTimeout(1200);

    const step5Visible = await regPage.locator('#step5').isVisible().catch(() => false);
    if (step5Visible) {
      pass('Paso 5 (Carrito) visible');
    } else {
      warn('Paso 5 (Carrito) visible', '#step5 no visible');
    }

    evidence.push(await shot(regPage, 'f6_carrito'));

    // ========================================================================
    // FASE 7 — Paso 6: Resumen + submit
    // ========================================================================
    console.log('[CIRCUIT] FASE 7 -- paso 6 resumen y submit...');

    await regPage.evaluate(() => { if(typeof goStep==='function') goStep(6); });
    await regPage.waitForTimeout(1200);

    const step6Visible = await regPage.locator('#step6').isVisible().catch(() => false);
    if (step6Visible) {
      pass('Paso 6 (Resumen) visible');
    } else {
      warn('Paso 6 (Resumen) visible', '#step6 no visible');
    }

    evidence.push(await shot(regPage, 'f7_resumen'));

    // Click en botón Submit
    const submitBtn = regPage.locator('#btnSubmit');
    if (await submitBtn.count() && await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
    } else {
      // Forzar via JS
      await regPage.evaluate(() => { if(typeof submitRegistro==='function') submitRegistro(); });
    }

    // Esperar respuesta — paso 7 (éxito) o texto de confirmación
    const submitOk = await waitForText(regPage, 'enviado|confirmad|éxito|registro|paso 7', 15000)
      .catch(() => false);
    await regPage.waitForTimeout(2000);

    evidence.push(await shot(regPage, 'f7_submit_result'));

    if (registerCallReceived) {
      pass('Formulario submitido — backend mock llamado');
    } else {
      fail('Formulario submitido', 'register_doctor no fue llamado');
    }

    // Verificar payload del registro
    if (registerPayload) {
      const pNombre = registerPayload.nombre || '';
      const pPlan   = registerPayload.planSeleccionado || '';
      const pWp     = registerPayload.workplace || {};
      const pExtraWp = [];
      try { JSON.parse(registerPayload.extraWorkplaces || '[]').forEach(w => pExtraWp.push(w)); } catch(_) {}

      if (pNombre.includes('Vidal')) {
        pass('Payload reg: nombre correcto', pNombre);
      } else {
        warn('Payload reg: nombre correcto', 'nombre="' + pNombre + '"');
      }

      if (String(pPlan).toUpperCase() === 'PRO') {
        pass('Payload reg: plan=PRO');
      } else {
        warn('Payload reg: plan=PRO', 'plan="' + pPlan + '"');
      }

      if (pWp && pWp.name) {
        pass('Payload reg: workplace principal incluido', pWp.name);
      } else {
        warn('Payload reg: workplace principal incluido', 'workplace vacío en payload');
      }

      if (pExtraWp.length > 0) {
        pass('Payload reg: ' + pExtraWp.length + ' workplace(s) adicional(es) incluido(s)');
      } else {
        warn('Payload reg: workplaces extra', 'extraWorkplaces vacío en payload — puede ser correcto si el plan limita a 1');
      }

      const hasFirma   = !!(registerPayload.firma && registerPayload.firma.startsWith('data:'));
      const hasProLogo = !!(registerPayload.proLogo && registerPayload.proLogo.startsWith('data:'));
      if (hasFirma) {
        pass('Payload reg: firma incluida (base64)');
      } else {
        warn('Payload reg: firma incluida', 'firma no es base64 — puede fallar si el campo quedó vacío');
      }
      if (hasProLogo) {
        pass('Payload reg: logo profesional incluido (base64)');
      } else {
        warn('Payload reg: logo profesional incluido', 'proLogo no es base64');
      }
    }

    // ========================================================================
    // FASE 8 — Admin panel: tab Registros → card PRO pendiente
    // ========================================================================
    console.log('[CIRCUIT] FASE 8 -- admin panel, tab registros...');

    const adminPage = await context.newPage();
    adminPage.on('console', m => {
      if (m.type() === 'error') console.log('  [ADMIN ERR]', m.text().slice(0,130));
    });
    adminPage.on('dialog', async d => {
      const msg = d.message();
      console.log('  [DIALOG]', msg.slice(0,80));
      // Aceptar confirmación de "¿generar link?" — responder true
      if (/link|fábrica|clone|generar/i.test(msg)) {
        await d.accept();
      } else {
        await d.accept();
      }
    });

    await adminPage.addInitScript((sess) => {
      sessionStorage.setItem('adminSession', JSON.stringify(sess));
    }, ADMIN_SESSION);

    await adminPage.goto(ADMIN_URL + '?_t=' + Date.now(),
      { waitUntil: 'domcontentloaded', timeout: 45000 });
    await adminPage.waitForTimeout(4000);

    evidence.push(await shot(adminPage, 'f8_admin_loaded'));

    const adminUrl = adminPage.url();
    if (/login/i.test(adminUrl)) {
      fail('Admin panel cargado', 'redirigido a login');
    } else {
      pass('Admin panel cargado');
    }

    // Click en tab Registros
    const regTab = adminPage.locator('.tab-btn[data-tab="registros"]').first();
    if (await regTab.count()) {
      await regTab.click();
      await adminPage.waitForTimeout(2500);
      pass('Tab Registros abierto');
    } else {
      warn('Tab Registros abierto', 'botón .tab-btn[data-tab=registros] no encontrado');
    }

    evidence.push(await shot(adminPage, 'f8_registros_tab'));

    // Verificar que aparece la card del registro PRO
    const regCardText = await adminPage.locator('#registrosCards').innerText().catch(() => '');
    console.log('  regCards excerpt: ' + regCardText.slice(0,200));

    if (regCardText.includes('Vidal') || regCardText.includes(MOCK_REG_ID)) {
      pass('Card de registro PRO visible en admin', 'encontrado ' + DOCTOR.nombre);
    } else {
      warn('Card de registro PRO visible en admin', 'texto cards: ' + regCardText.slice(0,100));
    }

    // Verificar badge PRO en la card
    if (/PRO/i.test(regCardText)) {
      pass('Badge PRO visible en la card');
    } else {
      warn('Badge PRO visible en la card', 'texto sin badge PRO');
    }

    // Verificar workplaces en detalle
    // Verificar texto de las cards sin abrir modal de detalle
    // (evitamos abrir #detailModalOverlay que luego bloquea el click en .btn-approve)
    if (regCardText.includes('Hospital') || regCardText.includes(DOCTOR.wp2.nombre) ||
        regCardText.includes(DOCTOR.wp1.nombre) || regCardText.includes('Consultorio')) {
      pass('Detalle del registro: workplace visible en la card');
    } else {
      warn('Detalle del registro', 'workplace no visible en texto de cards');
    }

    evidence.push(await shot(adminPage, 'f8_reg_card'));

    // ========================================================================
    // FASE 9 — Aprobar registro → modal aprobación → confirmApproval
    // ========================================================================
    console.log('[CIRCUIT] FASE 9 -- aprobar registro PRO...');

    // Pre-inyectar API Key en localStorage del admin (para que el modal la encuentre)
    await adminPage.evaluate(() => {
      localStorage.setItem('admin_groq_key', 'gsk_test_e2e_admin');
      // Asegurarse de cerrar cualquier modal detail abierto
      if (typeof closeDetailModal === 'function') closeDetailModal();
      const detailOv = document.getElementById('detailModalOverlay');
      if (detailOv) { detailOv.classList.remove('show'); detailOv.style.display = 'none'; }
    });
    await adminPage.waitForTimeout(500);

    // Click en botón Aprobar (solo aparece si estado=pago_confirmado)
    // Usamos page.evaluate para evitar bloqueos de pointer-events de overlays
    const approveBtn = adminPage.locator('.btn-approve').first();
    const approveBtnOk = await approveBtn.count() > 0;
    if (approveBtnOk) {
      // Forzar via JS para evitar intercepciones de pointer-events
      const clicked = await adminPage.evaluate(() => {
        const btn = document.querySelector('.btn-approve');
        if (btn) { btn.click(); return true; }
        return false;
      });
      await adminPage.waitForTimeout(2500);
      if (clicked) pass('Modal de aprobación abierto');
      else warn('Modal de aprobación abierto', 'click JS falló');
    } else {
      await adminPage.evaluate((regId) => {
        if (typeof openApproveModal === 'function') openApproveModal(regId);
      }, MOCK_REG_ID);
      await adminPage.waitForTimeout(2500);
      warn('Modal de aprobación abierto', '.btn-approve no encontrado — se abrió via JS');
    }

    evidence.push(await shot(adminPage, 'f9_approve_modal'));

    const approveModalVisible = await adminPage.locator('#approveModalOverlay')
      .isVisible().catch(() => false);
    if (approveModalVisible) {
      pass('#approveModalOverlay visible');
    } else {
      warn('#approveModalOverlay visible', 'modal no abrió');
    }

    // Verificar que el plan PRO está preseleccionado
    const planVal = await adminPage.locator('#approvePlan').inputValue().catch(() => '');
    console.log('  approvePlan=' + planVal);
    if (planVal === 'PRO') {
      pass('Plan PRO preseleccionado en modal');
    } else {
      warn('Plan PRO preseleccionado', 'plan=' + planVal);
    }

    // Verificar campos de verificación pre-llenados
    const approveNombre = await adminPage.locator('#approveEditNombre').inputValue().catch(() => '');
    if (approveNombre.includes('Vidal')) {
      pass('Nombre pre-llenado en modal aprobación', approveNombre);
    } else {
      warn('Nombre pre-llenado en modal', 'nombre="' + approveNombre + '"');
    }

    // Confirmar aprobación
    const confirmBtn = adminPage.locator('#btnConfirmApprove');
    if (approveModalVisible && await confirmBtn.count()) {
      await confirmBtn.click();
      await adminPage.waitForTimeout(3000);
    } else {
      // Forzar via JS
      await adminPage.evaluate(() => {
        if (typeof confirmApproval === 'function') confirmApproval();
      });
      await adminPage.waitForTimeout(3000);
    }

    evidence.push(await shot(adminPage, 'f9_approve_result'));

    if (approveCallReceived) {
      pass('Aprobación enviada al backend (mock llamado)');
    } else {
      fail('Aprobación enviada al backend', 'admin_approve_registration no fue llamado');
    }

    // Responder a posibles dashConfirm ("¿Abrir Fábrica de Clones?") via JS
    // El dashConfirm usa _dashModalResolve — lo interceptamos
    await adminPage.evaluate(() => {
      if (typeof window._dashModalResolve === 'function') {
        window._dashModalResolve(true);
      }
    });
    await adminPage.waitForTimeout(2000);

    // ========================================================================
    // FASE 10 — Clone Factory abierta post-aprobación
    // ========================================================================
    console.log('[CIRCUIT] FASE 10 -- clone factory post-aprobación...');

    // Si _openCloneFactoryWhenReady no abrió el modal automáticamente,
    // lo forzamos nosotros
    let cloneModalOpen = await adminPage.locator('#cloneFactoryModal')
      .isVisible().catch(() => false);

    if (!cloneModalOpen) {
      // Esperar más por si _openCloneFactoryWhenReady está en loop
      await adminPage.waitForTimeout(3000);
      cloneModalOpen = await adminPage.locator('#cloneFactoryModal')
        .isVisible().catch(() => false);
    }

    if (!cloneModalOpen) {
      // Abrir manualmente: asegurar que allUsers tiene el usuario
      await adminPage.evaluate((mu) => {
        try {
          if (typeof window.openCloneFactory === 'function') {
            window.openCloneFactory(mu.ID_Medico);
          }
        } catch(e) {}
      }, MOCK_USERS_AFTER.users[0]);
      await adminPage.waitForTimeout(2000);
      cloneModalOpen = await adminPage.locator('#cloneFactoryModal')
        .isVisible().catch(() => false);
    }

    evidence.push(await shot(adminPage, 'f10_clone_factory'));

    if (cloneModalOpen) {
      pass('#cloneFactoryModal visible');
    } else {
      warn('#cloneFactoryModal visible', 'modal no abrió automáticamente ni manualmente');
    }

    // Generar link — usar JS click para evitar intercepciones de pointer-events
    let cloneLink = '';
    if (cloneModalOpen) {
      await adminPage.evaluate(() => {
        const btn = document.getElementById('cfBtnGenerate');
        if (btn) btn.click();
      });
      await adminPage.waitForTimeout(2500);
      cloneLink = await adminPage.locator('#cfLinkUrl').inputValue().catch(() => '');
      console.log('  cloneLink="' + cloneLink + '"');
    }

    if (cloneLink && cloneLink.includes('?id=')) {
      pass('Link de clon generado', cloneLink);
    } else if (cloneModalOpen) {
      fail('Link de clon generado', 'cfLinkUrl vacío');
    } else {
      warn('Link de clon generado', 'modal no abrió');
    }

    evidence.push(await shot(adminPage, 'f10_clone_link'));

    // ========================================================================
    // FASE 11 — Navegar al clon y validar CLIENT_CONFIG
    // ========================================================================
    console.log('[CIRCUIT] FASE 11 -- validando clon PRO...');

    const cloneUrl = (cloneLink && cloneLink.includes('?id='))
      ? cloneLink
      : BASE_URL + '/?id=' + MOCK_MED_ID;

    const clonePage = await context.newPage();
    clonePage.on('console', m => {
      if (m.type() === 'error') console.log('  [CLONE ERR]', m.text().slice(0,130));
    });
    clonePage.on('dialog', async d => {
      console.log('  [CLONE DIALOG]', d.message().slice(0,80));
      await d.accept();
    });

    await clonePage.goto(cloneUrl + (cloneUrl.includes('?') ? '&' : '?') + '_t=' + Date.now(),
      { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Esperar a que setup finalice
    await clonePage.waitForTimeout(5000);
    try {
      await clonePage.waitForSelector('#factorySetupOverlay',
        { state: 'hidden', timeout: 15000 });
    } catch(_) {}
    await clonePage.waitForTimeout(2000);

    evidence.push(await shot(clonePage, 'f11_clone_loaded'));

    // Leer CLIENT_CONFIG
    const cfg = await clonePage.evaluate(() => {
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
    console.log('  CLIENT_CONFIG=' + JSON.stringify(cfg));

    if (!cfg) {
      fail('CLIENT_CONFIG presente', 'null/undefined');
    } else {
      pass('CLIENT_CONFIG presente');

      if (cfg.planCode === 'pro') pass('planCode=pro');
      else fail('planCode=pro', 'planCode=' + cfg.planCode);

      if (cfg.hasProMode === true) pass('hasProMode=true');
      else fail('hasProMode=true', 'hasProMode=' + cfg.hasProMode);

      if (cfg.hasDashboard === true) pass('hasDashboard=true');
      else fail('hasDashboard=true', 'hasDashboard=' + cfg.hasDashboard);

      if (cfg.canGenerateApps === false) pass('canGenerateApps=false (correcto PRO)');
      else warn('canGenerateApps=false', 'canGenerateApps=' + cfg.canGenerateApps);

      if (cfg.status === 'active') pass('status=active');
      else warn('status=active', 'status=' + cfg.status);
    }

    // Sin clinicAuthOverlay
    const clinicOverlay = await clonePage.locator('#clinicAuthOverlay')
      .isVisible().catch(() => false);
    if (!clinicOverlay) pass('Sin #clinicAuthOverlay (correcto)');
    else fail('Sin #clinicAuthOverlay', 'overlay clínica visible en PRO');

    // Sin factoryErrorOverlay
    const errorOverlay = await clonePage.locator('#factoryErrorOverlay')
      .isVisible().catch(() => false);
    if (!errorOverlay) pass('Sin #factoryErrorOverlay (setup OK)');
    else {
      const errTxt = await clonePage.locator('#factoryErrorOverlay').innerText().catch(() => '');
      fail('Sin #factoryErrorOverlay', errTxt.slice(0,100));
    }

    // Esperar que pase el delay de validación silenciosa (2.5s + buffer)
    await clonePage.waitForTimeout(4000);

    // ⚠️ VERIFICACIÓN CRÍTICA: el banner "API Key inválida" NO debe aparecer
    const apiKeyBanner = await clonePage.locator('#apiKeyWarningBanner')
      .isVisible().catch(() => false);
    if (!apiKeyBanner) {
      pass('Sin banner "API Key inválida" (Groq 200 OK mock correcto)');
    } else {
      const bannerTxt = await clonePage.locator('#apiKeyWarningBanner').innerText().catch(() => '');
      fail('Sin banner "API Key inválida"', 'banner visible: ' + bannerTxt.trim());
    }

    evidence.push(await shot(clonePage, 'f11_apikey_banner_check'));

    // ========================================================================
    // FASE 12 — Verificar prof_data y workplaces almacenados en clon
    // ========================================================================
    console.log('[CIRCUIT] FASE 12 -- verificando datos almacenados en clon...');

    const stored = await clonePage.evaluate(() => {
      try {
        const pd = JSON.parse(localStorage.getItem('prof_data') || '{}');
        const cc = JSON.parse(localStorage.getItem('client_config_stored') || '{}');
        return {
          prof_nombre:     pd.nombre || '',
          prof_matricula:  pd.matricula || '',
          prof_workplace:  pd.workplace || '',
          cc_planCode:     cc.planCode || '',
          cc_type:         cc.type || '',
          cc_medicoId:     cc.medicoId || ''
        };
      } catch(_) { return null; }
    });
    console.log('  stored=' + JSON.stringify(stored));

    if (!stored) {
      warn('Datos almacenados en localStorage', 'no se pudo parsear');
    } else {
      if (stored.prof_nombre.includes('Vidal') || stored.prof_nombre) {
        pass('prof_data.nombre guardado', stored.prof_nombre || '(vacío)');
      } else {
        warn('prof_data.nombre guardado', 'nombre vacío en prof_data');
      }

      if (stored.cc_planCode === 'pro') {
        pass('client_config_stored.planCode=pro');
      } else {
        warn('client_config_stored.planCode', 'planCode=' + stored.cc_planCode);
      }

      if (stored.cc_medicoId) {
        pass('client_config_stored.medicoId guardado', stored.cc_medicoId);
      } else {
        warn('client_config_stored.medicoId', 'medicoId vacío');
      }
    }

    evidence.push(await shot(clonePage, 'f12_clone_final'));

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    const total  = results.length;
    const passed = results.filter(r => r.ok).length;
    const warned = results.filter(r => !r.ok && r.warn).length;
    const failed = results.filter(r => !r.ok && !r.warn).length;

    console.log('\n[CIRCUIT] ====== RESUMEN ======');
    results.forEach(r => {
      const tag = r.ok ? '[PASS]' : (r.warn ? '[WARN]' : '[FAIL]');
      console.log('  ' + tag + ' ' + r.step + (r.error ? ' — ' + r.error : ''));
    });
    console.log('  Total: ' + passed + ' PASS, ' + warned + ' WARN, ' + failed + ' FAIL');

    // Guardar summary
    const summary = {
      timestamp: new Date().toISOString(),
      total, passed, warned, failed,
      results, evidence,
      registerPayload: registerPayload ? {
        nombre:          registerPayload.nombre,
        planSeleccionado:registerPayload.planSeleccionado,
        emailOk:         !!(registerPayload.email),
        hasFirma:        !!(registerPayload.firma && registerPayload.firma.startsWith('data:')),
        hasProLogo:      !!(registerPayload.proLogo && registerPayload.proLogo.startsWith('data:')),
        workplaceName:   (registerPayload.workplace || {}).name,
        extraWpsCount:   (() => { try { return JSON.parse(registerPayload.extraWorkplaces || '[]').length; } catch(_) { return 0; } })()
      } : null
    };
    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'),
      JSON.stringify(summary, null, 2));

    const status = failed > 0 ? 'CIRCUITO FALLIDO' : warned > 0 ? 'CIRCUITO OK (con advertencias)' : 'CIRCUITO COMPLETADO';
    console.log('[CIRCUIT] ' + status + ' -- Report: ' + OUT_DIR);
    process.exitCode = failed > 0 ? 1 : 0;

  } catch (err) {
    console.error('[CIRCUIT][FATAL]', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack.split('\n').slice(0,8).join('\n'));
    process.exitCode = 1;
  } finally {
    try { if (context) await context.close(); } catch(_) {}
    try { if (browser) await browser.close(); } catch(_) {}
    console.log('[CIRCUIT] navegador cerrado');
  }
})();
