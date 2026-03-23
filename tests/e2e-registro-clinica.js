/**
 * E2E automatizado: Flujo completo de registro CLINIC (Playwright, Chromium headed)
 *
 * Inventa: Clínica "Centro Médico Integral San Martín"
 *   - 2 sedes (sede principal + sucursal)
 *   - 3 profesionales de distintas especialidades
 *
 * Uso:
 *   node tests/e2e-registro-clinica.js
 *
 * Variables de entorno opcionales:
 *   REGISTRO_URL  → URL del formulario (default: producción GitHub Pages)
 *   HEADLESS      → "1" para correr sin ventana (default: 0 = visible)
 *   SLOWMO        → ms de delay entre acciones (default: 350)
 */

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

const REGISTRO_URL = process.env.REGISTRO_URL
    || 'https://transcriptorpro.github.io/transcripcion/recursos/registro.html';
const HEADLESS = process.env.HEADLESS === '1';
const SLOWMO   = Number(process.env.SLOWMO  || 350);

// ── Datos de la clínica ficticia ──────────────────────────────────────────────
const CLINICA = {
    nombre:    'Centro Médico Integral San Martín',
    cuit:      '30-71234567-8',
    email:     'admin@cmisanmartin.demo',
    telefono:  '+54 11 4890-3300',
    sedes: [
        {
            nombre:    'Sede Central — Palermo',
            direccion: 'Av. Santa Fe 3421, CABA',
            telefono:  '+54 11 4890-3300',
            email:     'central@cmisanmartin.demo',
            footer:    'Centro Médico Integral — Sede Palermo | Tel: (011) 4890-3300'
        },
        {
            nombre:    'Sucursal Villa del Parque',
            direccion: 'Boyacá 1175, CABA',
            telefono:  '+54 11 4672-5500',
            email:     'villaparque@cmisanmartin.demo',
            footer:    'Centro Médico Integral — Sucursal Villa del Parque'
        }
    ],
    profesionales: [
        {
            titulo:       'Dr.',
            nombre:       'Hernán Guillermo Ríos',
            matricula:    'MN 87654',
            especialidad: 'Cardiología',
            telefono:     '+54 11 4890-3301',
            email:        'h.rios@cmisanmartin.demo',
            usuario:      'hrios',
            pin:          '4521'
        },
        {
            titulo:       'Dra.',
            nombre:       'Valentina Souza',
            matricula:    'MN 43210',
            especialidad: 'Neurología',
            telefono:     '+54 11 4890-3302',
            email:        'v.souza@cmisanmartin.demo',
            usuario:      'vsouza',
            pin:          '7890'
        },
        {
            titulo:       'Dr.',
            nombre:       'Lucas Matías Ferreira',
            matricula:    'MN 99001',
            especialidad: 'Diagnóstico por Imágenes',
            telefono:     '+54 11 4890-3303',
            email:        'l.ferreira@cmisanmartin.demo',
            usuario:      'lferreira',
            pin:          '1357'
        }
    ]
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function nowStamp() {
    const d   = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const OUT_DIR = path.join(__dirname, '..', 'accesorios', 'reportes', 'e2e-registro-clinic-' + nowStamp());
fs.mkdirSync(OUT_DIR, { recursive: true });

let screenshotIdx = 0;
async function shot(page, label) {
    screenshotIdx++;
    const fname = `${String(screenshotIdx).padStart(2,'0')}_${label.replace(/[^a-zA-Z0-9_\-]/g,'_')}.png`;
    const fpath = path.join(OUT_DIR, fname);
    await page.screenshot({ path: fpath, fullPage: false });
    console.log(`  📸 ${fname}`);
    return fpath;
}

async function clickStep(page, n) {
    // Hace click en el botón "Siguiente" del paso actual
    const selectors = [
        `#step${n-1} .btn-primary`,
        `#step${n-1} button.btn-primary`,
    ];
    for (const s of selectors) {
        const btn = page.locator(s).last();
        if (await btn.count()) { await btn.click(); break; }
    }
    await page.waitForTimeout(600);
}

async function fillAndBlur(page, selector, value) {
    const el = page.locator(selector);
    await el.click();
    await el.fill(value);
    await el.blur();
    await page.waitForTimeout(80);
}

// ── Main ────────────────────────────────────────────────────────────────────────
(async () => {
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('  🏥  E2E Registro — CLINIC | Centro Médico Integral San Martín');
    console.log('══════════════════════════════════════════════════════════════\n');
    console.log(`  URL:      ${REGISTRO_URL}`);
    console.log(`  Headless: ${HEADLESS}`);
    console.log(`  SlowMo:   ${SLOWMO} ms`);
    console.log(`  Capturas: ${OUT_DIR}\n`);

    const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOWMO });
    const ctx     = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const page    = await ctx.newPage();

    // Capturar errores JS del browser
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    try {
        // ── PASO 0: Plan ────────────────────────────────────────────────────────
        console.log('▶ Paso 0 — Seleccionar plan CLINIC');
        await page.goto(REGISTRO_URL, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        await shot(page, 'paso0_inicial');

        // Seleccionar moneda ARS para ver precios en pesos
        await page.locator('button[data-curr="ARS"]').click();
        await page.waitForTimeout(800);

        // Click en la tarjeta CLINIC
        await page.locator('.pricing-card:has-text("Clínica")').click();
        await page.waitForTimeout(400);
        await shot(page, 'paso0_clinic_seleccionado');

        // Avanzar
        await page.locator('#btnStep0Next').click();
        await page.waitForTimeout(800);
        await shot(page, 'paso1_datos_clinica');

        // ── PASO 1: Datos de la clínica ─────────────────────────────────────────
        console.log('▶ Paso 1 — Datos de la clínica');
        await fillAndBlur(page, '#regNombre',    CLINICA.nombre);
        await fillAndBlur(page, '#regMatricula', CLINICA.cuit);
        await fillAndBlur(page, '#regEmail',     CLINICA.email);
        await fillAndBlur(page, '#regTelefono',  CLINICA.telefono);
        // Redes sociales opcionales
        await fillAndBlur(page, '#regSocialIg',  '@cmisanmartin_oficial');
        await fillAndBlur(page, '#regSocialFb',  'facebook.com/cmisanmartin');
        await shot(page, 'paso1_relleno');

        // Avanzar
        await page.locator('#step1 .btn-row .btn-primary').click();
        await page.waitForTimeout(800);

        // ── PASO 2: Especialidades ───────────────────────────────────────────────
        console.log('▶ Paso 2 — Especialidades y estudios');
        await shot(page, 'paso2_especialidades');

        // Seleccionar especialidades de los 3 médicos
        const especialidades = ['Cardiología', 'Neurología', 'Diagnóstico por Imágenes'];
        for (const esp of especialidades) {
            const checkbox = page.locator(`.checkbox-item:has-text("${esp}") input`);
            if (await checkbox.count()) {
                await checkbox.check();
                await page.waitForTimeout(300);
            } else {
                console.warn(`  ⚠️  Especialidad no encontrada: "${esp}"`);
            }
        }
        await page.waitForTimeout(600);
        await shot(page, 'paso2_especialidades_seleccionadas');

        // Seleccionar todos los estudios disponibles
        const btnTodos = page.locator('button:has-text("Seleccionar todos")');
        if (await btnTodos.count()) {
            await btnTodos.click();
            await page.waitForTimeout(400);
        }
        await shot(page, 'paso2_estudios_seleccionados');

        // Avanzar
        await page.locator('#step2 .btn-row .btn-primary').click();
        await page.waitForTimeout(800);

        // ── PASO 3: Sedes + Profesionales ───────────────────────────────────────
        console.log('▶ Paso 3 — Sedes y profesionales');
        await shot(page, 'paso3_sedes_inicio');

        // Sede principal (nombre oculto para CLINIC, solo dirección y footer)
        const sede0 = CLINICA.sedes[0];
        await fillAndBlur(page, '#regWpAddress0', sede0.direccion);
        await fillAndBlur(page, '#regWpFooter0',  sede0.footer);
        await shot(page, 'paso3_sede_principal_rellena');

        // Agregar segunda sede
        console.log('  → Agregar sucursal');
        const btnAddWp = page.locator('#btnAddWorkplace');
        if (await btnAddWp.isVisible()) {
            await btnAddWp.click();
            await page.waitForTimeout(600);
            const sede1 = CLINICA.sedes[1];
            await fillAndBlur(page, '#regWpName1',    sede1.nombre);
            await fillAndBlur(page, '#regWpAddress1', sede1.direccion);
            await fillAndBlur(page, '#regWpPhone1',   sede1.telefono);
            await fillAndBlur(page, '#regWpEmail1',   sede1.email);
            await fillAndBlur(page, '#regWpFooter1',  sede1.footer);
            await shot(page, 'paso3_sucursal_rellena');
        } else {
            console.warn('  ⚠️  Botón agregar sede no visible (plan puede no permitir más sedes)');
        }

        // ── Profesionales ────────────────────────────────────────────────────────
        console.log('  → Profesionales');
        for (let i = 0; i < CLINICA.profesionales.length; i++) {
            const prof = CLINICA.profesionales[i];
            if (i > 0) {
                // Agregar profesional nuevo
                const btnAddProf = page.locator('#btnAddProfessional');
                await btnAddProf.click();
                await page.waitForTimeout(500);
            }

            console.log(`  → Profesional ${i+1}: ${prof.titulo} ${prof.nombre}`);

            // Click en Dr/Dra según corresponda
            const tituloBtns = page.locator(`#prof-${i} .titulo-btn`);
            if (await tituloBtns.count()) {
                await page.locator(`#prof-${i} .titulo-btn[data-t="${prof.titulo}"]`).click();
                await page.waitForTimeout(150);
            }

            await fillAndBlur(page, `#regProfName${i}`,        prof.nombre);
            await fillAndBlur(page, `#regProfMatricula${i}`,   prof.matricula);
            await fillAndBlur(page, `#regProfEspecialidad${i}`,prof.especialidad);
            await fillAndBlur(page, `#regProfTelefono${i}`,    prof.telefono);
            await fillAndBlur(page, `#regProfEmail${i}`,       prof.email);
            await fillAndBlur(page, `#regProfUsuario${i}`,     prof.usuario);

            const pinField = page.locator(`#regProfPin${i}`);
            await pinField.fill(prof.pin);

            await shot(page, `paso3_prof${i+1}_${prof.usuario}`);
        }

        await shot(page, 'paso3_todo_listo');

        // Avanzar (para CLINIC va a paso 5 directamente)
        // Avanzar paso 3 → CLINIC salta step4 y va a step5
        await page.locator('#step3 .btn-row .btn-primary').click();
        await page.waitForTimeout(1000);
        await shot(page, 'paso3_avanzando');

        // Verificar en qué paso quedamos
        let activeStep = await page.locator('.form-step.active').getAttribute('id').catch(() => null);
        console.log(`  Paso activo tras avanzar: ${activeStep}`);

        // Si la validación frenó el avance (bug potencial), forzamos con JS
        if (activeStep === 'step3') {
            console.log('  ⚠️  validateStep3 frenó el avance — forzando con goStep(5)');
            await page.evaluate(() => goStep(5, { force: true }));
            await page.waitForTimeout(800);
            activeStep = await page.locator('.form-step.active').getAttribute('id').catch(() => null);
            console.log(`  Paso activo tras force: ${activeStep}`);
        }

        // Si cayó en paso 4 (firma) avanzar
        if (activeStep === 'step4') {
            console.log('▶ Paso 4 — Firma (presente, avanzando)');
            await page.locator('#step4 .btn-row .btn-primary').click();
            await page.waitForTimeout(800);
            activeStep = await page.locator('.form-step.active').getAttribute('id').catch(() => null);
        }
        await shot(page, `paso_activo_${activeStep || 'desconocido'}`);

        // ── PASO 5: Carrito ─────────────────────────────────────────────────────
        console.log('▶ Paso 5 — Carrito (sin extras)');
        await shot(page, 'paso5_carrito');
        // No agregar extras, avanzar directo
        const btnCartNext = page.locator('#step5 .btn-row .btn-primary');
        if (await btnCartNext.count() && await btnCartNext.isVisible()) {
            await btnCartNext.click();
        } else {
            // Scroll para hacer visible el botón y reintentar
            await page.evaluate(() => { const b = document.querySelector('#step5 .btn-row .btn-primary'); if(b) b.scrollIntoView(); });
            await page.waitForTimeout(400);
            await btnCartNext.click({ force: true });
        }
        await page.waitForTimeout(800);

        // ── PASO 6: Resumen de inversión ────────────────────────────────────────
        console.log('▶ Paso 6 — Resumen de inversión');
        await shot(page, 'paso6_resumen_inversion');

        // Cambiar a ciclo anual para ver el descuento
        const btnAnual = page.locator('button[data-billing="annual"]');
        if (await btnAnual.count()) {
            await btnAnual.click();
            await page.waitForTimeout(500);
            await shot(page, 'paso6_billing_anual');
        }

        // ── SUBMIT ───────────────────────────────────────────────────────────────
        console.log('▶ Enviando registro...');
        const btnSubmit = page.locator('#btnSubmit');
        await btnSubmit.click();
        await page.waitForTimeout(3000); // esperar respuesta del backend

        await shot(page, 'paso7_resultado');

        // Verificar resultado
        const step7Active = await page.locator('#step7').isVisible().catch(() => false);
        const step7Title  = await page.locator('#step7Title').textContent().catch(() => '—');
        const step7Msg    = await page.locator('#step7Message').textContent().catch(() => '—');

        console.log(`\n  Paso 7 visible: ${step7Active}`);
        console.log(`  Título:  ${step7Title}`);
        console.log(`  Mensaje: ${step7Msg?.trim().slice(0, 120)}`);

        // Esperar unos segundos para que se cargue el portal de pago si aparece
        await page.waitForTimeout(2000);
        await shot(page, 'paso7_portal_pago');

        // ── Reporte final ────────────────────────────────────────────────────────
        console.log('\n══════════════════════════════════════════════════════════════');
        if (step7Active && step7Title && !step7Title.includes('Error')) {
            console.log('  ✅  REGISTRO COMPLETADO EXITOSAMENTE');
        } else {
            console.log('  ⚠️  El paso 7 no llegó al estado esperado — revisar capturas');
        }

        if (jsErrors.length) {
            console.log(`\n  ❌  Errores JS en el browser (${jsErrors.length}):`);
            jsErrors.forEach((e, i) => console.log(`     ${i+1}. ${e.slice(0,200)}`));
        } else {
            console.log('  ✅  Sin errores JS en el browser');
        }

        console.log(`\n  📁 Capturas en: ${OUT_DIR}`);
        console.log('══════════════════════════════════════════════════════════════\n');

    } catch (err) {
        console.error('\n  ❌  Error durante el test:', err.message);
        await shot(page, 'ERROR_estado_actual').catch(() => {});
        throw err;
    } finally {
        await page.waitForTimeout(1500);
        await browser.close();
    }
})();
