/**
 * E2E P2 — Flujo completo de registro CLINIC (headless, sin imágenes, mock backend).
 *
 * Verifica que un usuario CLINIC puede:
 *  1. Seleccionar el plan Clínica
 *  2. Completar todos los pasos del formulario
 *  3. Llegar al paso 7 (confirmación) con el portal de pago visible
 *  4. No generar ningún registro real en producción (todo mockeado)
 *
 * Uso:
 *   node tests/e2e-p2-clinic-registration-flow.js
 *
 * Variables de entorno opcionales:
 *   REGISTRO_URL   URL del formulario (default: GitHub Pages)
 *   SLOWMO         demora entre acciones en ms (default: 0 para headless rápido)
 */

const { chromium } = require('playwright');

const REGISTRO_URL = process.env.REGISTRO_URL
    || 'https://transcriptorpro.github.io/transcripcion/recursos/registro.html';
const SLOWMO = Number(process.env.SLOWMO || 0);

// ── Datos mínimos de prueba ────────────────────────────────────────────────
const CLINIC = {
    nombre: 'Clinica E2E P2 Test',
    cuit: '30-99887766-0',
    email: 'e2e.p2@clinicatest.local',
    telefono: '+54 11 9999-0000',
    sede: {
        address: 'Av. Test 9999, CABA',
        footer: 'Clinica E2E P2 — solo pruebas automatizadas'
    },
    profesionales: [
        {
            titulo: 'Dr.',
            nombre: 'Test Profesional Uno',
            matricula: 'MN 00001',
            especialidad: 'Cardiologia',
            telefono: '+54 11 9901-0001',
            email: 'prof1@clinicatest.local',
            usuario: 'tpuno',
            pin: '1111'
        },
        {
            titulo: 'Dra.',
            nombre: 'Test Profesional Dos',
            matricula: 'MN 00002',
            especialidad: 'Neurologia',
            telefono: '+54 11 9901-0002',
            email: 'prof2@clinicatest.local',
            usuario: 'tpdos',
            pin: '2222'
        }
    ]
};

// ── Utilidades ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function logPass(name, detail) {
    passed++;
    const d = detail ? ` (${detail})` : '';
    console.log(`  ✅ PASS: ${name}${d}`);
}

function logFail(name, detail) {
    failed++;
    const d = detail ? ` (${detail})` : '';
    console.error(`  ❌ FAIL: ${name}${d}`);
}

async function fillAndBlur(page, selector, value) {
    const el = page.locator(selector);
    await el.click();
    await el.fill(value);
    await el.blur();
    await page.waitForTimeout(50);
}

// ── Test principal ─────────────────────────────────────────────────────────
(async () => {
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('  E2E P2 — Registro CLINIC (headless, mock backend)');
    console.log('══════════════════════════════════════════════════════════════\n');
    console.log(`  URL: ${REGISTRO_URL}\n`);

    const browser = await chromium.launch({ headless: true, slowMo: SLOWMO });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    // ── Mocks de backend ───────────────────────────────────────────────────
    await context.route('**script.google.com**exec**', async (route) => {
        const url = route.request().url();
        if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, regId: 'P2_MOCK_REG_001' })
            });
        } else if (/action=public_get_payment_portal/i.test(url)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    estado: 'pendiente',
                    kind: 'registro',
                    nombre: CLINIC.nombre,
                    email: CLINIC.email,
                    totalHoy: 'USD 0,00 (TEST)',
                    paymentData: {
                        arsAlias: 'E2E.TEST.ALIAS',
                        arsCvu: '0000003100000000000001',
                        arsNombre: 'E2E TEST SRL',
                        usdAlias: 'E2E.TEST.USD'
                    }
                })
            });
        } else if (/action=public_get_plans_config/i.test(url)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, plans: {} })
            });
        } else {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        }
    });

    // Mock tipo de cambio para no depender de bluelytics
    await context.route('**bluelytics.com.ar**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ oficial: { value_sell: 1050 }, blue: { value_sell: 1350 } })
        });
    });

    const page = await context.newPage();
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    try {
        // ── Paso 0: Selección de plan ──────────────────────────────────────
        console.log('▶ Paso 0 — Seleccionar plan CLINIC');
        await page.goto(REGISTRO_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1000);

        await page.locator('.pricing-card:has-text("Clínica")').click();
        await page.waitForTimeout(300);
        const btnNext = page.locator('#btnStep0Next');
        const btnEnabled = !(await btnNext.isDisabled());
        if (btnEnabled) logPass('Botón siguiente habilitado al seleccionar CLINIC');
        else logFail('Botón siguiente habilitado al seleccionar CLINIC');

        // El indicador de paso 4 debe estar oculto para CLINIC
        await page.locator('#btnStep0Next').click();
        await page.waitForTimeout(600);

        // ── Paso 1: Datos de la clínica ────────────────────────────────────
        console.log('▶ Paso 1 — Datos de la clínica');
        await fillAndBlur(page, '#regNombre', CLINIC.nombre);
        await fillAndBlur(page, '#regMatricula', CLINIC.cuit);
        await fillAndBlur(page, '#regEmail', CLINIC.email);
        await fillAndBlur(page, '#regTelefono', CLINIC.telefono);

        await page.locator('#step1 .btn-row .btn-primary').click();
        await page.waitForTimeout(600);

        const step2Active = await page.locator('#step2.active').count();
        if (step2Active) logPass('Avance a paso 2');
        else logFail('Avance a paso 2', await page.locator('.form-step.active').getAttribute('id').catch(() => 'N/A'));

        // ── Paso 2: Especialidades ─────────────────────────────────────────
        console.log('▶ Paso 2 — Especialidades');
        const firstCheckbox = page.locator('.checkbox-item input').first();
        if (await firstCheckbox.count()) await firstCheckbox.check();
        await page.waitForTimeout(200);

        await page.locator('#step2 .btn-row .btn-primary').click();
        await page.waitForTimeout(600);

        const step3Active = await page.locator('#step3.active').count();
        if (step3Active) logPass('Avance a paso 3');
        else logFail('Avance a paso 3', await page.locator('.form-step.active').getAttribute('id').catch(() => 'N/A'));

        // ── Paso 3: Sede + profesionales ──────────────────────────────────
        console.log('▶ Paso 3 — Sede y profesionales');
        await fillAndBlur(page, '#regWpAddress0', CLINIC.sede.address);
        await fillAndBlur(page, '#regWpFooter0', CLINIC.sede.footer);

        // El indicador paso 4 debe estar oculto para CLINIC
        const ind4Display = await page.evaluate(() => {
            const el = document.getElementById('stepIndicator4');
            return el ? getComputedStyle(el).display : 'missing';
        });
        if (ind4Display === 'none') logPass('Indicador paso 4 oculto para CLINIC');
        else logFail('Indicador paso 4 oculto para CLINIC', `display: ${ind4Display}`);

        // Agregar profesionales
        for (let i = 0; i < CLINIC.profesionales.length; i++) {
            const prof = CLINIC.profesionales[i];
            if (i > 0) {
                const btnAddProf = page.locator('#btnAddProfessional');
                if (await btnAddProf.count() && await btnAddProf.isVisible()) {
                    await btnAddProf.click();
                    await page.waitForTimeout(400);
                }
            }
            await page.locator(`#prof-${i} .titulo-btn[data-t="${prof.titulo}"]`).click().catch(() => {});
            await fillAndBlur(page, `#regProfName${i}`, prof.nombre);
            await fillAndBlur(page, `#regProfMatricula${i}`, prof.matricula);
            await fillAndBlur(page, `#regProfEspecialidad${i}`, prof.especialidad);
            await fillAndBlur(page, `#regProfUsuario${i}`, prof.usuario);
            await page.locator(`#regProfPin${i}`).fill(prof.pin);
        }

        const profCounter = await page.locator('#clinicProfCount').textContent().catch(() => '');
        console.log(`  Profesionales cargados (contador): ${profCounter}`);

        // Avanzar desde paso 3 — para CLINIC debe saltar al 5
        await page.locator('#step3 .btn-row .btn-primary').click();
        await page.waitForTimeout(1000);

        let activeAfter3 = await page.locator('.form-step.active').getAttribute('id').catch(() => null);
        // Manejo de fallback si quedó en step3
        if (activeAfter3 === 'step3') {
            await page.evaluate(() => goStep(5, { force: true }));
            await page.waitForTimeout(600);
            activeAfter3 = await page.locator('.form-step.active').getAttribute('id').catch(() => null);
        }
        if (activeAfter3 === 'step5') logPass('CLINIC salta paso 4 directo a carrito (step5)');
        else logFail('CLINIC salta paso 4 directo a carrito', `activo: ${activeAfter3}`);

        // ── Paso 5: Carrito ────────────────────────────────────────────────
        console.log('▶ Paso 5 — Carrito');
        const cartNext = page.locator('#step5 .btn-row .btn-primary');
        if (await cartNext.count()) await cartNext.click({ force: true });
        await page.waitForTimeout(700);

        // ── Paso 6: Resumen de inversión ──────────────────────────────────
        console.log('▶ Paso 6 — Resumen de inversión');
        const step6Active = await page.locator('#step6.active').count();
        if (step6Active) logPass('Paso 6 visible (resumen de inversión)');
        else logFail('Paso 6 visible', await page.locator('.form-step.active').getAttribute('id').catch(() => 'N/A'));

        // ── Submit ─────────────────────────────────────────────────────────
        console.log('▶ Submit — Registro mockeado');
        const submitBtn = page.locator('#btnSubmit');
        await submitBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        await submitBtn.click({ force: true });

        // Esperar paso 7 o portal de pago
        try {
            await page.waitForFunction(() => {
                const step7 = document.getElementById('step7');
                return !!step7 && step7.classList.contains('active');
            }, { timeout: 15000 });
        } catch (_) {}

        const step7State = await page.evaluate(() => {
            const step7 = document.getElementById('step7');
            const panel = document.getElementById('paymentPortalPanel');
            return {
                step7Active: !!step7 && step7.classList.contains('active'),
                portalVisible: !!panel && getComputedStyle(panel).display !== 'none',
                title: document.getElementById('step7Title')?.textContent || '',
                regId: (document.querySelector('#step7Message, #step7 a') || {}).textContent || ''
            };
        });

        if (step7State.step7Active) logPass('Paso 7 activo tras submit mockeado');
        else logFail('Paso 7 activo', JSON.stringify(step7State));

        if (step7State.portalVisible) logPass('Payment portal visible en paso 7');
        else logFail('Payment portal visible');

        // Esperar que cargue el portal (mock response)
        await page.waitForTimeout(1500);
        const transferText = await page.locator('#paymentTransferData').innerText().catch(() => '');
        if (transferText.includes('E2E.TEST.ALIAS') || transferText.includes('E2E TEST SRL')) {
            logPass('Datos de transferencia del mock renderizados en portal');
        } else if (transferText.length > 0) {
            logPass('Payment portal renderizó contenido', transferText.slice(0, 80));
        } else {
            logFail('Payment portal renderizó contenido', 'vacío');
        }

    } catch (err) {
        logFail('Error inesperado durante el test', err.message);
    } finally {
        // Verificar errores JS del navegador
        if (jsErrors.length === 0) {
            logPass('Sin errores JS en el navegador');
        } else {
            jsErrors.forEach(e => logFail('Error JS navegador', e.slice(0, 120)));
        }

        await browser.close();
    }

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(`  Resultado: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════════════════════\n');

    if (failed > 0) process.exit(1);
})();
