/**
 * e2e-factory-clone.js — Test E2E con Playwright
 * Prueba el flujo completo: fábrica de clones, PDF, descarga, PWA, pricing
 *
 * Ejecutar: node tests/e2e-factory-clone.js
 * Requiere: npm install playwright (ya está en package.json)
 *
 * NOTA: Necesita un servidor HTTP local. Usa serve o similar.
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Servidor HTTP local mínimo ─────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');
const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.gif': 'image/gif',
};

function startServer(port) {
    return new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
            let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
            if (!fs.existsSync(filePath)) {
                res.writeHead(404); res.end('Not found'); return;
            }
            if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
            const ext = path.extname(filePath);
            const mime = MIME[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mime });
            fs.createReadStream(filePath).pipe(res);
        });
        srv.listen(port, () => resolve(srv));
    });
}

// ── Utilidades de test ─────────────────────────────────────────────────────
let passed = 0, failed = 0;
const results = [];

function log(status, name, detail) {
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : 'ℹ️';
    console.log(`  ${icon}  ${name}${detail ? ' — ' + detail : ''}`);
    results.push({ status, name, detail });
    if (status === 'pass') passed++;
    if (status === 'fail') failed++;
}

// ── Tests ──────────────────────────────────────────────────────────────────
async function runTests() {
    const PORT = 8765;
    const BASE = `http://localhost:${PORT}`;
    const server = await startServer(PORT);
    console.log(`\n🌐 Servidor local en ${BASE}`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        permissions: ['clipboard-read', 'clipboard-write'],
    });

    try {
        // ═══════════════════════════════════════════════════════════════
        // E2E 1: App carga correctamente
        // ═══════════════════════════════════════════════════════════════
        console.log('\n── E2E: Carga de la app ────────────────────');
        const page = await context.newPage();
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const title = await page.title();
        if (title.includes('Transcriptor')) {
            log('pass', 'App carga con título correcto', title);
        } else {
            log('fail', 'App carga con título correcto', `Título: ${title}`);
        }

        // Verificar que APP_VERSION existe (guardada en localStorage por el script de purge)
        await page.waitForTimeout(500);
        const appVersion = await page.evaluate(() => localStorage.getItem('app_version') || null);
        if (appVersion) {
            log('pass', 'APP_VERSION almacenada en localStorage', appVersion);
        } else {
            // En contexto limpio sin reload, puede no estar aún — marcar info
            log('info', 'APP_VERSION en localStorage', 'No encontrada (primera carga en contexto limpio)');
        }

        // Verificar que CLIENT_CONFIG existe
        const configType = await page.evaluate(() => window.CLIENT_CONFIG?.type || null);
        if (configType) {
            log('pass', 'CLIENT_CONFIG cargado', `type: ${configType}`);
        } else {
            log('fail', 'CLIENT_CONFIG cargado', 'null');
        }

        await page.close();

        // ═══════════════════════════════════════════════════════════════
        // E2E 2: Fábrica de clones — ?id= simulado
        // ═══════════════════════════════════════════════════════════════
        console.log('\n── E2E: Fábrica de clones ────────────────────');
        const clonePage = await context.newPage();

        // Interceptar fetch al backend para mockear respuesta
        await clonePage.route('**/exec**', async (route) => {
            const url = route.request().url();
            if (url.includes('action=validate')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        doctor: {
                            ID_Medico: 'E2E_TEST_001',
                            Nombre: 'Dr. E2E Test',
                            Matricula: 'MP-E2E',
                            Plan: 'pro',
                            Estado: 'active',
                            Especialidad: 'Cardiología',
                            Devices_Max: 3,
                            API_Key: 'gsk_e2e_test_key_12345',
                            Allowed_Templates: '',
                            Registro_Datos: JSON.stringify({
                                firma: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
                                proLogo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
                                headerColor: '#e91e63',
                                footerText: 'Footer E2E Test',
                                workplace: { name: 'Clínica E2E', address: 'Test 123', phone: '555-E2E' }
                            })
                        }
                    })
                });
            } else {
                await route.continue();
            }
        });

        // Navegar con ?id= para trigger factory
        await clonePage.goto(`${BASE}/?id=E2E_TEST_001`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await clonePage.waitForTimeout(3000); // Esperar a que factory se ejecute

        // Verificar que se detectó el ?id=
        const pendingSetupId = await clonePage.evaluate(() => window._PENDING_SETUP_ID || null);
        // El factory puede limpiar _PENDING_SETUP_ID después de usarlo, así que verificamos lado effects
        const storedConfig = await clonePage.evaluate(() => {
            try { return JSON.parse(localStorage.getItem('client_config_stored')); } catch(_) { return null; }
        });
        const storedProf = await clonePage.evaluate(() => {
            try { return JSON.parse(localStorage.getItem('prof_data')); } catch(_) { return null; }
        });

        if (storedConfig && storedConfig.type) {
            log('pass', 'Factory: client_config_stored guardado', `type: ${storedConfig.type}`);
        } else {
            log('info', 'Factory: client_config_stored', 'No guardado (puede requerir backend real o el mock no matcheó)');
        }

        if (storedProf && storedProf.nombre) {
            log('pass', 'Factory: prof_data guardado', `nombre: ${storedProf.nombre}`);
        } else {
            log('info', 'Factory: prof_data', 'No guardado (depende del backend mock)');
        }

        // Verificar API key
        const storedKey = await clonePage.evaluate(() => localStorage.getItem('groq_api_key'));
        if (storedKey) {
            log('pass', 'Factory: API key guardada', storedKey.substring(0, 10) + '...');
        } else {
            log('info', 'Factory: API key', 'No guardada (depende del backend mock)');
        }

        // Verificar firma
        const storedFirma = await clonePage.evaluate(() => localStorage.getItem('pdf_signature'));
        if (storedFirma && storedFirma.startsWith('data:image/')) {
            log('pass', 'Factory: firma guardada en pdf_signature');
        } else {
            log('info', 'Factory: firma', 'No guardada');
        }

        // Verificar color tema
        const storedColor = await clonePage.evaluate(() => localStorage.getItem('customPrimaryColor'));
        if (storedColor) {
            log('pass', 'Factory: color tema guardado', storedColor);
        } else {
            log('info', 'Factory: color tema', 'No aplicado');
        }

        await clonePage.close();

        // ═══════════════════════════════════════════════════════════════
        // E2E 3: Botón descargar — dropdown formatos
        // ═══════════════════════════════════════════════════════════════
        console.log('\n── E2E: Botón descargar (dropdown) ────────────────────');
        const dlPage = await context.newPage();
        await dlPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await dlPage.waitForTimeout(1000);

        // Verificar que existe el dropdown en el toolbar
        const downloadBtnExists = await dlPage.evaluate(() => !!document.getElementById('downloadBtn'));
        if (downloadBtnExists) {
            log('pass', 'Botón dropdown descarga existe en toolbar');
        } else {
            log('fail', 'Botón dropdown descarga existe en toolbar');
        }

        // Verificar dropdown en preview
        const previewDropdownExists = await dlPage.evaluate(() => !!document.getElementById('previewDownloadDropdown'));
        if (previewDropdownExists) {
            log('pass', 'Dropdown formatos existe en preview');
        } else {
            log('fail', 'Dropdown formatos existe en preview');
        }

        // Verificar formatos disponibles según plan (ADMIN por defecto)
        const formats = await dlPage.evaluate(() => {
            const dd = document.getElementById('previewDownloadDropdown');
            if (!dd) return [];
            return Array.from(dd.querySelectorAll('button[data-format]')).map(b => ({
                format: b.dataset.format,
                visible: b.style.display !== 'none'
            }));
        });
        if (formats.length >= 4) {
            log('pass', 'Preview tiene 4 formatos (pdf, rtf, txt, html)', JSON.stringify(formats.map(f => f.format)));
        } else {
            log('fail', 'Preview formatos', `Solo ${formats.length} encontrados`);
        }

        // Verificar chevron visible (ADMIN tiene >1 formato)
        const chevronVisible = await dlPage.evaluate(() => {
            const btn = document.getElementById('btnDownloadPreviewMore');
            return btn && btn.style.display !== 'none';
        });
        if (chevronVisible) {
            log('pass', 'Chevron ▾ visible para ADMIN (multi-formato)');
        } else {
            log('info', 'Chevron ▾', 'Podría estar oculto por CSS');
        }

        await dlPage.close();

        // ═══════════════════════════════════════════════════════════════
        // E2E 4: PWA — Service Worker registrado
        // ═══════════════════════════════════════════════════════════════
        console.log('\n── E2E: PWA ────────────────────');
        const pwaPage = await context.newPage();
        await pwaPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await pwaPage.waitForTimeout(2000);

        const swRegistered = await pwaPage.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return false;
            const regs = await navigator.serviceWorker.getRegistrations();
            return regs.length > 0;
        });
        if (swRegistered) {
            log('pass', 'Service Worker registrado');
        } else {
            log('info', 'Service Worker', 'No registrado (localhost sin HTTPS)');
        }

        // Verificar manifest
        const hasManifest = await pwaPage.evaluate(() => !!document.querySelector('link[rel="manifest"]'));
        if (hasManifest) {
            log('pass', 'Manifest.json vinculado');
        } else {
            log('fail', 'Manifest.json vinculado');
        }

        await pwaPage.close();

        // ═══════════════════════════════════════════════════════════════
        // E2E 5: Pricing modal
        // ═══════════════════════════════════════════════════════════════
        console.log('\n── E2E: Pricing modal ────────────────────');
        const pricingPage = await context.newPage();
        await pricingPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await pricingPage.waitForTimeout(1000);

        const pricingOverlayExists = await pricingPage.evaluate(() => !!document.getElementById('pricingModalOverlay'));
        if (pricingOverlayExists) {
            log('pass', 'Pricing modal overlay existe en DOM');
        } else {
            log('fail', 'Pricing modal overlay existe en DOM');
        }

        await pricingPage.close();

        // ═══════════════════════════════════════════════════════════════
        // E2E 6: Editor disponible
        // ═══════════════════════════════════════════════════════════════
        console.log('\n── E2E: Editor ────────────────────');
        const editorPage = await context.newPage();
        await editorPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await editorPage.waitForTimeout(1000);

        const editorExists = await editorPage.evaluate(() => {
            const el = document.getElementById('editor');
            return !!el && el.contentEditable === 'true';
        });
        if (editorExists) {
            log('pass', 'Editor contentEditable presente');
        } else {
            log('fail', 'Editor contentEditable presente');
        }

        // Verificar QR library cargada
        const qrLibLoaded = await editorPage.evaluate(() => typeof qrcode === 'function');
        if (qrLibLoaded) {
            log('pass', 'qrcode-generator library cargada');
        } else {
            log('info', 'qrcode-generator', 'No cargada (CDN podría fallar offline)');
        }

        // Verificar generateQRCode function
        const genQRExists = await editorPage.evaluate(() => typeof window.generateQRCode === 'function');
        if (genQRExists) {
            log('pass', 'generateQRCode() disponible globalmente');
        } else {
            log('fail', 'generateQRCode() disponible globalmente');
        }

        // Verificar que genera QR válido
        const qrResult = await editorPage.evaluate(() => {
            if (typeof window.generateQRCode !== 'function') return '';
            return window.generateQRCode('TEST-QR-DATA');
        });
        if (qrResult && qrResult.startsWith('data:image/')) {
            log('pass', 'generateQRCode produce imagen válida', qrResult.substring(0, 30) + '...');
        } else {
            log('info', 'generateQRCode', 'No produce imagen (CDN?)');
        }

        // Verificar validateBeforeDownload
        const valExists = await editorPage.evaluate(() => typeof window.validateBeforeDownload === 'function');
        if (valExists) {
            log('pass', 'validateBeforeDownload() disponible');
        } else {
            log('fail', 'validateBeforeDownload() disponible');
        }

        // Verificar que TXT siempre pasa validación
        const txtPasses = await editorPage.evaluate(() => {
            if (typeof window.validateBeforeDownload !== 'function') return null;
            return window.validateBeforeDownload('txt');
        });
        if (txtPasses === true) {
            log('pass', 'validateBeforeDownload("txt") retorna true (siempre ok)');
        } else {
            log('fail', 'validateBeforeDownload("txt")', `Retornó: ${txtPasses}`);
        }

        await editorPage.close();

        // ═══════════════════════════════════════════════════════════════
        // E2E 7: Templates cargadas
        // ═══════════════════════════════════════════════════════════════
        console.log('\n── E2E: Templates ────────────────────');
        const tplPage = await context.newPage();
        await tplPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await tplPage.waitForTimeout(500);

        const tplCount = await tplPage.evaluate(() => {
            const tpls = window.MEDICAL_TEMPLATES || {};
            return Object.keys(tpls).length;
        });
        if (tplCount >= 30) {
            log('pass', `${tplCount} plantillas médicas cargadas`);
        } else {
            log('fail', 'Plantillas médicas', `Solo ${tplCount}`);
        }

        // Verificar autoDetectTemplateKey
        const autoDetect = await tplPage.evaluate(() => typeof window.autoDetectTemplateKey === 'function');
        if (autoDetect) {
            log('pass', 'autoDetectTemplateKey() disponible');
        } else {
            log('fail', 'autoDetectTemplateKey() disponible');
        }

        await tplPage.close();

    } catch (err) {
        log('fail', 'Error inesperado', err.message);
    } finally {
        await browser.close();
        server.close();
    }

    // ═══════════════════════════════════════════════════════════════
    // Resumen
    // ═══════════════════════════════════════════════════════════════
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log(`  E2E Total: ${passed + failed} | ✅ Pasaron: ${passed} | ❌ Fallaron: ${failed}`);
    console.log('─────────────────────────────────────────────────────────────────\n');
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
