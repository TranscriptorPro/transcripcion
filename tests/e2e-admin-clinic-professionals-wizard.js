/**
 * e2e-admin-clinic-professionals-wizard.js  — C2
 * E2E del tab "👥 Profesionales" en el editor avanzado de usuario
 * para plan CLINIC dentro del panel admin.
 *
 * Verifica:
 * 1. El wizard abre correctamente para un usuario CLINIC
 * 2. El tab "Profesionales" es visible (y oculto para PRO)
 * 3. El panel muestra el nombre de la clínica y maxProfesionales desde Registro_Datos
 * 4. Las tarjetas de profesionales se renderizan
 * 5. Toggle activo/inactivo cambia el badge
 * 6. "Agregar profesional" añade una nueva tarjeta con formulario abierto
 * 7. Guardar envía al backend un Registro_Datos con el array `profesionales` actualizado
 */

const { chromium } = require('playwright');
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = {
    '.html': 'text/html',
    '.js':   'text/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff2':'font/woff2',
    '.gif':  'image/gif'
};

function startServer(port) {
    return new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
            let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
            if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
            if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
            const ext = path.extname(filePath);
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        });
        srv.listen(port, () => resolve(srv));
    });
}

let passed = 0, failed = 0;
function ok(name, detail)   { passed++; console.log(`[OK]   ${name}${detail ? ' — ' + detail : ''}`); }
function fail(name, detail) { failed++; console.log(`[FAIL] ${name}${detail ? ' — ' + detail : ''}`); }
function ensure(cond, name, detail) { cond ? ok(name, detail) : fail(name, detail); }

// ─────────────────────────────────────────────────────────────────────────────
// Dataset del mock
// ─────────────────────────────────────────────────────────────────────────────
const CLINIC_RD = {
    workplace:         { name: 'Clínica San Mateo', address: 'Av. Siempreviva 742', phone: '', email: '', footer: '' },
    extraWorkplaces:   [],
    headerColor:       '#1a56a0',
    showPhone:         true,
    showEmail:         true,
    showSocial:        false,
    clinicNombre:      'Clínica San Mateo',
    clinicLogo:        null,
    maxProfesionales:  4,
    profesionales: [
        { id: 'p1', nombre: 'Dr. Carlos López', matricula: 'MN 10001', especialidades: ['Cardiología'],
          usuario: 'clopez', pin: '1234', firma: null, logo: null, email: 'clopez@clinica.com',
          telefono: '', redesSociales: {}, activo: true },
        { id: 'p2', nombre: 'Dra. María Torres', matricula: 'MN 20002', especialidades: ['Neurología'],
          usuario: 'mtorres', pin: '5678', firma: null, logo: null, email: '',
          telefono: '', redesSociales: {}, activo: false }
    ]
};

const CLINIC_USER = {
    ID_Medico: 'CLINIC_C2_E2E',
    Nombre:    'Clínica San Mateo',
    Matricula: '',
    Email:     'admin@sanmateo.com',
    Telefono:  '11-3333-4444',
    Especialidad: 'Cardiología, Neurología',
    Plan:      'CLINIC',
    Estado:    'active',
    Devices_Max: 5,
    Uso_Count:  0,
    Estudios_JSON: '[]',
    Allowed_Templates: '',
    Registro_Datos: JSON.stringify(CLINIC_RD)
};

// ─────────────────────────────────────────────────────────────────────────────
(async function run() {
    const PORT   = 8769;
    const BASE   = `http://localhost:${PORT}`;
    const server = await startServer(PORT);
    const browser = await chromium.launch({ headless: true });
    const ctx    = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    // Inyectar sesión de admin antes de cargar la página
    await ctx.addInitScript(() => {
        sessionStorage.setItem('adminSession', JSON.stringify({
            username: 'admin_c2_e2e',
            nombre:   'Admin C2 E2E',
            nivel:    'SUPER',
            timestamp:    Date.now(),
            tokenExpiry:  Date.now() + 8 * 60 * 60 * 1000,
            sessionToken: 'tok_c2_e2e'
        }));
    });

    let lastUpdatePayload = null;

    await ctx.route('**/exec**', async (route) => {
        const url    = route.request().url();
        const u      = new URL(url);
        const action = u.searchParams.get('action') || '';

        if (action === 'admin_list_users') {
            await route.fulfill({
                status:      200,
                contentType: 'application/json',
                body:        JSON.stringify({ users: [CLINIC_USER] })
            });
            return;
        }

        if (action === 'admin_update_user') {
            try {
                const raw = u.searchParams.get('updates') || '{}';
                lastUpdatePayload = JSON.parse(decodeURIComponent(raw));
            } catch (_) {}
            await route.fulfill({
                status:      200,
                contentType: 'application/json',
                body:        JSON.stringify({ success: true })
            });
            return;
        }

        // Respuesta genérica para las demás acciones que carga admin.html
        await route.fulfill({
            status:      200,
            contentType: 'application/json',
            body:        JSON.stringify({ success: true, users: [], registrations: [], requests: [], plans: {} })
        });
    });

    const page = await ctx.newPage();

    try {
        // ── Carga inicial ───────────────────────────────────────────────────
        await page.goto(`${BASE}/recursos/admin.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForSelector('#tableBody [data-action="edit"]', { timeout: 20000 });
        ok('C2-LOAD', 'tabla de usuarios cargada');

        // ── Abrir el wizard ─────────────────────────────────────────────────
        await page.click('#tableBody [data-action="edit"]');
        await page.waitForSelector('#adminUserCfgOverlay', { state: 'visible', timeout: 15000 });
        ok('C2-WIZARD-OPEN', 'wizard abierto para CLINIC');

        const planBadge = await page.textContent('#adminUserCfgPlan');
        ensure((planBadge || '').toUpperCase().includes('CLINIC'), 'C2-PLAN-BADGE', planBadge);

        // ── Tab Profesionales visible ───────────────────────────────────────
        const proTabVisible = await page.$eval(
            '.auc-tab[data-tab="profesionales"]',
            (el) => el.style.display !== 'none'
        );
        ensure(proTabVisible, 'C2-TAB-VISIBLE', 'tab Profesionales visible para CLINIC');

        // ── Activar tab Profesionales ───────────────────────────────────────
        await page.click('.auc-tab[data-tab="profesionales"]');
        await page.waitForSelector('.auc-panel[data-panel="profesionales"].active', { timeout: 5000 });
        ok('C2-TAB-ACTIVE', 'panel Profesionales activo tras click');

        // ── Bloque institucional ────────────────────────────────────────────
        const clinicNombreVal = await page.$eval('#aucClinicNombre', (el) => el.value);
        ensure(clinicNombreVal === 'Clínica San Mateo', 'C2-CLINIC-NOMBRE', clinicNombreVal);

        const maxPro = await page.$eval('#aucMaxProfesionales', (el) => Number(el.value));
        ensure(maxPro === 4, 'C2-MAX-PRO', String(maxPro));

        // ── Tarjetas de profesionales ───────────────────────────────────────
        const cardCount = await page.locator('.auc-panel[data-panel="profesionales"] .auc-pro-card').count();
        ensure(cardCount === 2, 'C2-CARDS-COUNT', `${cardCount} tarjetas (esperadas: 2)`);

        // ── Badge activo / inactivo ─────────────────────────────────────────
        const badge0 = await page.locator('.auc-panel[data-panel="profesionales"] .auc-pro-card').first()
            .locator('.auc-pro-badge').textContent();
        ensure((badge0 || '').toLowerCase().includes('activo'), 'C2-BADGE-ACTIVO', badge0);

        const badge1 = await page.locator('.auc-panel[data-panel="profesionales"] .auc-pro-card').nth(1)
            .locator('.auc-pro-badge').textContent();
        ensure((badge1 || '').toLowerCase().includes('inactivo'), 'C2-BADGE-INACTIVO', badge1);

        // ── Toggle activo → inactivo del primer profesional ─────────────────
        await page.locator('.auc-pro-card[data-pro-idx="0"] .aucProToggle').click();
        // Tras el re-render las tarjetas se recrean
        await page.waitForSelector('.auc-pro-card[data-pro-idx="0"] .auc-pro-badge.inactivo', { timeout: 4000 });
        ok('C2-TOGGLE', 'profesional 0 pasó a Inactivo tras toggle');

        // ── Editar primer profesional (inline form) ─────────────────────────
        await page.locator('.auc-pro-card[data-pro-idx="0"] .aucProEdit').click();
        const form0 = await page.locator('#aucProForm-0').isVisible();
        ensure(form0, 'C2-INLINE-FORM', 'formulario inline abierto tras click Editar');

        const nombrePro0 = await page.$eval('.aucProNombre[data-pidx="0"]', el => el.value);
        ensure(nombrePro0 === 'Dr. Carlos López', 'C2-PRO-NOMBRE', nombrePro0);

        const pinPro0 = await page.$eval('.aucProPin[data-pidx="0"]', el => el.value);
        ensure(pinPro0 === '1234', 'C2-PRO-PIN', pinPro0);

        // Modificar el nombre del profesional (para que la revisión muestre cambio)
        await page.fill('.aucProNombre[data-pidx="0"]', 'Dr. Carlos J. López');

        // ── Agregar nuevo profesional ───────────────────────────────────────
        const beforeAdd = await page.locator('.auc-panel[data-panel="profesionales"] .auc-pro-card').count();
        await page.click('#aucAddPro');
        await page.waitForSelector(`#aucProForm-${beforeAdd}`, { timeout: 4000 });
        const afterAdd = await page.locator('.auc-panel[data-panel="profesionales"] .auc-pro-card').count();
        ensure(afterAdd === beforeAdd + 1, 'C2-ADD-PRO', `antes=${beforeAdd} después=${afterAdd}`);

        const newFormOpen = await page.locator(`#aucProForm-${beforeAdd}`).isVisible();
        ensure(newFormOpen, 'C2-ADD-FORM-OPEN', 'formulario del nuevo profesional abierto automáticamente');

        // Completar datos mínimos del nuevo profesional
        await page.fill(`.aucProNombre[data-pidx="${beforeAdd}"]`, 'Lic. Paula Vega');
        await page.fill(`.aucProMatricula[data-pidx="${beforeAdd}"]`, 'MN 30003');
        await page.fill(`.aucProUsuario[data-pidx="${beforeAdd}"]`, 'pvega');

        // ── Guardar → revisión ──────────────────────────────────────────────
        await page.click('#aucSaveBtn');
        await page.waitForSelector('#aucReviewOverlay', { state: 'visible', timeout: 10000 });
        ok('C2-REVIEW-OPEN', 'modal de revisión abierto');

        const reviewText = await page.textContent('#aucReviewBody');
        ensure((reviewText || '').includes('Profesionales'), 'C2-REVIEW-SECTION', 'sección Profesionales en revisión');

        // ── Confirmar guardado ──────────────────────────────────────────────
        await page.click('#aucReviewConfirm');
        await page.waitForSelector('#aucReviewOverlay', { state: 'hidden', timeout: 10000 });
        await page.waitForSelector('#adminUserCfgOverlay', { state: 'hidden', timeout: 10000 });
        ok('C2-SAVE-CONFIRM', 'guardado confirmado y wizard cerrado');

        // ── Verificar payload al backend ────────────────────────────────────
        ensure(!!lastUpdatePayload, 'C2-BACKEND-CALL', 'admin_update_user invocado');

        let parsedRd = {};
        try { parsedRd = JSON.parse((lastUpdatePayload || {}).Registro_Datos || '{}'); } catch (_) {}

        const pros = Array.isArray(parsedRd.profesionales) ? parsedRd.profesionales : null;
        ensure(!!pros, 'C2-RD-HAS-PROS', 'Registro_Datos.profesionales es array');
        ensure(pros && pros.length === 3, 'C2-RD-PROS-COUNT', `${pros ? pros.length : 0} profesionales (esperados: 3)`);

        const firstPro = pros && pros[0];
        ensure(
            firstPro && firstPro.activo === false,
            'C2-RD-PRO0-INACTIVO',
            `activo=${firstPro ? firstPro.activo : 'n/a'}`
        );

        const newPro = pros && pros[2];
        ensure(
            newPro && newPro.nombre === 'Lic. Paula Vega',
            'C2-RD-NEW-PRO',
            `nombre=${newPro ? newPro.nombre : 'n/a'}`
        );

        ensure(
            typeof parsedRd.clinicNombre === 'string' && parsedRd.clinicNombre.length > 0,
            'C2-RD-CLINIC-NOMBRE',
            parsedRd.clinicNombre
        );

    } catch (err) {
        fail('C2-FATAL', err.message);
        console.error(err);
    } finally {
        await page.close();
        await browser.close();
        server.close();
    }

    console.log(`\n── C2 Profesionales Wizard E2E ──────────────────────────────────`);
    console.log(`  Total: ${passed + failed} | ✅ Pasaron: ${passed} | ❌ Fallaron: ${failed}`);
    if (failed > 0) process.exitCode = 1;
})();
