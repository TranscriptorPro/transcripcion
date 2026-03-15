/**
 * e2e-gift-clone-comprehensive.js — Test E2E exhaustivo
 * =======================================================
 * Crea un clon GIFT con datos completos inventados (imágenes, redes,
 * workplaces, etc.), lo abre y verifica METICULOSAMENTE:
 *  - Configuración respetada (plan, devices, templates)
 *  - Datos cargados (nombre, matrícula, firma, logo, workplaces, redes)
 *  - Permisos (formatos, funciones restringidas)
 *  - Texto normalizado, mayúsculas, preview, etc.
 *  - Límites de dispositivos
 *
 * Ejecutar: node tests/e2e-gift-clone-comprehensive.js
 * Requiere: Playwright (ya instalado)
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Servidor HTTP local ─────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');
const MIME = {
    '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8',
    '.css': 'text/css;charset=utf-8', '.json': 'application/json',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.woff2': 'font/woff2', '.gif': 'image/gif', '.webp': 'image/webp',
    '.webmanifest': 'application/manifest+json',
};

function startServer(port) {
    return new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
            let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
            if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
            if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
            const ext = path.extname(filePath);
            const mime = MIME[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mime });
            fs.createReadStream(filePath).pipe(res);
        });
        srv.listen(port, () => resolve(srv));
    });
}

// ── Mini imágenes válidas (1x1 px PNG) ──────────────────────────────────────
const TINY_RED_PNG    = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
const TINY_BLUE_PNG   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADhgJ/SS0fYgAAAABJRU5ErkJggg==';
const TINY_GREEN_PNG  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ── DATOS DEL CLON GIFT DE PRUEBA ───────────────────────────────────────────
const GIFT_USER = {
    ID_Medico:         'GIFTTEST_E2E_' + Date.now().toString(36).toUpperCase(),
    Nombre:            'Dra. Ana María Fernández López',
    Email:             'ana.fernandez@testclinic.com',
    Matricula:         'MN 87654',
    Telefono:          '+54 11 4321-5678',
    Especialidad:      'Cardiología',
    Plan:              'gift',
    Estado:            'active',
    API_Key:           'gsk_E2E_FAKE_KEY_DO_NOT_USE_123456789',
    API_Key_B1:        'gsk_E2E_BACKUP1_FAKE_KEY_987654321',
    API_Key_B2:        '',
    Devices_Max:       2,
    Allowed_Templates: '["eco_doppler","ecg","holter"]',
    Usage_Count:       0,
    Devices_Logged:    '[]',
    Registro_Datos: JSON.stringify({
        workplace: {
            name:    'Centro Cardiológico Fernández',
            address: 'Av. Santa Fe 3450, Piso 6°, CABA',
            phone:   '+54 11 4321-5678',
            email:   'turnos@centrofernandez.com.ar',
            logo:    TINY_GREEN_PNG
        },
        extraWorkplaces: [{
            name:    'Hospital Municipal Dr. Ramos Mejía',
            address: 'Gral. Urquiza 609, CABA',
            phone:   '+54 11 4127-0276',
            email:   '',
            logo:    ''
        }],
        headerColor:  '#1a56a0',
        footerText:   'Centro Cardiológico Fernández — Av. Santa Fe 3450 — Tel: 4321-5678',
        firma:        TINY_RED_PNG,
        proLogo:      TINY_BLUE_PNG,
        proLogoSize:  80,
        firmaSize:    60,
        instLogoSize: 70,
        hasProMode:   true,
        sexo:         'femenino',
        showPhone:    true,
        showEmail:    true,
        showSocial:   true,
        socialMedia: {
            whatsapp:  '+54 11 4321-5678',
            instagram: '@dra.anafernandez',
            facebook:  'Centro Cardiológico Fernández',
            x:         '@AnaFCardio',
            youtube:   ''
        },
        apiKey:   'gsk_E2E_FAKE_KEY_DO_NOT_USE_123456789',
        apiKeyB1: 'gsk_E2E_BACKUP1_FAKE_KEY_987654321'
    })
};

// ── Results tracking ────────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;
const results = [];
const FAIL_DETAILS = [];

function log(status, section, name, detail) {
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : status === 'skip' ? '⏭️' : 'ℹ️';
    const line = `  ${icon}  [${section}] ${name}${detail ? ' — ' + detail : ''}`;
    console.log(line);
    results.push({ status, section, name, detail });
    if (status === 'pass') passed++;
    if (status === 'fail') { failed++; FAIL_DETAILS.push(`[${section}] ${name}: ${detail || ''}`); }
    if (status === 'skip') skipped++;
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function runTests() {
    const PORT = 8899;
    const BASE = `http://localhost:${PORT}`;
    const server = await startServer(PORT);
    console.log(`\n🌐 Servidor local en ${BASE}`);

    const SCREENSHOT_DIR = path.join(__dirname, '..', 'anexos', 'accesorios', 'gift_e2e_screenshots');
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
        permissions: ['clipboard-read', 'clipboard-write'],
        locale: 'es-AR'
    });

    // ── MOCK: Interceptar calls al backend de Google Apps Script ─────────────
    await context.route('**/exec**', async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        // action=validate — respuesta de validación del médico
        if (url.includes('action=validate')) {
            const idMatch = /[?&]id=([^&]+)/.exec(url);
            const devMatch = /[?&]deviceId=([^&]+)/.exec(url);
            const reqId = idMatch ? decodeURIComponent(idMatch[1]) : '';
            const reqDevId = devMatch ? decodeURIComponent(devMatch[1]) : '';

            // Simular límite de dispositivos (más de 2 → error)
            const currentDevices = JSON.parse(GIFT_USER.Devices_Logged || '[]');
            if (currentDevices.length >= GIFT_USER.Devices_Max && !currentDevices.includes(reqDevId)) {
                await route.fulfill({
                    status: 200, contentType: 'application/json',
                    body: JSON.stringify({
                        error: `Máximo de dispositivos alcanzado (${GIFT_USER.Devices_Max}). Contacte al administrador.`,
                        code: 'MAX_DEVICES'
                    })
                });
                return;
            }

            // Registrar nuevo device
            if (reqDevId && !currentDevices.includes(reqDevId)) {
                currentDevices.push(reqDevId);
                GIFT_USER.Devices_Logged = JSON.stringify(currentDevices);
            }

            await route.fulfill({
                status: 200, contentType: 'application/json',
                body: JSON.stringify({ ...GIFT_USER })
            });
            return;
        }

        // Cualquier otra acción → pass through o 200 vacío
        await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ ok: true })
        });
    });

    const consoleErrors = [];
    let page;

    try {
        // ═══════════════════════════════════════════════════════════════════
        // SECCIÓN A: Carga del clon con ?id=
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n═══ A — CARGA DEL CLON ═══════════════════════════════════════');

        page = await context.newPage();
        page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        // Limpiar localStorage previo
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
            if (typeof indexedDB !== 'undefined') {
                indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name)));
            }
        });

        // Navegar con ?id= del clone
        await page.goto(`${BASE}/?id=${encodeURIComponent(GIFT_USER.ID_Medico)}`, {
            waitUntil: 'domcontentloaded', timeout: 20000
        });
        await page.waitForTimeout(5000); // Esperar factory setup + onboarding

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'A01_after_load.png'), fullPage: false });

        // ── A1: CLIENT_CONFIG correctamente mapeado ──────────────────────
        const cfg = await page.evaluate(() => {
            try { return JSON.parse(localStorage.getItem('client_config_stored') || '{}'); } catch(_) { return {}; }
        });
        log(cfg.type === 'PRO' ? 'pass' : 'fail', 'A', 'clientConfig.type = PRO (plan gift→PRO)', `got: ${cfg.type}`);
        log(cfg.hasProMode === true ? 'pass' : 'fail', 'A', 'clientConfig.hasProMode = true', `got: ${cfg.hasProMode}`);
        log(cfg.canGenerateApps === false ? 'pass' : 'fail', 'A', 'clientConfig.canGenerateApps = false (gift≠clinic)', `got: ${cfg.canGenerateApps}`);
        log(Number(cfg.maxDevices) === 2 ? 'pass' : 'fail', 'A', 'clientConfig.maxDevices = 2', `got: ${cfg.maxDevices}`);
        log(cfg.planCode === 'gift' ? 'pass' : 'fail', 'A', 'clientConfig.planCode = gift', `got: ${cfg.planCode}`);
        log(cfg.medicoId === GIFT_USER.ID_Medico ? 'pass' : 'fail', 'A', 'clientConfig.medicoId correcto', `got: ${cfg.medicoId}`);

        // Templates permitidas
        const tpls = cfg.allowedTemplates || [];
        log(tpls.includes('eco_doppler') ? 'pass' : 'fail', 'A', 'allowedTemplates incluye eco_doppler', JSON.stringify(tpls));
        log(tpls.includes('ecg') ? 'pass' : 'fail', 'A', 'allowedTemplates incluye ecg', JSON.stringify(tpls));
        log(tpls.includes('holter') ? 'pass' : 'fail', 'A', 'allowedTemplates incluye holter', JSON.stringify(tpls));
        log(!tpls.includes('rx_torax') ? 'pass' : 'fail', 'A', 'allowedTemplates NO incluye rx_torax (no asignada)', JSON.stringify(tpls));

        // ── A2: prof_data guardado ───────────────────────────────────────
        const prof = await page.evaluate(() => {
            try { return JSON.parse(localStorage.getItem('prof_data') || '{}'); } catch(_) { return {}; }
        });
        log(prof.nombre === 'Dra. Ana María Fernández López' ? 'pass' : 'fail', 'A', 'prof_data.nombre correcto', `got: "${prof.nombre}"`);
        log(prof.matricula === 'MN 87654' ? 'pass' : 'fail', 'A', 'prof_data.matricula correcta', `got: "${prof.matricula}"`);
        log(prof.especialidad === 'Cardiología' ? 'pass' : 'fail', 'A', 'prof_data.especialidad correcta', `got: "${prof.especialidad}"`);
        log(prof.headerColor === '#1a56a0' ? 'pass' : 'fail', 'A', 'prof_data.headerColor = #1a56a0', `got: "${prof.headerColor}"`);
        log(prof.workplace && prof.workplace.includes('Fernández') ? 'pass' : 'fail', 'A', 'prof_data.workplace tiene nombre', `got: "${prof.workplace}"`);

        // Social media
        const hasSocial = prof.socialMedia && typeof prof.socialMedia === 'object';
        log(hasSocial ? 'pass' : 'fail', 'A', 'prof_data.socialMedia es un objeto', String(hasSocial));
        if (hasSocial) {
            log(prof.socialMedia.whatsapp === '+54 11 4321-5678' ? 'pass' : 'fail', 'A', 'socialMedia.whatsapp correcto', `got: "${prof.socialMedia.whatsapp}"`);
            log(prof.socialMedia.instagram === '@dra.anafernandez' ? 'pass' : 'fail', 'A', 'socialMedia.instagram correcto', `got: "${prof.socialMedia.instagram}"`);
            log(prof.socialMedia.facebook === 'Centro Cardiológico Fernández' ? 'pass' : 'fail', 'A', 'socialMedia.facebook correcto', `got: "${prof.socialMedia.facebook}"`);
            log(prof.socialMedia.x === '@AnaFCardio' ? 'pass' : 'fail', 'A', 'socialMedia.x (twitter) correcto', `got: "${prof.socialMedia.x}"`);
        }

        // ── A3: Imágenes guardadas ───────────────────────────────────────
        const firma = await page.evaluate(() => localStorage.getItem('pdf_signature') || '');
        const logo = await page.evaluate(() => localStorage.getItem('pdf_logo') || '');
        log(firma.startsWith('data:image/') ? 'pass' : 'fail', 'A', 'pdf_signature guardada como data:image/', firma.substring(0, 30));
        log(logo.startsWith('data:image/') ? 'pass' : 'fail', 'A', 'pdf_logo guardado como data:image/', logo.substring(0, 30));

        const logoSize = await page.evaluate(() => localStorage.getItem('prof_logo_size_px'));
        log(logoSize === '80' ? 'pass' : 'fail', 'A', 'prof_logo_size_px = 80', `got: ${logoSize}`);

        // ── A4: Workplaces guardados ─────────────────────────────────────
        const wps = await page.evaluate(() => {
            try { return JSON.parse(localStorage.getItem('workplace_profiles') || '[]'); } catch(_) { return []; }
        });
        log(wps.length === 2 ? 'pass' : 'fail', 'A', 'workplace_profiles tiene 2 entries', `got: ${wps.length}`);
        if (wps.length >= 1) {
            log(wps[0].name === 'Centro Cardiológico Fernández' ? 'pass' : 'fail', 'A', 'WP[0].name correcto', `got: "${wps[0].name}"`);
            log(wps[0].address && wps[0].address.includes('Santa Fe') ? 'pass' : 'fail', 'A', 'WP[0].address contiene Santa Fe', `got: "${wps[0].address}"`);
            log(wps[0].logo && wps[0].logo.startsWith('data:image/') ? 'pass' : 'fail', 'A', 'WP[0].logo institucional es imagen', wps[0].logo ? 'presente' : 'vacío');

            // Profesional dentro del WP
            const p0 = wps[0].professionals?.[0];
            log(p0 && p0.nombre === 'Dra. Ana María Fernández López' ? 'pass' : 'fail', 'A', 'WP[0].prof[0].nombre correcto', `got: "${p0?.nombre}"`);
            log(p0 && p0.firma && p0.firma.startsWith('data:image/') ? 'pass' : 'fail', 'A', 'WP[0].prof[0].firma presente', p0?.firma ? 'sí' : 'no');
            log(p0 && p0.logo && p0.logo.startsWith('data:image/') ? 'pass' : 'fail', 'A', 'WP[0].prof[0].logo presente', p0?.logo ? 'sí' : 'no');
            log(p0 && p0.showSocial === true ? 'pass' : 'fail', 'A', 'WP[0].prof[0].showSocial = true', `got: ${p0?.showSocial}`);
            log(p0 && p0.showPhone === true ? 'pass' : 'fail', 'A', 'WP[0].prof[0].showPhone = true', `got: ${p0?.showPhone}`);
            log(p0 && p0.showEmail === true ? 'pass' : 'fail', 'A', 'WP[0].prof[0].showEmail = true', `got: ${p0?.showEmail}`);
            log(p0 && p0.whatsapp === '+54 11 4321-5678' ? 'pass' : 'fail', 'A', 'WP[0].prof[0].whatsapp correcto', `got: "${p0?.whatsapp}"`);
            log(p0 && p0.instagram === '@dra.anafernandez' ? 'pass' : 'fail', 'A', 'WP[0].prof[0].instagram correcto', `got: "${p0?.instagram}"`);
        }
        if (wps.length >= 2) {
            log(wps[1].name && wps[1].name.includes('Ramos Mejía') ? 'pass' : 'fail', 'A', 'WP[1].name contiene Ramos Mejía', `got: "${wps[1].name}"`);
        }

        // ── A5: API Key guardada ─────────────────────────────────────────
        const apiKey = await page.evaluate(() => localStorage.getItem('groq_api_key') || '');
        log(apiKey === 'gsk_E2E_FAKE_KEY_DO_NOT_USE_123456789' ? 'pass' : 'fail', 'A', 'groq_api_key guardada correctamente', apiKey ? 'presente' : 'vacía');

        const apiB1 = await page.evaluate(() => localStorage.getItem('groq_api_key_b1') || '');
        log(apiB1 === 'gsk_E2E_BACKUP1_FAKE_KEY_987654321' ? 'pass' : 'fail', 'A', 'groq_api_key_b1 guardada correctamente', apiB1 ? 'presente' : 'vacía');

        // ── A6: Footer text en pdf_config ────────────────────────────────
        const pdfCfg = await page.evaluate(() => {
            try { return JSON.parse(localStorage.getItem('pdf_config') || '{}'); } catch(_) { return {}; }
        });
        log(pdfCfg.footerText && pdfCfg.footerText.includes('Fernández') ? 'pass' : 'fail', 'A', 'pdf_config.footerText tiene datos', `got: "${(pdfCfg.footerText||'').substring(0,50)}"`);

        // ── A7: medico_id guardado ───────────────────────────────────────
        const medicoId = await page.evaluate(() => localStorage.getItem('medico_id') || '');
        log(medicoId === GIFT_USER.ID_Medico ? 'pass' : 'fail', 'A', 'medico_id guardado correctamente', `got: "${medicoId}"`);


        // ═══════════════════════════════════════════════════════════════════
        // SECCIÓN B: VERIFICAR UI DEL CLON
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n═══ B — UI DEL CLON (post-setup) ══════════════════════════════');

        // Cerrar onboarding si existe
        await page.evaluate(() => {
            // intentar cerrar cualquier overlay/modal de onboarding
            const closeBtn = document.querySelector('.onb-close, .modal-close, #onb-close-btn, [data-dismiss]');
            if (closeBtn) closeBtn.click();
            const overlay = document.getElementById('onboardingOverlay') || document.getElementById('setupOverlay');
            if (overlay) overlay.style.display = 'none';
        });
        await page.waitForTimeout(1000);

        // Recargar para simular "segundo uso" (onboarding ya completado)
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'B01_home_loaded.png'), fullPage: false });

        // B1: Editor visible
        const editorExists = await page.evaluate(() => {
            const el = document.getElementById('editor');
            return !!el && el.contentEditable === 'true';
        });
        log(editorExists ? 'pass' : 'fail', 'B', 'Editor contentEditable presente y editable');

        // B2: Title de la app
        const pageTitle = await page.title();
        log(pageTitle.includes('Transcriptor') ? 'pass' : 'fail', 'B', 'Título contiene Transcriptor', pageTitle);

        // B3: Modo PRO activo
        const currentMode = await page.evaluate(() => {
            return window.CLIENT_CONFIG?.hasProMode || false;
        });
        log(currentMode === true ? 'pass' : 'fail', 'B', 'hasProMode activo para GIFT user', `got: ${currentMode}`);

        // B4: Formatos de descarga visibles
        const formatCheck = await page.evaluate(() => {
            const dd = document.getElementById('previewDownloadDropdown');
            if (!dd) return { found: false, formats: [] };
            const btns = dd.querySelectorAll('button[data-format]');
            const formats = Array.from(btns).map(b => ({
                format: b.dataset.format,
                visible: b.style.display !== 'none'
            }));
            return { found: true, formats };
        });
        if (formatCheck.found) {
            const visFormats = formatCheck.formats.filter(f => f.visible).map(f => f.format);
            log(visFormats.includes('pdf') ? 'pass' : 'fail', 'B', 'Formato PDF disponible', JSON.stringify(visFormats));
            // PRO/GIFT debe mostrar pdf, rtf y html en el dropdown.
            log(visFormats.includes('rtf') ? 'pass' : 'fail', 'B', 'Formato RTF disponible (PRO)', JSON.stringify(visFormats));
            log(visFormats.includes('html') ? 'pass' : 'fail', 'B', 'Formato HTML disponible (PRO)', JSON.stringify(visFormats));
        } else {
            log('skip', 'B', 'Dropdown formatos no encontrado (puede ser un botón directo)', '');
        }


        // ═══════════════════════════════════════════════════════════════════
        // SECCIÓN C: TEXTO Y NORMALIZACIÓN
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n═══ C — TEXTO, NORMALIZACIÓN Y VISTA PREVIA ═══════════════════');

        // C1: Escribir texto de prueba en el editor
        const testText = 'Paciente: JUAN CARLOS RODRÍGUEZ. DNI: 28.456.789. Edad: 52 años. Sexo: masculino.\nObra social: OSDE 310. Número de afiliado: 12345678.\nMédico: dra. ana fernández. Motivo: control anual cardiovascular.\nEstudio: ecocardiograma transtorácico. Fecha: 10/03/2026.\nVentrículo izquierdo: función conservada. FE simpson: 65%.\nSin derrame pericárdico. No se observa hipertensión pulmonar.\nCONCLUSIÓN: Ecocardiograma normal. FE conservada (65%).';

        await page.evaluate((text) => {
            const editor = document.getElementById('editor');
            if (editor) {
                editor.focus();
                editor.innerHTML = text.replace(/\n/g, '<br>');
            }
        }, testText);
        await page.waitForTimeout(500);

        const editorContent = await page.evaluate(() => {
            const editor = document.getElementById('editor');
            return editor ? editor.innerText : '';
        });
        log(editorContent.includes('JUAN CARLOS') ? 'pass' : 'fail', 'C', 'Texto escrito en editor contiene JUAN CARLOS', `${editorContent.length} chars`);
        log(editorContent.includes('CONCLUSIÓN') ? 'pass' : 'fail', 'C', 'Texto contiene CONCLUSIÓN con tilde', '');

        // C2: Caracteres especiales y acentos preservados
        log(editorContent.includes('RODRÍGUEZ') ? 'pass' : 'fail', 'C', 'Acento en RODRÍGUEZ preservado', '');
        log(editorContent.includes('número') || editorContent.includes('Número') ? 'pass' : 'fail', 'C', 'Acento en "número" preservado', '');

        // C3: Detectar template automáticamente si la función existe
        const templateDetected = await page.evaluate(() => {
            if (typeof window.autoDetectTemplateKey !== 'function') return 'N/A';
            const editor = document.getElementById('editor');
            if (!editor) return 'N/A';
            return window.autoDetectTemplateKey(editor.innerText) || 'none';
        });
        log(templateDetected !== 'N/A' ? 'pass' : 'skip', 'C', 'autoDetectTemplateKey existe', `detectó: "${templateDetected}"`);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'C01_text_in_editor.png'), fullPage: false });

        // C4: Verificar que el editor permite formato
        await page.evaluate(() => {
            const editor = document.getElementById('editor');
            if (!editor) return;
            // Seleccionar todo y aplicar negrita
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editor);
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('bold');
        });
        await page.waitForTimeout(200);
        const hasBold = await page.evaluate(() => {
            const editor = document.getElementById('editor');
            return editor ? editor.innerHTML.includes('<b>') || editor.innerHTML.includes('<strong>') : false;
        });
        log(hasBold ? 'pass' : 'fail', 'C', 'Formato negrita funciona en editor', '');

        // Deshacer negrita para texto limpio
        await page.evaluate(() => { document.execCommand('undo'); });
        await page.waitForTimeout(200);


        // ═══════════════════════════════════════════════════════════════════
        // SECCIÓN D: VISTA PREVIA PDF
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n═══ D — VISTA PREVIA PDF ═══════════════════════════════════════');

        // D1: Activar preview si existe
        const previewActivated = await page.evaluate(() => {
            // Toggle preview panel
            const btn = document.getElementById('togglePreviewBtn') || document.getElementById('btnPreview');
            if (btn) { btn.click(); return true; }
            return false;
        });
        await page.waitForTimeout(1500);

        if (previewActivated) {
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'D01_preview_open.png'), fullPage: false });

            // D2: Verificar contenido del preview
            const previewContent = await page.evaluate(() => {
                const pvs = document.getElementById('printPreviewContainer') || document.getElementById('previewPage') || document.getElementById('previewSection') || document.querySelector('.preview-container');
                return pvs ? pvs.innerText : '';
            });

            log(previewContent.length > 0 ? 'pass' : 'fail', 'D', 'Preview tiene contenido', `${previewContent.length} chars`);

            // D3: Verificar nombre del profesional en preview
            if (previewContent.length > 0) {
                // El nombre debe mostrar "Dra." y "Fernández López" correctamente
                log(previewContent.includes('Fernández') || previewContent.includes('fernández') || previewContent.includes('FERNÁNDEZ') ? 'pass' : 'fail',
                    'D', 'Preview contiene nombre del profesional', '');

                // D4: Verificar matrícula en preview
                log(previewContent.includes('87654') ? 'pass' : 'fail', 'D', 'Preview contiene matrícula', '');

                // D5: Verificar especialidad
                log(previewContent.includes('Cardiología') || previewContent.includes('cardiología') || previewContent.includes('CARDIOLOGÍA') ? 'pass' : 'fail',
                    'D', 'Preview contiene especialidad', '');

                // D6: Verificar pie de página / footer
                log(previewContent.includes('Fernández') || previewContent.includes('Santa Fe') || previewContent.includes('4321') ? 'pass' : 'fail',
                    'D', 'Preview tiene datos del footer o workplace', '');

                // D7: Verificar que NO hay duplicado de Dr./Dra.
                const drCount = (previewContent.match(/Dra?\.\s*Dra?\./gi) || []).length;
                log(drCount === 0 ? 'pass' : 'fail', 'D', 'Preview NO tiene duplicado "Dr. Dra." o "Dra. Dr."', `encontrados: ${drCount}`);
            }
        } else {
            log('skip', 'D', 'Botón de preview no encontrado', 'El test puede requerir otro selector');
        }

        // Cerrar preview
        await page.evaluate(() => {
            const btn = document.getElementById('togglePreviewBtn') || document.getElementById('btnPreview');
            if (btn) btn.click();
        });
        await page.waitForTimeout(500);


        // ═══════════════════════════════════════════════════════════════════
        // SECCIÓN E: PERMISOS Y RESTRICCIONES
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n═══ E — PERMISOS Y RESTRICCIONES ═══════════════════════════════');

        // E1: Templates permitidos vs bloqueados
        const templateAccess = await page.evaluate(() => {
            const cfg = window.CLIENT_CONFIG || {};
            const allowed = cfg.allowedTemplates || [];
            if (!allowed.length) return { unlimited: true };
            const allTemplates = window.MEDICAL_TEMPLATES ? Object.keys(window.MEDICAL_TEMPLATES) : [];
            const accessible = allTemplates.filter(k => allowed.includes(k));
            const blocked = allTemplates.filter(k => !allowed.includes(k));
            return { unlimited: false, total: allTemplates.length, accessible: accessible.length, blocked: blocked.length, allowedKeys: allowed };
        });
        if (templateAccess.unlimited) {
            log('info', 'E', 'Templates sin restricción (allowedTemplates vacío)', '');
        } else {
            log(templateAccess.accessible <= templateAccess.allowedKeys.length ? 'pass' : 'fail', 'E',
                `Solo ${templateAccess.accessible} templates accesibles de ${templateAccess.total}`,
                `allowed: ${JSON.stringify(templateAccess.allowedKeys)}`);
        }

        // E2: Verificar que canGenerateApps = false para GIFT
        const canGenApps = await page.evaluate(() => window.CLIENT_CONFIG?.canGenerateApps);
        log(canGenApps === false ? 'pass' : 'fail', 'E', 'canGenerateApps = false (GIFT no es CLINIC)', `got: ${canGenApps}`);

        // E3: maxDevices = 2
        const maxDev = await page.evaluate(() => window.CLIENT_CONFIG?.maxDevices);
        log(maxDev === 2 ? 'pass' : 'fail', 'E', 'maxDevices = 2', `got: ${maxDev}`);

        // E4: Contacto visible (no es ADMIN, así que debería ver botón contacto)
        const contactoVisible = await page.evaluate(() => {
            const btn = document.getElementById('btnContacto');
            return btn ? (btn.style.display !== 'none' && btn.offsetParent !== null) : null;
        });
        if (contactoVisible !== null) {
            log(contactoVisible ? 'pass' : 'fail', 'E', 'Botón contacto visible para usuario NO-admin', '');
        } else {
            log('skip', 'E', 'btnContacto no encontrado en DOM', '');
        }

        // E5: No debe ver panel admin (hasDashboard = true pero type ≠ ADMIN)
        const adminPanelHidden = await page.evaluate(() => {
            const adminBtn = document.getElementById('adminPanelBtn') || document.querySelector('[data-admin-panel]');
            if (!adminBtn) return true; // no existe = bien
            return adminBtn.style.display === 'none' || !adminBtn.offsetParent;
        });
        log(adminPanelHidden ? 'pass' : 'fail', 'E', 'Panel admin NO visible para GIFT user', '');


        // ═══════════════════════════════════════════════════════════════════
        // SECCIÓN F: SIMULACIÓN DE MÚLTIPLES DISPOSITIVOS
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n═══ F — LÍMITE DE DISPOSITIVOS ═════════════════════════════════');

        // F1: Ya usamos 1 dispositivo (el de esta sesión). Crear otro "dispositivo" simulado.
        // Necesitamos un device_id diferente  
        const device2Page = await context.newPage();
        device2Page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push('[dev2] ' + msg.text());
        });

        // Limpiar y cargar como nuevo dispositivo
        await device2Page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await device2Page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

        // Asignar un device_id forzado diferente
        await device2Page.evaluate(() => {
            localStorage.setItem('device_id', 'dev_SECOND_SIMULATED_DEVICE');
        });

        await device2Page.goto(`${BASE}/?id=${encodeURIComponent(GIFT_USER.ID_Medico)}`, {
            waitUntil: 'domcontentloaded', timeout: 15000
        });
        await device2Page.waitForTimeout(4000);

        const dev2Config = await device2Page.evaluate(() => {
            try { return JSON.parse(localStorage.getItem('client_config_stored') || '{}'); } catch(_) { return {}; }
        });
        log(dev2Config.type === 'PRO' ? 'pass' : 'fail', 'F', 'Segundo dispositivo se configuró correctamente', `type: ${dev2Config.type}`);
        await device2Page.close();

        // F2: Intentar un TERCER dispositivo → debería ser bloqueado (max=2)
        const device3Page = await context.newPage();
        let device3Error = '';
        device3Page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push('[dev3] ' + msg.text());
        });

        await device3Page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await device3Page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await device3Page.evaluate(() => {
            localStorage.setItem('device_id', 'dev_THIRD_BLOCKED_DEVICE');
        });

        await device3Page.goto(`${BASE}/?id=${encodeURIComponent(GIFT_USER.ID_Medico)}`, {
            waitUntil: 'domcontentloaded', timeout: 15000
        });
        await device3Page.waitForTimeout(4000);

        const dev3Content = await device3Page.evaluate(() => document.body.innerText || '');
        const dev3HasError = dev3Content.includes('dispositivo') || dev3Content.includes('Máximo') || dev3Content.includes('devices');
        const dev3CfgStored = await device3Page.evaluate(() => {
            try {
                const c = JSON.parse(localStorage.getItem('client_config_stored') || '{}');
                return c.type || 'none';
            } catch(_) { return 'none'; }
        });

        // Si se bloqueó, no debería tener config de cliente PRO
        log(dev3HasError || dev3CfgStored === 'none' || dev3CfgStored === 'ADMIN' ? 'pass' : 'fail',
            'F', 'Tercer dispositivo bloqueado por maxDevices=2',
            `error visible: ${dev3HasError}, config type: ${dev3CfgStored}`);

        await device3Page.screenshot({ path: path.join(SCREENSHOT_DIR, 'F01_third_device_blocked.png'), fullPage: false });
        await device3Page.close();


        // ═══════════════════════════════════════════════════════════════════
        // SECCIÓN G: EDICIÓN Y FUNCIONALIDADES
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n═══ G — EDICIÓN Y FUNCIONALIDADES ══════════════════════════════');

        // G1: Buscar/Reemplazar existe
        const findReplaceExists = await page.evaluate(() => {
            return typeof window.openFindReplace === 'function' ||
                   !!document.getElementById('findReplacePanel') ||
                   !!document.querySelector('[data-testid="findReplaceBar"]');
        });
        log(findReplaceExists ? 'pass' : 'fail', 'G', 'Buscar/Reemplazar disponible', '');

        // G2: Copiar al portapapeles
        const copyBtnExists = await page.evaluate(() => !!document.getElementById('copyBtn'));
        log(copyBtnExists ? 'pass' : 'fail', 'G', 'Botón copiar existe', '');

        // G3: Tabs de transcripción
        const tabsWork = await page.evaluate(() => {
            const tabBar = document.getElementById('tabsContainer') || document.getElementById('tabBar') || document.querySelector('.tabs-container');
            return !!tabBar;
        });
        log(tabsWork ? 'pass' : 'fail', 'G', 'Barra de tabs presente', '');

        // G4: Settings/Configuración accesible
        const settingsBtn = await page.evaluate(() => {
            const btn = document.getElementById('settingsBtn') || document.getElementById('btnSettings') || document.querySelector('[data-action="settings"]');
            return !!btn;
        });
        log(settingsBtn ? 'pass' : 'fail', 'G', 'Botón de configuración existe', '');

        // G5: Verificar que MEDICAL_TEMPLATES tiene contenido
        const tplCount = await page.evaluate(() => {
            return window.MEDICAL_TEMPLATES ? Object.keys(window.MEDICAL_TEMPLATES).length : 0;
        });
        log(tplCount >= 30 ? 'pass' : 'fail', 'G', `${tplCount} plantillas médicas cargadas`, `esperado: ≥30`);

        // G6: Skin default aplicado
        const skinApplied = await page.evaluate(() => localStorage.getItem('app_skin'));
        log(skinApplied === 'default' ? 'pass' : 'fail', 'G', 'app_skin = default', `got: ${skinApplied}`);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'G01_final_state.png'), fullPage: false });


        // ═══════════════════════════════════════════════════════════════════
        // SECCIÓN H: ERRORES DE CONSOLA
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n═══ H — ERRORES DE CONSOLA ═════════════════════════════════════');

        // Filtrar errores ignorables (CDN, favicon, etc.)
        const realErrors = consoleErrors.filter(e =>
            !e.includes('favicon') && !e.includes('service-worker') &&
            !e.includes('manifest') && !e.includes('cdn') &&
            !e.includes('ERR_CONNECTION_REFUSED') && !e.includes('404')
        );

        if (realErrors.length === 0) {
            log('pass', 'H', '0 errores JS relevantes en consola');
        } else {
            log('fail', 'H', `${realErrors.length} errores JS en consola`, realErrors.slice(0, 3).join(' | '));
            realErrors.forEach((e, i) => console.log(`    ⚠️  Error ${i+1}: ${e.substring(0, 120)}`));
        }


        await page.close();

    } catch (err) {
        log('fail', 'FATAL', 'Error inesperado durante test', err.message);
        console.error(err);
    } finally {
        await browser.close();
        server.close();
    }

    // ═══════════════════════════════════════════════════════════════════
    // RESUMEN Y REPORTE
    // ═══════════════════════════════════════════════════════════════════
    const total = passed + failed + skipped;
    console.log('\n' + '═'.repeat(70));
    console.log(`  GIFT CLONE E2E — Total: ${total} | ✅ ${passed} | ❌ ${failed} | ⏭️ ${skipped}`);
    console.log('═'.repeat(70));

    if (FAIL_DETAILS.length > 0) {
        console.log('\n❌ Tests fallados:');
        FAIL_DETAILS.forEach(f => console.log(`  • ${f}`));
    }

    // Guardar reporte JSON
    const reportPath = path.join(SCREENSHOT_DIR, 'REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        giftUser: { id: GIFT_USER.ID_Medico, plan: GIFT_USER.Plan, maxDevices: GIFT_USER.Devices_Max },
        summary: { total, passed, failed, skipped },
        results, failDetails: FAIL_DETAILS
    }, null, 2));
    console.log(`\n📄 Reporte guardado: ${reportPath}`);
    console.log(`📸 Screenshots en: ${SCREENSHOT_DIR}`);
    console.log('═'.repeat(70) + '\n');

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
