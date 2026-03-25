/**
 * SMOKE TEST — Clon clínica MEDMN62S30P contra producción
 * Verifica flujo del admin después de los fixes v213/v214:
 *   1. Factory setup completa sin errores (con backend mockeado para evitar DEVICE_LIMIT)
 *   2. No debe aparecer el banner azul de API Key inválida
 *   3. Admin login con "clinica" funciona sin loop
 *   4. Al entrar como admin NO aparece el Session Assistant
 *   5. El panel de Gestión de Profesionales abre y se puede cerrar
 *   6. Los 4 médicos están listados en el selector de PIN
 *
 * ESTRATEGIA: El backend GAS se mockea vía page.route() para evitar el DEVICE_LIMIT
 * (cada contexto Playwright fresco genera un device_id nuevo). La respuesta mock
 * refleja fielmente la estructura que devolvería el backend real.
 */
const { chromium } = require('playwright');

const CLONE_URL  = 'https://transcriptorpro.github.io/transcripcion/?id=MEDMN62S30P';
const ADMIN_PASS = 'clinica';
const TIMEOUT    = 30000;

// Respuesta mock que simula el backend para MEDMN62S30P (La Isla Bonita, plan clinic)
const MOCK_BACKEND_RESPONSE = {
    ID_Medico:        'MEDMN62S30P',
    Nombre:           'La Isla Bonita',
    Matricula:        '',
    Email:            '',
    Telefono:         '',
    Especialidad:     'ALL',
    Plan:             'clinic',
    Estado:           'active',
    Devices_Max:      99,
    Devices_Logged:   '[]',
    API_Key:          '',
    API_Key_B1:       '',
    API_Key_B2:       '',
    Profesionales:    '[]',
    Registro_Datos:   JSON.stringify({
        workplace: {
            name:    'La Isla Bonita',
            address: 'Calle Principal 123',
            phone:   '',
            email:   '',
            footer:  '',
            logo:    ''
        },
        adminUser:  'admin',
        adminPass:  'clinica',
        adminDni:   '',
        clinicNombre: 'La Isla Bonita',
        profesionales: [
            { id: 'p1', nombre: 'Dr. Hernan Rios',       pin: '1234', especialidades: ['Cardiología'],              activo: true, primerUso: false },
            { id: 'p2', nombre: 'Dra. Valentina Souza',  pin: '1234', especialidades: ['Neurología'],               activo: true, primerUso: false },
            { id: 'p3', nombre: 'Dr. Lucas Ferreira',    pin: '1234', especialidades: ['Diagnóstico por Imágenes'], activo: true, primerUso: false },
            { id: 'p4', nombre: 'Dra. Micaela Torres',   pin: '1234', especialidades: ['Pediatría'],                activo: true, primerUso: false }
        ]
    })
};

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx     = await browser.newContext({ storageState: undefined });
    const page    = await ctx.newPage();

    let passed = 0;
    let failed = 0;
    let backendMocked = false;

    function ok(msg)   { console.log(`  ✅  ${msg}`); passed++; }
    function fail(msg) { console.log(`  ❌  ${msg}`); failed++; }

    async function wait(ms) { return page.waitForTimeout(ms); }

    // ── Capturar logs de la página para diagnóstico ─────────────────
    const pageLogs = [];
    page.on('console', msg => pageLogs.push(`[${msg.type()}] ${msg.text()}`));

    // ── Auto-aceptar dialogs nativos ────────────────────────────────
    page.on('dialog', async dialog => {
        console.log(`  ⚠️  Dialog (${dialog.type()}): "${dialog.message().slice(0, 120)}"`);
        await dialog.accept();
    });

    // ── Pre-seed onboarding ya aceptado para saltar al PIN modal ────
    // Esto no interfiere con el factory setup: handleFactorySetupCore
    // no limpia onboarding_accepted.
    await ctx.addInitScript(() => {
        localStorage.setItem('onboarding_accepted', 'true');
    });

    // ── Mock del backend GAS: interceptar el validate de la fábrica ─
    // Motivo: cada contexto Playwright fresco genera un device_id nuevo
    // → el backend registraría un dispositivo diferente en cada ejecución
    // → al alcanzar Devices_Max se rompe el smoke test con DEVICE_LIMIT.
    // La respuesta mock refleja fielmente la estructura del backend real.
    await page.route('**script.google.com**exec*', async (route) => {
        const url = route.request().url();
        if (/action=validate/i.test(url)) {
            backendMocked = true;
            console.log('  🔌  Backend mockeado (validate) → datos de La Isla Bonita');
            await route.fulfill({
                status:      200,
                contentType: 'application/json',
                body:        JSON.stringify(MOCK_BACKEND_RESPONSE)
            });
        } else if (/action=clinic_get_staff/i.test(url)) {
            // Retornar lista vacía: _showPanel usa el localStorage que ya fue
            // poblado por handleFactorySetupCore con los 4 profesionales del mock.
            console.log('  🔌  Backend mockeado (clinic_get_staff) → sin staff (usar localStorage)');
            await route.fulfill({
                status:      200,
                contentType: 'application/json',
                body:        JSON.stringify({ success: false, staff: [] })
            });
        } else {
            // Otras acciones pasan libremente
            await route.continue();
        }
    });

    console.log('\n── Smoke: Clon MEDMN62S30P (v214+) ────────────────────────\n');

    try {
        /* ── 1. Cargar el clone ──────────────────────────────────────── */
        await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

        // Estado inmediato al cargar
        const stateAtLoad = await page.evaluate(() => ({
            pendingSetupId: window._PENDING_SETUP_ID || null,
            adminWasActive: window._ADMIN_WAS_ACTIVE || false,
            clientConfigType: window.CLIENT_CONFIG && window.CLIENT_CONFIG.type,
        }));
        console.log('  📋  Pre-setup — _PENDING_SETUP_ID:', stateAtLoad.pendingSetupId,
            '| _ADMIN_WAS_ACTIVE:', stateAtLoad.adminWasActive,
            '| CLIENT_CONFIG.type:', stateAtLoad.clientConfigType);

        // El factory setup se resuelve rápido (respuesta mock instantánea)
        console.log('  ⏳  Esperando factory setup (3s)...');
        await wait(3000);

        await page.screenshot({ path: 'tests/smoke_01_after_load.png' });
        console.log('  📸  screenshot: smoke_01_after_load.png');

        // Estado post-setup
        const postSetup = await page.evaluate(() => ({
            pendingSetupId:    window._PENDING_SETUP_ID || null,
            configType:        window.CLIENT_CONFIG && window.CLIENT_CONFIG.type,
            configPlan:        window.CLIENT_CONFIG && window.CLIENT_CONFIG.planCode,
            onboardingAccepted: localStorage.getItem('onboarding_accepted'),
            medicoId:          localStorage.getItem('medico_id'),
            factoryError:      !!document.getElementById('factoryErrorOverlay'),
        }));
        console.log('  📋  Post-setup — type:', postSetup.configType, '| plan:', postSetup.configPlan,
            '| onboarding_accepted:', postSetup.onboardingAccepted,
            '| medicoId:', postSetup.medicoId);

        if (postSetup.factoryError) {
            const errMsg = await page.locator('#factoryErrorOverlay').textContent().catch(() => '');
            fail(`Factory setup error: "${errMsg.slice(0, 200).replace(/\s+/g,' ')}"`);
        } else {
            ok('Factory setup completó sin error (mock del backend)');
        }

        // Logs relevantes
        const keyLogs = pageLogs.filter(l => /factory|setup|clinic|PRO|planCode|error/i.test(l));
        if (keyLogs.length) {
            console.log('  📄  Logs clave de la página:');
            keyLogs.slice(-10).forEach(l => console.log('       ' + l));
        }

        /* ── 2. Onboarding T&C — pre-aceptado por addInitScript ─────── */
        // El factory setup NO limpia onboarding_accepted; solo lo escribe si está faltando.
        // Con la pre-seed el overlay no debería estar active.
        const onboardActive = await page.locator('#onboardingOverlay')
            .evaluate(el => el.classList.contains('active'))
            .catch(() => false);

        if (onboardActive) {
            await page.screenshot({ path: 'tests/smoke_02_onboarding.png' });
            console.log('  📸  screenshot: smoke_02_onboarding.png');
            // Intentar secuencia de selectores conocidos
            const btns = [
                '#btnAcceptOnboarding', '#btnAceptarTerminos', '#onboardingAcceptBtn',
                '#onboardingOverlay button[id*="accept" i]',
                '#onboardingOverlay button[id*="acepta" i]',
                '#onboardingOverlay .onboarding-accept',
                '#onboardingOverlay button'
            ];
            let clicked = false;
            for (const sel of btns) {
                const el = page.locator(sel).first();
                if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
                    const txt = await el.textContent().catch(() => '');
                    await el.click();
                    clicked = true;
                    ok(`T&C aceptado ("${txt.trim().slice(0, 30)}")`);
                    break;
                }
            }
            if (!clicked) {
                const allTxts = await page.locator('#onboardingOverlay button')
                    .evaluateAll(els => els.map(e => e.textContent.trim()));
                console.log('  🔍  Botones en onboarding:', allTxts.map(t => `"${t}"`).join(', '));
                fail('Onboarding activo pero no encontré botón de aceptar');
            }
            await wait(2000);
        } else {
            ok('T&C ya aceptado (pre-seed) — onboarding no activo');
        }

        /* ── 3. Banner API Key NO visible ───────────────────────────── */
        // Esperar al validador silencioso de API key (~2.5s)
        await wait(3500);
        const bannerVisible = await page.locator('#apiKeyWarningBanner')
            .isVisible({ timeout: 1000 }).catch(() => false);
        if (bannerVisible) {
            const disp = await page.locator('#apiKeyWarningBanner').evaluate(el => el.style.display);
            !disp || disp === 'none'
                ? ok('Banner API Key oculto (display:none)')
                : fail('Banner azul de API Key visible — fix v214 incompleto');
        } else {
            ok('Banner API Key no visible');
        }

        /* ── 4. Modal de PIN activo ──────────────────────────────────── */
        const pinOverlay = page.locator('#clinicAuthOverlay');
        const pinVisible = await pinOverlay.isVisible({ timeout: 5000 }).catch(() => false);
        if (!pinVisible) {
            await page.screenshot({ path: 'tests/smoke_03_pin_missing.png' });
            console.log('  📸  screenshot: smoke_03_pin_missing.png');
            // Diagnóstico de overlays
            const overlayState = await page.evaluate(() => (
                ['clinicAuthOverlay','onboardingOverlay','factorySetupOverlay',
                 'factoryErrorOverlay','sessionAssistantOverlay']
                .map(id => {
                    const el = document.getElementById(id);
                    return el
                        ? `${id}: display="${el.style.display}" classes="${el.className}"`
                        : `${id}: (no en DOM)`;
                })
            ));
            overlayState.forEach(s => console.log('  🔍  ' + s));
            const lsSnap = await page.evaluate(() => ({
                medicoId:        localStorage.getItem('medico_id'),
                clientConfig:    (() => { try { return JSON.parse(localStorage.getItem('client_config_stored')||'{}'); } catch(_){return null;} })(),
                onboarding:      localStorage.getItem('onboarding_accepted'),
                workplaceProfs:  (() => { try { const w=JSON.parse(localStorage.getItem('workplace_profiles')||'[]'); return w[0]&&w[0].professionals&&w[0].professionals.length; } catch(_){return 0;} })(),
            }));
            console.log('  🔍  localStorage:', JSON.stringify(lsSnap));
            fail('Modal de PIN no apareció — flujo clínica no se inició');
        } else {
            await page.screenshot({ path: 'tests/smoke_03_pin_visible.png' });
            console.log('  📸  screenshot: smoke_03_pin_visible.png');
            ok('Modal de selección de profesional activo');
        }

        /* ── 5. Profesionales en el selector ────────────────────────── */
        const select = page.locator('#clinicAuthSelect');
        const selectVisible = await select.isVisible({ timeout: 3000 }).catch(() => false);
        if (selectVisible) {
            const options = await select.locator('option').all();
            const names   = await Promise.all(options.map(o => o.textContent()));
            console.log('  📋  Opciones selector:', names.map(n => n.trim()).join(' | '));
            names.some(n => /administrador/i.test(n))
                ? ok('Opción Administrador presente')
                : fail('Falta opción Administrador en el selector');
            options.length >= 5
                ? ok(`${options.length} opciones (Admin + ≥4 médicos)`)
                : fail(`Solo ${options.length} opciones — médicos faltantes`);
        } else {
            fail('Selector de profesionales no encontrado');
        }

        /* ── 6. Login como Administrador ────────────────────────────── */
        if (selectVisible) {
            // Buscar la opción de Administrador
            const adminValue = await select.evaluate(sel => {
                const opt = Array.from(sel.options).find(o => /administrador/i.test(o.textContent));
                return opt ? opt.value : null;
            });
            if (adminValue !== null) {
                await select.selectOption(adminValue);
            } else {
                await select.selectOption({ index: 0 });
            }
            await wait(300);

            await page.locator('#clinicAuthPin').fill(ADMIN_PASS);
            await page.locator('#clinicAuthEnterBtn').click();
            await wait(1500);

            const stillOpen = await pinOverlay.isVisible({ timeout: 1000 }).catch(() => false);
            stillOpen
                ? fail('PIN modal sigue abierto tras login admin — posible loop')
                : ok('Login admin exitoso — PIN modal cerrado');

            /* ── 7. Session Assistant NO debe abrirse para admin ─────── */
            await wait(1000);
            const saActive = await page.locator('#sessionAssistantOverlay')
                .evaluate(el => el.classList.contains('active'))
                .catch(() => false);
            saActive
                ? fail('Session Assistant se abrió para admin — fix v214 incompleto')
                : ok('Session Assistant no apareció para admin');

            /* ── 8. Panel de Gestión de Profesionales ────────────────── */
            await wait(2000);
            const adminOverlay = page.locator('#clinicAdminOverlay');
            const adminOpen = await adminOverlay.isVisible({ timeout: 5000 }).catch(() => false);
            adminOpen
                ? ok('Panel de Gestión de Profesionales abierto')
                : fail('Panel admin no abrió tras login');

            if (adminOpen) {
                // Esperar a que _syncFromBackend() complete y _showPanel() renderice las tarjetas.
                // El sync hace una petición al backend (mockeada) → finally → _showPanel() → DOM.
                await wait(3000);

                /* ── 9. Los 4 médicos en el panel ────────────────────── */
                const cards = await page.locator('.caa-pro-card').count();
                cards >= 4
                    ? ok(`${cards} tarjetas de profesionales (≥4 esperadas)`)
                    : fail(`Solo ${cards} tarjetas — médicos faltantes`);

                /* ── 10. Botón Cerrar superior ───────────────────────── */
                const closeTop = page.locator('#caaPanelCloseTop');
                if (await closeTop.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await closeTop.click();
                    await wait(700);
                    const stillAdminOpen = await adminOverlay.isVisible({ timeout: 500 }).catch(() => false);
                    stillAdminOpen
                        ? fail('Panel admin no se cerró con botón superior')
                        : ok('Botón Cerrar superior funciona');
                } else {
                    const closeBottom = page.locator('#caaPanelClose');
                    if (await closeBottom.isVisible({ timeout: 1000 }).catch(() => false)) {
                        await closeBottom.click();
                        await wait(700);
                        const stillAdminOpen2 = await adminOverlay.isVisible({ timeout: 500 }).catch(() => false);
                        stillAdminOpen2
                            ? fail('Panel admin no se cerró')
                            : ok('Panel admin cerrado (botón inferior)');
                    } else {
                        fail('No se encontró botón de cierre en el panel admin');
                    }
                }
            }
        }

    } catch (err) {
        fail(`Excepción: ${err.message}`);
        console.error(err.stack);
    } finally {
        await browser.close();
    }

    console.log(`\n── Resultado ────────────────────────────────────────────────`);
    console.log(`   Mock backend usado: ${backendMocked ? '✅' : '❌ (no se interceptó)'}`);
    console.log(`   Total: ${passed + failed} | ✅ Pasaron: ${passed} | ❌ Fallaron: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
})();
