/**
 * E2E full QA for Transcriptor Pro (Playwright, Chromium)
 * Scope focus per user request:
 * - No audio transcription flow (omitted)
 * - Massive structuring validation: 1 raw text por plantilla
 * - Sin uso de Groq real (mock de API de estructuracion)
 * - Contact flow must NOT open mail client (no mailto popup)
 * - Fake professional/patient/workplace/signature/logo data injected for report integrity checks
 *
 * Usage (PowerShell example):
 * $env:APP_URL='https://transcriptorpro.github.io/transcripcion/'
 * $env:CASES_PER_TEMPLATE='1'
 * node tests/e2e-full-qa-playwright.js
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.APP_URL || 'https://transcriptorpro.github.io/transcripcion/';
const CASES_PER_TEMPLATE = Math.max(1, Number(process.env.CASES_PER_TEMPLATE || 1));
const MAX_CASES = Number(process.env.MAX_CASES || 0); // 0 = all

const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

const fakeProfiles = [
    {
        doctor: 'Dra. Lucia Ferrer',
        matricula: 'MP-AR-4401',
        specialty: 'Cardiologia',
        workplace: 'Clinica Aurora Norte',
        address: 'Av. Libertad 4521, CABA',
        phone: '+54 11 4444-9901',
        email: 'contacto.aurora@demo-salud.test',
        social: '@aurora_cardiologia'
    },
    {
        doctor: 'Dr. Tomas Beltran',
        matricula: 'MN-AR-9922',
        specialty: 'Diagnostico por Imagenes',
        workplace: 'Centro Medico Delta Sur',
        address: 'Bv. San Martin 1890, Cordoba',
        phone: '+54 351 555-1200',
        email: 'informes.delta@demo-salud.test',
        social: '@delta_imagen'
    }
];

function nowStamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function esc(s) {
    return String(s || '').replace(/[|]/g, '\\|').replace(/\n/g, ' ');
}

function normalizeText(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function pickKeyword(template, idx = 0) {
    const kws = Array.isArray(template?.keywords) ? template.keywords.filter(Boolean) : [];
    if (!kws.length) return template?.name || template?.key || 'estudio';
    return kws[Math.min(idx, kws.length - 1)];
}

function buildRawText(template, profile, sampleIndex) {
    const kw1 = pickKeyword(template, 0);
    const kw2 = pickKeyword(template, 1);
    const patientName = sampleIndex % 2 === 0 ? 'Juan Perez' : 'Ana Gomez';
    const dni = sampleIndex % 2 === 0 ? '31.456.789' : '28.123.456';
    const age = sampleIndex % 2 === 0 ? '58' : '44';
    const symptom = sampleIndex % 2 === 0 ? 'dolor toracico y disnea de esfuerzo' : 'fatiga y episodios de mareos';

    return [
        `Paciente ${patientName}, DNI ${dni}, ${age} anos.`,
        `Se realiza ${kw1}${kw2 ? ` y control complementario de ${kw2}` : ''}.`,
        `Antecedentes: HTA de larga data, ex tabaquismo, consulta por ${symptom}.`,
        `Hallazgos en lenguaje libre dictado por voz con errores menores para corregir en estructuracion.`,
        `Profesional solicitante: ${profile.doctor}, ${profile.specialty}, matricula ${profile.matricula}.`,
        `Lugar: ${profile.workplace}, ${profile.address}. Contacto ${profile.email} ${profile.social}.`,
        `Conclusion dictada: hay datos relevantes para resumir en conclusion sin inventar valores.`
    ].join(' ');
}

async function main() {
    const reportRoot = path.join(process.cwd(), 'anexos', 'accesorios');
    const artifactsDir = path.join(reportRoot, `e2e_full_qa_artifacts_${nowStamp()}`);
    ensureDir(artifactsDir);
    const screenshotsDir = path.join(artifactsDir, 'screenshots');
    ensureDir(screenshotsDir);

    const results = [];
    const addResult = (id, status, detail, extra = {}) => {
        results.push({ id, status, detail, ...extra });
        const icon = status === 'PASS' ? 'OK' : status === 'WARN' ? 'WARN' : 'FAIL';
        console.log(`[${icon}] ${id} - ${detail}`);
    };

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });

    await context.addInitScript(({ keys, fakePng }) => {
        window.__openedUrls = [];
        const origOpen = window.open;
        window.open = function wrappedOpen(url, target, features) {
            try {
                window.__openedUrls.push(String(url || ''));
            } catch (_) {}
            return origOpen.call(window, url, target, features);
        };

        // Evitar llamadas reales: key dummy + mock de red en Playwright.
        localStorage.setItem('groq_api_key', 'gsk_mock_only_local');

        const storedConfig = {
            type: 'PRO',
            plan: 'PRO',
            hasProMode: true,
            maxDevices: 3,
            medicoId: 'E2E-QA-0001',
            contactEmail: 'aldowagner78@gmail.com'
        };
        localStorage.setItem('client_config_stored', JSON.stringify(storedConfig));

        const profData = {
            nombre: 'Dra. QA Inventada',
            matricula: 'MP-QA-1001',
            especialidad: 'Clinica Medica',
            firma: fakePng,
            logo: fakePng
        };
        localStorage.setItem('prof_data', JSON.stringify(profData));
        localStorage.setItem('pdf_signature', fakePng);
        localStorage.setItem('pdf_logo', fakePng);
        localStorage.setItem('customPrimaryColor', '#0f766e');
        localStorage.setItem('pdf_footer_text', 'Informe de prueba integral QA');
    }, { fakePng: tinyPng });

    // Mock global de Groq chat completions para estructurar sin consumir API real.
    await context.route('**/openai/v1/chat/completions', async (route) => {
        let templateName = 'Informe Medico';
        try {
            const body = route.request().postDataJSON() || {};
            const msgs = Array.isArray(body.messages) ? body.messages : [];
            const userMsg = msgs.find((m) => m && m.role === 'user')?.content || '';
            const txt = String(userMsg);
            const m = txt.match(/plantilla\s*[:\-]\s*([^\n\.]+)/i) || txt.match(/estudio\s*[:\-]\s*([^\n\.]+)/i);
            if (m && m[1]) templateName = m[1].trim();
        } catch (_) {}

        const md = [
            `# INFORME DE ${templateName.toUpperCase()}`,
            '',
            '## HALLAZGOS',
            '- Hallazgo principal: [No especificado].',
            '- Hallazgo secundario: dentro de parametros esperados.',
            '',
            '## CONCLUSION',
            'Conclusion estructurada automaticamente para validacion QA sin Groq real.'
        ].join('\n');

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ choices: [{ message: { content: md } }] })
        });
    });

    // Mock de models para evitar 401 por claves fake en validaciones de UI.
    await context.route('**/openai/v1/models', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                object: 'list',
                data: [
                    { id: 'llama-3.3-70b-versatile', object: 'model', owned_by: 'groq' }
                ]
            })
        });
    });

    let page = null;
    const attachPageHandlers = (p) => {
        p.on('console', (msg) => {
            if (msg.type() === 'error') console.log('[browser:error]', msg.text());
        });
        p.on('response', (res) => {
            try {
                if (res.status() === 401) {
                    const req = res.request();
                    console.log('[browser:401]', JSON.stringify({
                        url: res.url(),
                        method: req.method(),
                        resourceType: req.resourceType()
                    }));
                }
            } catch (_) {}
        });
        p.on('requestfailed', (req) => {
            try {
                const err = req.failure()?.errorText || 'unknown_error';
                if (!String(req.url()).includes('favicon')) {
                    console.log('[browser:requestfailed]', JSON.stringify({
                        url: req.url(),
                        method: req.method(),
                        resourceType: req.resourceType(),
                        error: err
                    }));
                }
            } catch (_) {}
        });
    };
    const ensurePage = async () => {
        if (!page || page.isClosed()) {
            page = await context.newPage();
            attachPageHandlers(page);
            await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(1200);
        }
        return page;
    };

    try {
        await ensurePage();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotsDir, '01_home.png'), fullPage: true });
        addResult('SMOKE-LOAD', 'PASS', 'App cargada en entorno objetivo');
    } catch (e) {
        addResult('SMOKE-LOAD', 'FAIL', `No cargo app: ${e.message}`);
        await browser.close();
        writeReport(reportRoot, artifactsDir, results);
        process.exit(1);
    }

    // Read template catalog from runtime app
    const templates = await page.evaluate(() => {
        const entries = Object.entries(window.MEDICAL_TEMPLATES || {})
            .filter(([key]) => key !== 'generico')
            .map(([key, t]) => ({ key, name: t?.name || key, keywords: Array.isArray(t?.keywords) ? t.keywords : [] }));
        return entries;
    });

    if (!templates.length) {
        addResult('STRUCT-TEMPLATES', 'FAIL', 'No se encontraron plantillas en runtime');
        await browser.close();
        writeReport(reportRoot, artifactsDir, results);
        process.exit(1);
    }

    addResult('STRUCT-TEMPLATES', 'PASS', `Plantillas detectadas: ${templates.length}`);

    const cases = [];
    for (const t of templates) {
        for (let i = 0; i < CASES_PER_TEMPLATE; i++) {
            const profile = fakeProfiles[(cases.length + i) % fakeProfiles.length];
            cases.push({
                templateKey: t.key,
                templateName: t.name,
                sample: i + 1,
                profile,
                rawText: buildRawText(t, profile, i)
            });
        }
    }

    const executionCases = MAX_CASES > 0 ? cases.slice(0, MAX_CASES) : cases;
    addResult('STRUCT-CASES', 'PASS', `Casos a ejecutar: ${executionCases.length} (${CASES_PER_TEMPLATE} por plantilla)`);

    for (let i = 0; i < executionCases.length; i++) {
        const tc = executionCases[i];
        const id = `STRUCT-${String(i + 1).padStart(3, '0')}`;

        try {
            let detection = 'generico';
            let structResult = null;
            let lastError = null;

            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    await ensurePage();
                    detection = await page.evaluate((text) => {
                        return typeof window.autoDetectTemplateKey === 'function' ? window.autoDetectTemplateKey(text) : 'generico';
                    }, tc.rawText);

                    structResult = await page.evaluate(async ({ rawText }) => {
                        const editor = document.getElementById('editor');
                        if (!editor) return { ok: false, reason: 'editor_not_found' };
                        editor.innerHTML = '';
                        editor.textContent = rawText;
                        window.selectedTemplate = 'generico';

                        const started = Date.now();
                        const ok = await window.autoStructure({ silent: true });
                        const elapsedMs = Date.now() - started;
                        const outText = editor.innerText || '';
                        const outHtml = editor.innerHTML || '';
                        return { ok, elapsedMs, outText, outHtml };
                    }, { rawText: tc.rawText });
                    break;
                } catch (e) {
                    lastError = e;
                    if (!String(e.message || e).includes('Target page, context or browser has been closed') || attempt === 1) {
                        throw e;
                    }
                    page = null;
                }
            }

            if (!structResult) throw lastError || new Error('No se obtuvo resultado de estructuracion');

            if (!structResult.ok) {
                addResult(id, 'FAIL', `${tc.templateKey} s${tc.sample}: autoStructure devolvio false`, { detection });
                continue;
            }

            const outLen = (structResult.outText || '').trim().length;
            const hasSections = /<h2|##\s+/.test(structResult.outHtml || '');
            const fastEnough = structResult.elapsedMs <= 5000;
            const detectedOk = detection === tc.templateKey;

            let status = 'PASS';
            const reasons = [];
            if (!detectedOk) {
                status = 'WARN';
                reasons.push(`deteccion=${detection} esperado=${tc.templateKey}`);
            }
            if (!hasSections || outLen < 120) {
                status = 'FAIL';
                reasons.push(`salida debil (len=${outLen}, secciones=${hasSections})`);
            }
            if (!fastEnough) {
                status = status === 'FAIL' ? 'FAIL' : 'WARN';
                reasons.push(`lento ${structResult.elapsedMs}ms`);
            }

            const shotName = `${id}_${tc.templateKey}_s${tc.sample}.png`;
            if (!page.isClosed()) {
                await page.screenshot({ path: path.join(screenshotsDir, shotName), fullPage: false });
            }

            addResult(id, status, `${tc.templateKey} s${tc.sample} ok=${structResult.ok} t=${structResult.elapsedMs}ms`, {
                detection,
                expected: tc.templateKey,
                outputLength: outLen,
                reasons: reasons.join('; ')
            });
        } catch (e) {
            addResult(id, 'FAIL', `${tc.templateKey} s${tc.sample}: ${e.message}`);
        }
    }

    // Contact flow: no mailto popup allowed
    try {
        await ensurePage();
        await page.evaluate(() => {
            const overlay = document.getElementById('licenseBlockOverlay');
            if (overlay) {
                overlay.style.display = 'none';
                overlay.style.pointerEvents = 'none';
            }
            // Force non-admin mode for button visibility in case runtime config differs
            window.CLIENT_CONFIG = Object.assign({}, window.CLIENT_CONFIG || {}, { type: 'NORMAL', contactEmail: 'aldowagner78@gmail.com' });
            if (typeof window.initContact === 'function') window.initContact();
            if (typeof window.openContactModal === 'function') window.openContactModal('Consulta general');
        });

        const btn = page.locator('#btnContacto');
        if (await btn.count()) {
            await page.selectOption('#contactMotivo', { label: 'Consulta general' }).catch(async () => {
                await page.selectOption('#contactMotivo', { index: 1 });
            });
            await page.fill('#contactDetalle', 'Mensaje QA automatizado. Validar envio interno sin abrir cliente de correo.');
            await page.click('#btnSendContact');
            await page.waitForTimeout(2500);

            const opened = await page.evaluate(() => window.__openedUrls || []);
            const hasMailto = opened.some((u) => String(u).toLowerCase().startsWith('mailto:'));
            if (hasMailto) {
                addResult('CONTACT-NO-MAILTO', 'FAIL', 'Se detecto apertura de mailto desde la app');
            } else {
                addResult('CONTACT-NO-MAILTO', 'PASS', 'No se abrio cliente de correo externo');
            }
        } else {
            addResult('CONTACT-NO-MAILTO', 'WARN', 'No se encontro boton contacto en la UI actual');
        }
    } catch (e) {
        addResult('CONTACT-NO-MAILTO', 'FAIL', `Error testeando contacto: ${e.message}`);
    }

    // Download integrity quick check (HTML/TXT) without native download dependency
    try {
        await ensurePage();
        await page.evaluate(() => {
            // Contact test forces NORMAL mode; restore a Pro-like context for HTML export generation.
            window.CLIENT_CONFIG = Object.assign({}, window.CLIENT_CONFIG || {}, { type: 'PRO', hasProMode: true });
            window.currentMode = 'pro';
            window._pdfConfigCache = Object.assign({}, window._pdfConfigCache || {}, { patientName: 'Paciente QA' });
        });

        const editorState = await page.evaluate(() => {
            const editor = document.getElementById('editor');
            return {
                text: editor ? editor.innerText : '',
                html: editor ? editor.innerHTML : ''
            };
        });

        if ((editorState.text || '').trim().length > 50) {
            const htmlContent = await page.evaluate(async () => {
                if (typeof window.createHTML === 'function') {
                    return String(await window.createHTML());
                }
                return '';
            });
            const normEditor = normalizeText(editorState.text);
            const normDownload = normalizeText(htmlContent);

            const pivot = normEditor.slice(0, 180);
            const minExpected = normEditor.slice(0, 60);
            const hasEditorChunk = pivot.length >= 60 ? normDownload.includes(pivot) : normDownload.includes(minExpected);

            const editorTokens = new Set(normEditor.split(' ').filter((w) => w.length > 4));
            const downloadTokens = new Set(normDownload.split(' ').filter((w) => w.length > 4));
            const sampleTokens = Array.from(editorTokens).slice(0, 40);
            const common = sampleTokens.filter((t) => downloadTokens.has(t)).length;
            const tokenOverlap = sampleTokens.length ? common / sampleTokens.length : 0;

            const inDownload = hasEditorChunk || tokenOverlap >= 0.65;
            addResult(
                'DOWNLOAD-INTEGRITY-HTML',
                inDownload ? 'PASS' : 'WARN',
                inDownload
                    ? `HTML exportado consistente con editor (overlap=${Math.round(tokenOverlap * 100)}%)`
                    : `Export HTML sin coincidencia robusta (overlap=${Math.round(tokenOverlap * 100)}%, htmlLen=${htmlContent.length})`
            );
        } else {
            addResult('DOWNLOAD-INTEGRITY-HTML', 'WARN', 'Editor sin contenido suficiente al final de la corrida');
        }
    } catch (e) {
        addResult('DOWNLOAD-INTEGRITY-HTML', 'FAIL', `Error validando descarga HTML: ${e.message}`);
    }

    await browser.close();
    const reportPath = writeReport(reportRoot, artifactsDir, results, executionCases.length, templates.length);
    console.log(`\nReporte: ${reportPath}`);

    const failCount = results.filter((r) => r.status === 'FAIL').length;
    process.exit(failCount > 0 ? 2 : 0);
}

function writeReport(reportRoot, artifactsDir, results, totalCases = 0, templateCount = 0) {
    const reportPath = path.join(reportRoot, `E2E_QA_INTEGRAL_PLAYWRIGHT_${nowStamp()}.md`);
    const pass = results.filter((r) => r.status === 'PASS').length;
    const warn = results.filter((r) => r.status === 'WARN').length;
    const fail = results.filter((r) => r.status === 'FAIL').length;

    const lines = [];
    lines.push('# E2E QA Integral - Playwright');
    lines.push('');
    lines.push(`- Fecha: ${new Date().toISOString()}`);
    lines.push(`- URL: ${APP_URL}`);
    lines.push(`- Plantillas detectadas: ${templateCount}`);
    lines.push(`- Casos estructuracion ejecutados: ${totalCases}`);
    lines.push(`- Resumen: PASS=${pass} WARN=${warn} FAIL=${fail}`);
    lines.push(`- Artifacts: ${artifactsDir}`);
    lines.push('');
    lines.push('| ID | Estado | Detalle |');
    lines.push('|---|---|---|');
    for (const r of results) {
        lines.push(`| ${esc(r.id)} | ${esc(r.status)} | ${esc(r.detail)} |`);
    }
    lines.push('');
    lines.push('## Criterios de performance usados');
    lines.push('- Objetivo de rapidez por estructuracion mock: <= 5s por caso (WARN si excede).');
    lines.push('- Timeout del runner Playwright segun defaults del entorno de ejecucion.');

    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    return reportPath;
}

main().catch((e) => {
    console.error('Fatal E2E error:', e);
    process.exit(99);
});
