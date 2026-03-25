const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_URL = process.env.APP_URL || 'https://transcriptorpro.github.io/transcripcion/';
const CLONE_ID = process.env.CLINIC_CLONE_ID || 'MEDMN62S30P';
const ADMIN_PASS = process.env.CLINIC_ADMIN_PASS || 'clinica';
const OUT_DIR = path.join(__dirname, '..', 'accesorios', 'logs', 'clinic-clone-smoke');

// Respuesta mock del backend para evitar DEVICE_LIMIT en entornos de test
const MOCK_VALIDATE_RESPONSE = {
    ID_Medico:      CLONE_ID,
    Nombre:         'La Isla Bonita',
    Matricula:      '',
    Email:          '',
    Telefono:       '',
    Especialidad:   'ALL',
    Plan:           'clinic',
    Estado:         'active',
    Devices_Max:    99,
    Devices_Logged: '[]',
    API_Key:        '',
    API_Key_B1:     '',
    API_Key_B2:     '',
    Profesionales:  '[]',
    Registro_Datos: JSON.stringify({
        workplace:    { name: 'La Isla Bonita', address: 'Calle Principal 123', phone: '', email: '', footer: '', logo: '' },
        adminUser:    'admin',
        adminPass:    'clinica',
        adminDni:     '',
        clinicNombre: 'La Isla Bonita',
        profesionales: [
            { id: 'p1', nombre: 'Dr. Hernan Rios',       pin: '1234', especialidades: ['Cardiología'],              activo: true, primerUso: false },
            { id: 'p2', nombre: 'Dra. Valentina Souza',  pin: '1234', especialidades: ['Neurología'],               activo: true, primerUso: false },
            { id: 'p3', nombre: 'Dr. Lucas Ferreira',    pin: '1234', especialidades: ['Diagnóstico por Imágenes'], activo: true, primerUso: false },
            { id: 'p4', nombre: 'Dra. Micaela Torres',   pin: '1234', especialidades: ['Pediatría'],                activo: true, primerUso: false }
        ]
    })
};

const MOCK_STAFF_RESPONSE = {
    success: true,
    staff: [
        { Clinic_ID: CLONE_ID, Staff_ID: '__admin__', Role: 'admin',        Nombre: 'Administrador',       DNI: '',         Activo: 'true' },
        { Clinic_ID: CLONE_ID, Staff_ID: 'p1',        Role: 'professional', Nombre: 'Dr. Hernan Rios',      DNI: '20111111', Matricula: 'MN 11111', Especialidades: 'Cardiología',              Activo: 'true', Primer_Uso: 'false' },
        { Clinic_ID: CLONE_ID, Staff_ID: 'p2',        Role: 'professional', Nombre: 'Dra. Valentina Souza', DNI: '20222222', Matricula: 'MN 22222', Especialidades: 'Neurología',               Activo: 'true', Primer_Uso: 'false' },
        { Clinic_ID: CLONE_ID, Staff_ID: 'p3',        Role: 'professional', Nombre: 'Dr. Lucas Ferreira',   DNI: '20333333', Matricula: 'MN 33333', Especialidades: 'Diagnóstico por Imágenes', Activo: 'true', Primer_Uso: 'false' },
        { Clinic_ID: CLONE_ID, Staff_ID: 'p4',        Role: 'professional', Nombre: 'Dra. Micaela Torres',  DNI: '20444444', Matricula: 'MN 44444', Especialidades: 'Pediatría',                Activo: 'true', Primer_Uso: 'false' }
    ]
};

fs.mkdirSync(OUT_DIR, { recursive: true });

function stamp() {
    return new Date().toISOString().replace(/[.:]/g, '-');
}

function logPass(name, detail) {
    console.log(`PASS ${name}${detail ? ' -> ' + detail : ''}`);
}

function fail(name, detail) {
    throw new Error(`${name}${detail ? ' -> ' + detail : ''}`);
}

async function clickIfVisible(page, selector) {
    const el = page.locator(selector).first();
    if (await el.count()) {
        if (await el.isVisible().catch(() => false)) {
            await el.click();
            return true;
        }
    }
    return false;
}

async function handleOnboarding(page) {
    const overlay = page.locator('#onboardingOverlay');
    const visible = await overlay.isVisible().catch(() => false);
    if (!visible) return false;

    await clickIfVisible(page, '#onboardingNext1');
    await page.waitForTimeout(250);
    await clickIfVisible(page, '#onboardingNext2');
    await page.waitForTimeout(250);
    await clickIfVisible(page, '#onboardingNext3');
    await page.waitForTimeout(250);

    const acceptTerms = page.locator('#acceptTerms');
    if (await acceptTerms.count()) {
        await acceptTerms.check({ force: true });
    }

    await clickIfVisible(page, '#btnSubmitOnboarding');
    await page.waitForTimeout(1500);
    return true;
}

async function readUiSnapshot(page) {
    return await page.evaluate(() => {
        const styleVisible = (el) => {
            if (!el) return false;
            const cs = getComputedStyle(el);
            return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || '1') > 0;
        };

        const toast = document.getElementById('toast');
        const toastBtn = toast ? toast.querySelector('.toast-action-btn') : null;
        const banner = document.getElementById('apiKeyWarningBanner');
        const auth = document.getElementById('clinicAuthOverlay');
        const admin = document.getElementById('clinicAdminOverlay');
        const assistant = document.getElementById('sessionAssistantOverlay');
        const adminBox = document.getElementById('clinicAdminBox');
        const adminContent = document.getElementById('clinicAdminContent');
        const cards = Array.from(document.querySelectorAll('#caaProList .caa-pro-card'));
        const lastCard = cards[cards.length - 1];

        let panelGeometry = null;
        if (adminBox && adminContent && lastCard) {
            const boxRect = adminBox.getBoundingClientRect();
            const contentRect = adminContent.getBoundingClientRect();
            const cardRect = lastCard.getBoundingClientRect();
            panelGeometry = {
                boxBottom: boxRect.bottom,
                contentBottom: contentRect.bottom,
                lastCardBottom: cardRect.bottom,
                contentScrollHeight: adminContent.scrollHeight,
                contentClientHeight: adminContent.clientHeight,
                contentScrollTop: adminContent.scrollTop
            };
        }

        const clientCfg = (() => {
            try { return JSON.parse(localStorage.getItem('client_config_stored') || '{}'); }
            catch (_) { return {}; }
        })();

        const authDebug = (() => {
            const overlay = document.getElementById('clinicAuthOverlay');
            const active = (window.ClinicAuth && typeof window.ClinicAuth.getActiveProfessional === 'function')
                ? window.ClinicAuth.getActiveProfessional()
                : null;
            return {
                overlayExists: !!overlay,
                overlayDisplay: overlay ? getComputedStyle(overlay).display : null,
                overlayVisibility: overlay ? getComputedStyle(overlay).visibility : null,
                activeId: active ? String(active.id || '') : null
            };
        })();

        return {
            title: document.title,
            planCode: String(clientCfg.planCode || ''),
            type: String(clientCfg.type || ''),
            onboardingAccepted: localStorage.getItem('onboarding_accepted') === 'true',
            authVisible: styleVisible(auth),
            adminVisible: styleVisible(admin),
            assistantVisible: !!(assistant && assistant.classList.contains('active')),
            bannerVisible: styleVisible(banner),
            bannerText: banner ? banner.innerText.trim() : '',
            toastVisible: !!(toast && toast.classList.contains('show')),
            toastText: toast ? toast.innerText.trim() : '',
            toastAction: toastBtn ? toastBtn.textContent.trim() : '',
            adminCloseTopVisible: styleVisible(document.getElementById('caaPanelCloseTop')),
            adminCloseBottomVisible: styleVisible(document.getElementById('caaPanelClose')),
            adminCards: cards.length,
            adminNames: cards.map((card) => {
                const el = card.querySelector('.caa-pro-name');
                return el ? el.textContent.trim() : '';
            }),
            authDebug,
            panelGeometry
        };
    });
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });

    // Pre-aceptar onboarding para no quedar bloqueado en el wizard de T&C en cada ejecucion
    await context.addInitScript(() => {
        localStorage.setItem('onboarding_accepted', 'true');
    });

    // Mockear backend GAS para evitar DEVICE_LIMIT
    await context.route('**script.google.com**exec**', async (route) => {
        const url = route.request().url();
        if (/action=validate/i.test(url)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_VALIDATE_RESPONSE)
            });
        } else if (/action=clinic_get_staff/i.test(url)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_STAFF_RESPONSE)
            });
        } else {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        }
    });

    const page = await context.newPage();
    const ts = stamp();

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            console.log('BROWSER_ERROR', msg.text());
        }
    });

    // Auto-dismiss dialogs nativos (prompt para recuperar admin)
    page.on('dialog', async (dialog) => {
        console.log(`  DIALOG (${dialog.type()}): "${dialog.message().slice(0, 80)}"`);
        await dialog.accept();
    });

    try {
        const targetUrl = `${APP_URL.replace(/\/$/, '')}/?id=${encodeURIComponent(CLONE_ID)}&smoke=${Date.now()}`;
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        let snap = await readUiSnapshot(page);
        if (snap.planCode !== 'clinic') fail('planCode clinic', JSON.stringify({ planCode: snap.planCode, type: snap.type }));
        logPass('planCode clinic', JSON.stringify({ planCode: snap.planCode, type: snap.type }));

        if (snap.bannerVisible) fail('banner api key oculto', snap.bannerText || 'visible');
        logPass('banner api key oculto');

        if (snap.toastVisible && /api key|configurar/i.test(`${snap.toastText} ${snap.toastAction}`)) {
            fail('toast api key oculto', `${snap.toastText} | ${snap.toastAction}`);
        }
        logPass('toast api key oculto');

        // Esperar activamente a que aparezca el modal de auth (el watchdog puede tardar hasta ~10s)
        try {
            await page.waitForSelector('#clinicAuthOverlay', { state: 'visible', timeout: 15000 });
        } catch (_) {
            fail('modal clinic auth visible', 'timeout 15s — no apareció');
            return;
        }
        logPass('modal clinic auth visible');

        // Seleccionar Administrador en el selector de profesionales si existe
        const selectEl = page.locator('#clinicAuthSelect');
        if (await selectEl.count() > 0) {
            await selectEl.selectOption({ index: 0 }); // Administrador siempre primero
            await page.waitForTimeout(300);
        }
        await page.fill('#clinicAuthPin', ADMIN_PASS);
        await page.click('#clinicAuthEnterBtn');
        await page.waitForTimeout(2500);

        // Si aparece el modal de cambio forzado de contraseña (clave default 'clinica'),
        // completarlo para que el panel admin se muestre correctamente
        const forceBtn = page.locator('#caaForceConfirm');
        if (await forceBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
            console.log('  INFO: modal force-change-pass detectado, completando...');
            await page.locator('#caaForcePas1').fill('clinica');
            await page.locator('#caaForcePas2').fill('clinica');
            await page.locator('#caaForceDni').fill('30123456');
            await forceBtn.click();
            await page.waitForTimeout(1500);
        }

        snap = await readUiSnapshot(page);

        if (!snap.adminVisible) fail('panel admin visible tras login', JSON.stringify(snap));
        logPass('panel admin visible tras login');

        if (snap.assistantVisible) fail('session assistant oculto para admin', 'sigue activo');
        logPass('session assistant oculto para admin');

        if (snap.authVisible) fail('modal clinic auth cerrado tras login admin', 'sigue visible');
        logPass('modal clinic auth cerrado tras login admin');

        if (snap.adminCards < 4) fail('panel admin lista 4 profesionales', JSON.stringify(snap.adminNames));
        logPass('panel admin lista 4 profesionales', snap.adminNames.join(' | '));

        if (!snap.adminCloseTopVisible || !snap.adminCloseBottomVisible) {
            fail('botones de cierre visibles', JSON.stringify({ top: snap.adminCloseTopVisible, bottom: snap.adminCloseBottomVisible }));
        }
        logPass('botones de cierre visibles');

        await page.evaluate(() => {
            const content = document.getElementById('clinicAdminContent');
            if (content) content.scrollTop = content.scrollHeight;
        });
        await page.waitForTimeout(300);

        snap = await readUiSnapshot(page);
        if (snap.panelGeometry) {
            const geom = snap.panelGeometry;
            if (geom.contentScrollHeight > geom.contentClientHeight && geom.lastCardBottom > geom.contentBottom + 8) {
                fail('ultimo card contenido dentro del scroll', JSON.stringify(geom));
            }
            logPass('ultimo card contenido dentro del scroll', JSON.stringify(geom));
        }

        await page.screenshot({ path: path.join(OUT_DIR, `clinic-admin-open-${ts}.png`), fullPage: false });
        await page.click('#caaPanelCloseTop');
        await page.waitForTimeout(700);

        snap = await readUiSnapshot(page);
        if (snap.adminVisible) fail('panel admin cierra correctamente', 'sigue visible');
        logPass('panel admin cierra correctamente');

        if (!snap.authVisible) fail('handoff obligatorio tras cerrar admin', JSON.stringify({ authVisible: snap.authVisible, adminVisible: snap.adminVisible, assistantVisible: snap.assistantVisible, authDebug: snap.authDebug }));
        logPass('handoff obligatorio tras cerrar admin');

        await page.screenshot({ path: path.join(OUT_DIR, `clinic-admin-closed-${ts}.png`), fullPage: false });
        console.log('OK smoke completado');
    } finally {
        await context.close();
        await browser.close();
    }
}

run().catch((err) => {
    console.error('SMOKE_FAIL', err.message);
    process.exit(1);
});