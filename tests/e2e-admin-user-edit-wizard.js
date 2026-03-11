/**
 * e2e-admin-user-edit-wizard.js
 * Flujo E2E del editor avanzado de usuario en panel admin:
 * 1) abrir usuario
 * 2) editar campos
 * 3) revisar cambios (antes/despues)
 * 4) confirmar guardado
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.gif': 'image/gif'
};

function startServer(port) {
    return new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
            let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
            if (!fs.existsSync(filePath)) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            if (fs.statSync(filePath).isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            }
            const ext = path.extname(filePath);
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        });
        srv.listen(port, () => resolve(srv));
    });
}

let passed = 0;
let failed = 0;
function ok(name, detail) {
    passed++;
    console.log(`[OK] ${name}${detail ? ' - ' + detail : ''}`);
}
function fail(name, detail) {
    failed++;
    console.log(`[FAIL] ${name}${detail ? ' - ' + detail : ''}`);
}

function ensure(cond, name, detail) {
    if (cond) ok(name, detail);
    else fail(name, detail);
}

(async function run() {
    const PORT = 8767;
    const BASE = `http://localhost:${PORT}`;
    const server = await startServer(PORT);
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    let lastUpdatePayload = null;

    await ctx.addInitScript(() => {
        sessionStorage.setItem('adminSession', JSON.stringify({
            username: 'admin_e2e',
            nombre: 'Admin E2E',
            nivel: 'SUPER',
            timestamp: Date.now(),
            tokenExpiry: Date.now() + (8 * 60 * 60 * 1000),
            sessionToken: 'tok_e2e'
        }));
    });

    await ctx.route('**/exec**', async (route) => {
        const reqUrl = route.request().url();
        const u = new URL(reqUrl);
        const action = u.searchParams.get('action') || '';

        if (action === 'admin_list_users') {
            const user = {
                ID_Medico: 'USR_E2E_001',
                Nombre: 'Dr. Usuario E2E',
                Matricula: 'MN 1234',
                Email: 'e2e@demo.com',
                Telefono: '1111-2222',
                Especialidad: 'Cardiología',
                Plan: 'normal',
                Estado: 'active',
                Devices_Max: 1,
                Uso_Count: 0,
                Registro_Datos: JSON.stringify({
                    workplace: { name: 'Consultorio Centro', address: 'Av. Test 123', phone: '1234', email: 'wp@demo.com', footer: 'Footer demo' },
                    extraWorkplaces: [],
                    headerColor: '#1a56a0',
                    showPhone: true,
                    showEmail: true,
                    showSocial: false
                })
            };
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ users: [user] })
            });
            return;
        }

        if (action === 'admin_update_user') {
            let updates = {};
            try {
                const raw = u.searchParams.get('updates') || '{}';
                updates = JSON.parse(decodeURIComponent(raw));
            } catch (_) {}
            lastUpdatePayload = updates;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
            return;
        }

        if (action === 'admin_list_registrations') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ registrations: [] }) });
            return;
        }

        if (action === 'admin_list_support') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requests: [] }) });
            return;
        }

        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const page = await ctx.newPage();

    try {
        await page.goto(`${BASE}/recursos/admin.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForSelector('#tableBody [data-action="edit"]', { timeout: 20000 });
        ok('ADMIN-LOAD', 'tabla de usuarios renderizada');

        const hasReqDiag = await page.locator('#tableBody [data-action="reqdiag"]').count();
        ensure(hasReqDiag === 0, 'NO-REQDIAG-ACTION', 'accion de solicitar diagnostico eliminada en admin');
        const hasDiagView = await page.locator('#tableBody [data-action="diag"]').count();
        ensure(hasDiagView > 0, 'DIAG-VIEW-ACTION', 'accion de ver diagnostico permanece disponible');

        await page.click('#tableBody [data-action="edit"]');
        await page.waitForSelector('#adminUserCfgOverlay', { state: 'visible', timeout: 15000 });
        ok('WIZARD-OPEN', 'editor avanzado visible');

        const planBadge = await page.textContent('#adminUserCfgPlan');
        ensure((planBadge || '').toLowerCase().includes('normal'), 'PLAN-READONLY', String(planBadge || 'sin badge'));

        await page.fill('#aucNombre', 'Dr. Usuario E2E Editado');
        await page.fill('#aucTelefono', '9999-0000');
        ok('DATOS-EDIT', 'nombre y telefono modificados');

        await page.click('#adminUserCfgTabs .auc-tab[data-tab="trabajo"]');
        await page.waitForSelector('.auc-panel[data-panel="trabajo"].active');
        const addDisabled = await page.$eval('#aucAddWp', (el) => !!el.disabled);
        ensure(addDisabled, 'PLAN-LIMIT-WORKPLACES', 'plan normal bloquea agregar 2do lugar');

        await page.click('#adminUserCfgTabs .auc-tab[data-tab="pdf"]');
        await page.waitForSelector('.auc-panel[data-panel="pdf"].active');
        await page.uncheck('#aucShowEmail');
        ok('PDF-EDIT', 'toggle showEmail ajustado');

        await page.click('#aucSaveBtn');
        await page.waitForSelector('#aucReviewOverlay', { state: 'visible', timeout: 10000 });
        ok('REVIEW-OPEN', 'modal de revisar cambios visible');

        const reviewText = await page.textContent('#aucReviewBody');
        ensure((reviewText || '').includes('Usuario E2E Editado'), 'REVIEW-HAS-DIFF', 'incluye cambio de nombre');

        await page.click('#aucReviewConfirm');
        await page.waitForSelector('#aucReviewOverlay', { state: 'hidden', timeout: 10000 });
        await page.waitForSelector('#adminUserCfgOverlay', { state: 'hidden', timeout: 10000 });
        ok('SAVE-CONFIRM', 'guardado confirmado y wizard cerrado');

        ensure(!!lastUpdatePayload, 'BACKEND-CALL', 'admin_update_user invocado');
        ensure(lastUpdatePayload && lastUpdatePayload.Nombre === 'Dr. Usuario E2E Editado', 'BACKEND-NAME', String(lastUpdatePayload && lastUpdatePayload.Nombre));
        ensure(lastUpdatePayload && typeof lastUpdatePayload.Registro_Datos === 'string', 'BACKEND-REGDATOS', 'registro_datos serializado');

        let parsedRd = {};
        try { parsedRd = JSON.parse(lastUpdatePayload.Registro_Datos || '{}'); } catch (_) {}
        ensure(parsedRd.showEmail === false, 'BACKEND-SHOWEMAIL', 'showEmail=false persistido');

        console.log(`\nRESUMEN: ${passed + failed} | OK: ${passed} | FAIL: ${failed}`);
        if (failed > 0) process.exitCode = 1;
    } catch (err) {
        console.log('[FATAL]', err.message);
        process.exitCode = 1;
    } finally {
        await page.close();
        await browser.close();
        server.close();
    }
})();
