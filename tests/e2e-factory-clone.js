/**
 * e2e-factory-clone.js — Test E2E con Playwright
 * Prueba el flujo completo: fábrica de clones, PDF, descarga, PWA, pricing
 *
 * Ejecutar: node tests/e2e-factory-clone.js
 * Remoto: APP_URL=https://transcriptorpro.github.io/transcripcion/ node tests/e2e-factory-clone.js
 * Requiere: npm install playwright (ya está en package.json)
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

const FACTORY_SCENARIOS = [
    {
        id: 'E2E_TRIAL_001',
        plan: 'trial',
        expected: { type: 'TRIAL', hasProMode: false, canGenerateApps: false, maxDevices: 1, formats: ['pdf'] }
    },
    {
        id: 'E2E_NORMAL_001',
        plan: 'normal',
        expected: { type: 'NORMAL', hasProMode: false, canGenerateApps: false, maxDevices: 1, formats: ['pdf'] }
    },
    {
        id: 'E2E_PRO_001',
        plan: 'pro',
        expected: { type: 'PRO', hasProMode: true, canGenerateApps: false, maxDevices: 3, formats: ['pdf', 'rtf', 'html'] }
    },
    {
        id: 'E2E_GIFT_001',
        plan: 'gift',
        expected: { type: 'PRO', hasProMode: true, canGenerateApps: false, maxDevices: 3, formats: ['pdf', 'rtf', 'html'] }
    },
    {
        id: 'E2E_CLINIC_001',
        plan: 'clinic',
        expected: { type: 'PRO', hasProMode: true, canGenerateApps: true, maxDevices: 5, formats: ['pdf', 'rtf', 'html'] }
    }
];

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
    const remoteBase = String(process.env.APP_URL || '').trim();
    const useRemote = !!remoteBase;
    const PORT = 8765;
    const BASE = useRemote ? remoteBase : `http://localhost:${PORT}`;
    let server = null;
    if (!useRemote) {
        server = await startServer(PORT);
        console.log(`\n🌐 Servidor local en ${BASE}`);
    } else {
        console.log(`\n🌐 Ejecutando contra remoto en ${BASE}`);
    }

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
        // E2E 2: Fábrica de clones — matriz por tipo de plan
        // ═══════════════════════════════════════════════════════════════
        console.log('\n── E2E: Fábrica de clones (matriz) ────────────────────');

        // Interceptar fetch al backend para mockear respuesta
        await context.route('**/exec**', async (route) => {
            const url = route.request().url();
            if (url.includes('action=validate')) {
                const idMatch = /[?&]id=([^&]+)/.exec(url);
                const medicoId = idMatch ? decodeURIComponent(idMatch[1]) : 'E2E_UNKNOWN';
                const scenario = FACTORY_SCENARIOS.find(s => s.id === medicoId)
                    || FACTORY_SCENARIOS.find(s => s.id === 'E2E_PRO_001');
                const devicesMax = scenario.expected.maxDevices;

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        ID_Medico: medicoId,
                        Nombre: `Dr. ${scenario.plan.toUpperCase()} E2E`,
                        Matricula: `MP-${scenario.plan.toUpperCase()}`,
                        Plan: scenario.plan,
                        Estado: 'active',
                        Especialidad: 'Cardiología',
                        Devices_Max: devicesMax,
                        API_Key: 'gsk_e2e_test_key_12345',
                        Allowed_Templates: '',
                        Registro_Datos: JSON.stringify({
                            firma: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
                            proLogo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
                            headerColor: '#e91e63',
                            footerText: `Footer E2E ${scenario.plan}`,
                            workplace: { name: `Clínica ${scenario.plan}`, address: 'Test 123', phone: '555-E2E' }
                        })
                    })
                });
            } else {
                await route.continue();
            }
        });

        for (const scenario of FACTORY_SCENARIOS) {
            const clonePage = await context.newPage();
            await clonePage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await clonePage.evaluate(() => localStorage.clear());

            await clonePage.goto(`${BASE}/?id=${encodeURIComponent(scenario.id)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await clonePage.waitForTimeout(3200);

            const snapshot = await clonePage.evaluate(() => {
                const parse = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(_) { return null; } };
                const cfg = parse('client_config_stored');
                const prof = parse('prof_data');

                if (typeof window.initContact === 'function') {
                    window.initContact();
                }
                const btnContacto = document.getElementById('btnContacto');

                const btnPreview = document.getElementById('btnDownloadFromPreview');
                if (typeof window.initPreviewDownloadDropdown === 'function' && btnPreview) {
                    window.initPreviewDownloadDropdown(btnPreview);
                }
                const dd = document.getElementById('previewDownloadDropdown');
                const visibleFormats = dd
                    ? Array.from(dd.querySelectorAll('button[data-format]'))
                        .filter((b) => b.style.display !== 'none')
                        .map((b) => b.dataset.format)
                    : [];

                return {
                    cfg,
                    prof,
                    hasApiKey: !!localStorage.getItem('groq_api_key'),
                    hasSignature: String(localStorage.getItem('pdf_signature') || '').startsWith('data:image/'),
                    contactVisible: !!btnContacto && btnContacto.style.display !== 'none',
                    visibleFormats
                };
            });

            const sc = snapshot.cfg || {};
            const okType = sc.type === scenario.expected.type;
            const okPro = !!sc.hasProMode === scenario.expected.hasProMode;
            const okGen = !!sc.canGenerateApps === scenario.expected.canGenerateApps;
            const okDevices = Number(sc.maxDevices) === scenario.expected.maxDevices;
            const okPlanCode = String(sc.planCode || '').toLowerCase() === scenario.plan;
            const okFormats = JSON.stringify(snapshot.visibleFormats) === JSON.stringify(scenario.expected.formats);

            if (okType && okPro && okGen && okDevices && okPlanCode) {
                log('pass', `Factory ${scenario.plan}: client_config mapeado`, `type=${sc.type}, pro=${!!sc.hasProMode}, apps=${!!sc.canGenerateApps}, maxDevices=${sc.maxDevices}`);
            } else {
                log('fail', `Factory ${scenario.plan}: client_config mapeado`, `recibido=${JSON.stringify({ type: sc.type, hasProMode: sc.hasProMode, canGenerateApps: sc.canGenerateApps, maxDevices: sc.maxDevices, planCode: sc.planCode })}`);
            }

            if (snapshot.prof && snapshot.prof.nombre) log('pass', `Factory ${scenario.plan}: prof_data guardado`, snapshot.prof.nombre);
            else log('fail', `Factory ${scenario.plan}: prof_data guardado`, 'Sin nombre en prof_data');

            if (snapshot.hasApiKey) log('pass', `Factory ${scenario.plan}: API key guardada`);
            else log('fail', `Factory ${scenario.plan}: API key guardada`);

            if (snapshot.hasSignature) log('pass', `Factory ${scenario.plan}: firma guardada`);
            else log('fail', `Factory ${scenario.plan}: firma guardada`);

            if (snapshot.contactVisible) log('pass', `Factory ${scenario.plan}: botón contacto visible para no-ADMIN`);
            else log('fail', `Factory ${scenario.plan}: botón contacto visible para no-ADMIN`);

            if (okFormats) log('pass', `Factory ${scenario.plan}: formatos descarga`, snapshot.visibleFormats.join(','));
            else log('fail', `Factory ${scenario.plan}: formatos descarga`, `esperado=${scenario.expected.formats.join(',')} recibido=${snapshot.visibleFormats.join(',')}`);

            await clonePage.close();
        }

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
        if (formats.length >= 3) {
            log('pass', 'Preview tiene 3 formatos (pdf, rtf, html)', JSON.stringify(formats.map(f => f.format)));
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
            log('info', 'Service Worker', 'No registrado en este entorno');
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
        if (server) server.close();
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
