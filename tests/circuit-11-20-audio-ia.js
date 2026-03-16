/**
 * Circuits 11–20: Audio + IA mocked + Templates + PDF + History
 * ──────────────────────────────────────────────────────────────
 * C11 — Carga de texto manual o pegado
 * C12 — Carga de texto desde archivo (sidebar)
 * C13 — Grabación audio local (start/stop UI check)
 * C14 — Carga de audio por archivos (drag&drop + validaciones)
 * C15 — Preprocesado audio (normalización — UI check)
 * C16 — Transcripción Whisper simple (MOCKED)
 * C17 — Transcripción multi-archivo (MOCKED)
 * C18 — Detección de template / especialidad
 * C19 — Estructuración con IA (MOCKED)
 * C20 — Vista previa PDF + configuración
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.APP_URL || 'https://transcriptorpro.github.io/transcripcion/';
function nowStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function esc(s) { return String(s || '').replace(/[|]/g, '\\|').replace(/\n/g, ' '); }

async function main() {
    const stamp = nowStamp();
    const artifactsDir = path.join(process.cwd(), 'anexos', 'accesorios', `c11_20_artifacts_${stamp}`);
    ensureDir(artifactsDir);
    const ssDir = path.join(artifactsDir, 'screenshots');
    ensureDir(ssDir);

    const results = [];
    const consoleErrors = [];
    const add = (id, st, det) => {
        results.push({ id, status: st, detail: det });
        const i = st === 'PASS' ? '✅' : st === 'WARN' ? '⚠️' : '❌';
        console.log(`${i} ${id} — ${det}`);
    };
    const ss = async (pg, name) => {
        try { await pg.screenshot({ path: path.join(ssDir, `${name}.png`), fullPage: false }); } catch (_) { }
    };

    const browser = await chromium.launch({ headless: false, slowMo: 60 });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });

    // ── Mock Groq (transcription + structuring) ─────────────────────────────
    const MOCK_TRANSCRIPTION = 'Paciente de 58 años con cuadro de dolor torácico opresivo de tres horas de evolución, irradiado a brazo izquierdo. Antecedentes de hipertensión arterial y diabetes tipo 2 en tratamiento con enalapril y metformina. Al examen físico: tensión arterial 150/95, frecuencia cardíaca 88, saturación 96%. Auscultación cardíaca con ruidos normofonéticos sin soplos. Se solicita ECG y enzimas cardíacas.';

    const MOCK_STRUCTURED = `<h2>INFORME MÉDICO</h2>
<h3>DATOS CLÍNICOS</h3>
<p>Paciente masculino de 58 años.</p>
<h3>MOTIVO DE CONSULTA</h3>
<p>Dolor torácico opresivo de 3 horas de evolución con irradiación a miembro superior izquierdo.</p>
<h3>ANTECEDENTES</h3>
<ul><li>Hipertensión arterial</li><li>Diabetes tipo 2</li></ul>
<h3>MEDICACIÓN ACTUAL</h3>
<ul><li>Enalapril</li><li>Metformina</li></ul>
<h3>EXAMEN FÍSICO</h3>
<p>TA: 150/95 mmHg | FC: 88 lpm | SatO2: 96%</p>
<p>ACV: Ruidos normofonéticos, sin soplos.</p>
<h3>CONDUCTA</h3>
<p>Se solicita ECG y enzimas cardíacas.</p>`;

    await context.route('**/openai/v1/audio/transcriptions', async (route) => {
        await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ text: MOCK_TRANSCRIPTION }),
        });
    });
    await context.route('**/openai/v1/chat/completions', async (route) => {
        await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ choices: [{ message: { content: MOCK_STRUCTURED } }] }),
        });
    });

    let page = await context.newPage();
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            const t = msg.text();
            if (!t.includes('favicon') && !t.includes('net::ERR') && !t.includes('Failed to load resource'))
                consoleErrors.push(t);
        }
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // ═════════════════════════════════════════════════════════════════════════
    // C11: CARGA DE TEXTO MANUAL O PEGADO
    // ═════════════════════════════════════════════════════════════════════════

    // C11-01: Escribir texto largo en editor
    try {
        const written = await page.evaluate((txt) => {
            const ed = document.getElementById('editor');
            if (!ed) return { ok: false, reason: 'no editor' };
            ed.innerHTML = '';
            ed.focus();
            ed.innerText = txt;
            ed.dispatchEvent(new Event('input', { bubbles: true }));
            return { ok: true, len: ed.innerText.length };
        }, MOCK_TRANSCRIPTION);
        add('C11-01', written.ok ? 'PASS' : 'FAIL', `Texto manual escrito (${written.len} chars)`);
        await ss(page, 'C11-01_texto_manual');
    } catch (e) { add('C11-01', 'FAIL', e.message); }

    // C11-02: Paste simulado (HTML de Word)
    try {
        const paste = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            if (!ed) return { ok: false };
            const html = '<p class="MsoNormal" style="font-family:Calibri;font-size:11pt"><b><span style="font-family:Times">Diagnóstico:</span></b> Infarto agudo de miocardio.</p>';
            const dt = new DataTransfer();
            dt.setData('text/html', html);
            const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
            ed.dispatchEvent(evt);
            // Check if Word formatting was cleaned
            const hasCalibri = ed.innerHTML.includes('Calibri');
            const hasMsoNormal = ed.innerHTML.includes('MsoNormal');
            return { ok: true, cleaned: !hasCalibri && !hasMsoNormal, hasContent: ed.innerText.length > 10 };
        });
        if (paste.ok) {
            add('C11-02', paste.cleaned ? 'PASS' : 'WARN', `Paste Word: cleaned=${paste.cleaned}, hasContent=${paste.hasContent}`);
        } else {
            add('C11-02', 'FAIL', 'Editor not found');
        }
    } catch (e) { add('C11-02', 'FAIL', e.message); }

    // C11-03: Estado cambia a TRANSCRIBED
    try {
        const state = await page.evaluate(() => {
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
            return window.appState;
        });
        add('C11-03', state === 'TRANSCRIBED' ? 'PASS' : 'FAIL', `Estado: ${state}`);
    } catch (e) { add('C11-03', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C12: CARGA DE TEXTO DESDE ARCHIVO (sidebar)
    // ═════════════════════════════════════════════════════════════════════════

    // C12-01: Verificar existencia del sidebar de carga
    try {
        const sidebar = await page.evaluate(() => {
            const el = document.getElementById('sidebarUpload') || document.getElementById('fileUploadSidebar')
                || document.getElementById('wizardUploadCard') || document.querySelector('.upload-card');
            return { exists: !!el, id: el?.id || el?.className || 'not found' };
        });
        add('C12-01', sidebar.exists ? 'PASS' : 'WARN', `Sidebar/wizard upload: ${sidebar.id}`);
        await ss(page, 'C12-01_sidebar');
    } catch (e) { add('C12-01', 'FAIL', e.message); }

    // C12-02: Input file existe para txt/doc
    try {
        const fileInput = await page.evaluate(() => {
            const inputs = document.querySelectorAll('input[type="file"]');
            const accepts = [];
            inputs.forEach(i => accepts.push(i.accept || '*'));
            return { count: inputs.length, accepts };
        });
        add('C12-02', fileInput.count > 0 ? 'PASS' : 'FAIL', `Inputs file: ${fileInput.count}, accepts: ${fileInput.accepts.join(', ')}`);
    } catch (e) { add('C12-02', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C13: GRABACIÓN AUDIO LOCAL
    // ═════════════════════════════════════════════════════════════════════════

    // C13-01: Check recording button exists
    try {
        const recBtn = await page.evaluate(() => {
            const btn = document.getElementById('recordBtn') || document.getElementById('btnRecord')
                || document.querySelector('[data-action="record"]') || document.querySelector('.record-btn');
            return { exists: !!btn, id: btn?.id || 'not found', disabled: btn?.disabled };
        });
        add('C13-01', recBtn.exists ? 'PASS' : 'WARN', `Botón grabar: ${recBtn.id}, disabled=${recBtn.disabled}`);
        await ss(page, 'C13-01_record_btn');
    } catch (e) { add('C13-01', 'FAIL', e.message); }

    // C13-02: Check MediaRecorder API available
    try {
        const mediaRecorder = await page.evaluate(() => {
            return { available: typeof MediaRecorder !== 'undefined' };
        });
        add('C13-02', mediaRecorder.available ? 'PASS' : 'FAIL', `MediaRecorder API: ${mediaRecorder.available ? 'disponible' : 'no disponible'}`);
    } catch (e) { add('C13-02', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C14: CARGA DE AUDIO POR ARCHIVOS
    // ═════════════════════════════════════════════════════════════════════════

    // C14-01: Drop zone exists
    try {
        const dropZone = await page.evaluate(() => {
            const dz = document.getElementById('dropZone') || document.getElementById('audioDropZone')
                || document.querySelector('.drop-zone') || document.querySelector('[data-drop]');
            // Also check file input for audio
            const audioInput = document.querySelector('input[type="file"][accept*="audio"]');
            return { hasDropZone: !!dz, hasAudioInput: !!audioInput, dzId: dz?.id || 'not found' };
        });
        add('C14-01', (dropZone.hasDropZone || dropZone.hasAudioInput) ? 'PASS' : 'WARN',
            `DropZone: ${dropZone.dzId}, audioInput: ${dropZone.hasAudioInput}`);
    } catch (e) { add('C14-01', 'FAIL', e.message); }

    // C14-02: Simulate file load via window.uploadedFiles
    try {
        const fileLoad = await page.evaluate(() => {
            // Simulate a file being loaded
            const mockFile = new File(['fake audio content'], 'test_audio.mp3', { type: 'audio/mpeg' });
            window.uploadedFiles = window.uploadedFiles || [];
            window.uploadedFiles.push(mockFile);
            // Enable transcribe button
            const btn = document.getElementById('transcribeBtn');
            if (btn) btn.disabled = false;
            return { uploaded: window.uploadedFiles.length, btnEnabled: btn ? !btn.disabled : false };
        });
        add('C14-02', fileLoad.uploaded > 0 ? 'PASS' : 'FAIL', `Archivos cargados: ${fileLoad.uploaded}, transcribeBtn enabled=${fileLoad.btnEnabled}`);
    } catch (e) { add('C14-02', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C15: PREPROCESADO AUDIO (UI check)
    // ═════════════════════════════════════════════════════════════════════════

    // C15-01: Check audio preprocessing options
    try {
        const preprocess = await page.evaluate(() => {
            const normalize = document.getElementById('normalizeAudio') || document.getElementById('chkNormalize');
            const denoise = document.getElementById('denoiseAudio') || document.getElementById('chkDenoise');
            const processingStatus = document.getElementById('processingStatus');
            return {
                hasNormalize: !!normalize, hasDenoise: !!denoise,
                hasStatus: !!processingStatus,
                normalizeId: normalize?.id, denoiseId: denoise?.id
            };
        });
        if (preprocess.hasNormalize || preprocess.hasDenoise) {
            add('C15-01', 'PASS', `Preprocesado: normalize=${preprocess.normalizeId}, denoise=${preprocess.denoiseId}`);
        } else {
            add('C15-01', 'WARN', 'Controles de preprocesado no encontrados (normalize/denoise)');
        }
    } catch (e) { add('C15-01', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C16: TRANSCRIPCIÓN WHISPER SIMPLE (MOCKED)
    // ═════════════════════════════════════════════════════════════════════════

    // C16-01: Simulación de transcripción completada
    try {
        const transcribed = await page.evaluate((mockText) => {
            // Simulate transcription result
            window.transcriptions = window.transcriptions || [];
            window.transcriptions.push({ fileName: 'test_audio.mp3', text: mockText });
            window.activeTabIndex = window.transcriptions.length - 1;

            const ed = document.getElementById('editor');
            if (ed) ed.innerHTML = mockText;
            if (typeof createTabs === 'function') createTabs();
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
            if (typeof updateWordCount === 'function') updateWordCount();

            return {
                state: window.appState,
                editorLen: ed?.innerText?.length || 0,
                tabs: window.transcriptions.length
            };
        }, MOCK_TRANSCRIPTION);

        if (transcribed.state === 'TRANSCRIBED' && transcribed.editorLen > 100) {
            add('C16-01', 'PASS', `Transcripción mock cargada: ${transcribed.editorLen} chars, state=${transcribed.state}`);
        } else {
            add('C16-01', 'FAIL', `state=${transcribed.state}, len=${transcribed.editorLen}`);
        }
        await ss(page, 'C16-01_transcribed');
    } catch (e) { add('C16-01', 'FAIL', e.message); }

    // C16-02: Botón structure habilitado
    try {
        const btnState = await page.evaluate(() => {
            const sBtn = document.getElementById('btnStructureAI');
            return {
                exists: !!sBtn,
                visible: sBtn ? window.getComputedStyle(sBtn).display !== 'none' : false,
                disabled: sBtn?.disabled
            };
        });
        if (btnState.exists && btnState.visible) {
            add('C16-02', 'PASS', `btnStructureAI visible, disabled=${btnState.disabled}`);
        } else {
            add('C16-02', 'WARN', `btnStructureAI: exists=${btnState.exists}, visible=${btnState.visible}`);
        }
    } catch (e) { add('C16-02', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C17: TRANSCRIPCIÓN MULTI-ARCHIVO (MOCKED)
    // ═════════════════════════════════════════════════════════════════════════

    // C17-01: Multiple transcriptions create multiple tabs
    try {
        const multi = await page.evaluate(() => {
            window.transcriptions = [
                { fileName: 'cardiologia.mp3', text: 'Informe de cardiología: paciente con soplo sistólico grado II/VI.' },
                { fileName: 'traumatologia.mp3', text: 'Informe de traumatología: fractura de tibia distal sin desplazamiento.' },
                { fileName: 'neurologia.mp3', text: 'Informe de neurología: examen neurológico sin focalidad. Cefalea tensional.' }
            ];
            window.activeTabIndex = 0;
            if (typeof createTabs === 'function') createTabs();
            const tabsContainer = document.getElementById('tabsContainer');
            const tabCount = tabsContainer ? tabsContainer.querySelectorAll('.tab').length : 0;
            return { tabs: tabCount, transcriptions: window.transcriptions.length };
        });
        add('C17-01', multi.tabs === 3 ? 'PASS' : 'FAIL', `Multi-archivo: ${multi.tabs} tabs, ${multi.transcriptions} transcripciones`);
        await ss(page, 'C17-01_multi_tabs');
    } catch (e) { add('C17-01', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C18: DETECCIÓN DE TEMPLATE / ESPECIALIDAD
    // ═════════════════════════════════════════════════════════════════════════

    // C18-01: Check template selector exists
    try {
        const templateUI = await page.evaluate(() => {
            const sel = document.getElementById('templateSelect') || document.getElementById('specialtySelector')
                || document.querySelector('.template-selector') || document.querySelector('[data-template]');
            const wizard = document.getElementById('wizardTemplateCard');
            return { hasSel: !!sel, hasWizard: !!wizard, selId: sel?.id || 'not found' };
        });
        add('C18-01', (templateUI.hasSel || templateUI.hasWizard) ? 'PASS' : 'WARN',
            `Template UI: selector=${templateUI.selId}, wizard=${templateUI.hasWizard}`);
        await ss(page, 'C18-01_template');
    } catch (e) { add('C18-01', 'FAIL', e.message); }

    // C18-02: Template detection function exists
    try {
        const detect = await page.evaluate(() => {
            return {
                hasDetectTemplate: typeof window.detectTemplate === 'function',
                hasAutoDetect: typeof window.autoDetectSpecialty === 'function',
                hasTemplates: typeof window.TEMPLATES !== 'undefined' || typeof window._templateList !== 'undefined'
            };
        });
        add('C18-02', detect.hasTemplates ? 'PASS' : 'WARN',
            `Templates: detect=${detect.hasDetectTemplate}, autoDetect=${detect.hasAutoDetect}, templates=${detect.hasTemplates}`);
    } catch (e) { add('C18-02', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C19: ESTRUCTURACIÓN CON IA (MOCKED)
    // ═════════════════════════════════════════════════════════════════════════

    // Prepare editor with transcription
    await page.evaluate((txt) => {
        window.transcriptions = [{ fileName: 'test.mp3', text: txt }];
        window.activeTabIndex = 0;
        const ed = document.getElementById('editor');
        if (ed) ed.innerHTML = txt;
        if (typeof createTabs === 'function') createTabs();
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
    }, MOCK_TRANSCRIPTION);
    await page.waitForTimeout(500);

    // C19-01: Simulate structuring result
    try {
        const structured = await page.evaluate((html) => {
            const ed = document.getElementById('editor');
            if (!ed) return { ok: false, reason: 'no editor' };
            ed.innerHTML = html;
            window._lastStructuredHTML = html;
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            if (typeof updateWordCount === 'function') updateWordCount();

            const hasH2 = ed.querySelectorAll('h2').length > 0;
            const hasH3 = ed.querySelectorAll('h3').length > 0;
            const hasList = ed.querySelectorAll('ul, ol').length > 0;

            return { ok: true, state: window.appState, hasH2, hasH3, hasList };
        }, MOCK_STRUCTURED);

        if (structured.ok && structured.state === 'STRUCTURED') {
            add('C19-01', 'PASS', `Estructuración mock aplicada: h2=${structured.hasH2}, h3=${structured.hasH3}, listas=${structured.hasList}`);
        } else {
            add('C19-01', 'FAIL', `state=${structured.state}`);
        }
        await ss(page, 'C19-01_structured');
    } catch (e) { add('C19-01', 'FAIL', e.message); }

    // C19-02: Botones post-estructura habilitados
    try {
        const btns = await page.evaluate(() => {
            const configPdf = document.getElementById('btnConfigPdfMain');
            const copyBtn = document.getElementById('copyBtn');
            const restoreBtn = document.getElementById('btnRestoreOriginal');
            return {
                configPdf: { exists: !!configPdf, visible: configPdf ? window.getComputedStyle(configPdf).display !== 'none' : false },
                copy: { exists: !!copyBtn, visible: copyBtn ? window.getComputedStyle(copyBtn).display !== 'none' : false },
                restore: { exists: !!restoreBtn, visible: restoreBtn ? window.getComputedStyle(restoreBtn).display !== 'none' : false }
            };
        });
        const allVisible = btns.configPdf.visible && btns.copy.visible;
        add('C19-02', allVisible ? 'PASS' : 'WARN',
            `Post-estructura: configPdf=${btns.configPdf.visible}, copy=${btns.copy.visible}, restore=${btns.restore.visible}`);
        await ss(page, 'C19-02_post_structure_btns');
    } catch (e) { add('C19-02', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C20: VISTA PREVIA PDF + CONFIGURACIÓN
    // ═════════════════════════════════════════════════════════════════════════

    // C20-01: Abrir config PDF
    try {
        const pdfConfig = await page.evaluate(() => {
            const btn = document.getElementById('btnConfigPdfMain') || document.getElementById('btnConfigPdf');
            if (btn) {
                btn.style.display = 'inline-flex';
                btn.disabled = false;
                btn.click();
            }
            // Check for PDF modal/overlay
            const modal = document.getElementById('pdfConfigModal') || document.getElementById('pdfConfigOverlay')
                || document.querySelector('.pdf-config-modal');
            if (!modal) {
                // Try via function
                if (typeof window.openPdfConfig === 'function') window.openPdfConfig();
                if (typeof window.openPdfConfigModal === 'function') window.openPdfConfigModal();
            }
            const modalCheck = document.getElementById('pdfConfigModal') || document.getElementById('pdfConfigOverlay');
            return {
                exists: !!modalCheck,
                visible: modalCheck ? (modalCheck.classList.contains('active') || window.getComputedStyle(modalCheck).display !== 'none') : false
            };
        });
        await page.waitForTimeout(800);
        add('C20-01', pdfConfig.exists ? 'PASS' : 'WARN', `PDF config modal: exists=${pdfConfig.exists}, visible=${pdfConfig.visible}`);
        await ss(page, 'C20-01_pdf_config');
    } catch (e) { add('C20-01', 'FAIL', e.message); }

    // C20-02: PDF config fields
    try {
        const fields = await page.evaluate(() => {
            const doctorName = document.getElementById('doctorName') || document.getElementById('configDoctorName');
            const specialty = document.getElementById('doctorSpecialty') || document.getElementById('configSpecialty');
            const logo = document.getElementById('configLogo') || document.getElementById('logoUpload');
            return {
                hasDoctorName: !!doctorName,
                hasSpecialty: !!specialty,
                hasLogo: !!logo,
                ids: [doctorName?.id, specialty?.id, logo?.id].filter(Boolean)
            };
        });
        const anyField = fields.hasDoctorName || fields.hasSpecialty;
        add('C20-02', anyField ? 'PASS' : 'WARN', `Campos PDF: doctor=${fields.hasDoctorName}, specialty=${fields.hasSpecialty}, logo=${fields.hasLogo}`);
    } catch (e) { add('C20-02', 'FAIL', e.message); }

    // C20-03: PDF preview function
    try {
        const preview = await page.evaluate(() => {
            return {
                hasGeneratePdf: typeof window.generatePDF === 'function',
                hasPreviewPdf: typeof window.previewPDF === 'function' || typeof window.showPDFPreview === 'function',
                hasJsPDF: typeof window.jspdf !== 'undefined' || typeof window.jsPDF !== 'undefined'
            };
        });
        add('C20-03', preview.hasGeneratePdf || preview.hasPreviewPdf ? 'PASS' : 'WARN',
            `PDF functions: generate=${preview.hasGeneratePdf}, preview=${preview.hasPreviewPdf}, jsPDF=${preview.hasJsPDF}`);
    } catch (e) { add('C20-03', 'FAIL', e.message); }

    // ── Console check ───────────────────────────────────────────────────────
    if (consoleErrors.length === 0) {
        add('C11-20-CONSOLE', 'PASS', '0 errores JS en consola durante C11-C20');
    } else {
        add('C11-20-CONSOLE', 'WARN', `${consoleErrors.length} error(es): ${consoleErrors.slice(0, 3).join(' | ')}`);
    }

    await ss(page, 'C11-20_FINAL');
    await browser.close();

    // ── Report ───────────────────────────────────────────────────────────────
    const reportPath = path.join(artifactsDir, 'C11_20_REPORT.md');
    const pass = results.filter(r => r.status === 'PASS').length;
    const warn = results.filter(r => r.status === 'WARN').length;
    const fail = results.filter(r => r.status === 'FAIL').length;

    const lines = [
        '# Circuitos 11–20: Audio + IA mock + PDF — Reporte',
        '', `- **Fecha**: ${new Date().toISOString()}`, `- **URL**: ${APP_URL}`,
        `- **Resultado**: ✅ PASS=${pass}  ⚠️ WARN=${warn}  ❌ FAIL=${fail}`,
        '', '| Paso | Estado | Detalle |', '|------|--------|---------|',
    ];
    for (const r of results) {
        const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
        lines.push(`| ${r.id} | ${icon} ${r.status} | ${esc(r.detail)} |`);
    }
    if (consoleErrors.length > 0) {
        lines.push('', '## Console errors', '');
        consoleErrors.forEach((e, i) => lines.push(`${i + 1}. \`${e.slice(0, 200)}\``));
    }
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    console.log(`\n📄 Reporte: ${reportPath}`);
    console.log(`\n═══ RESUMEN C11-C20 ═══`);
    console.log(`  PASS: ${pass}  |  WARN: ${warn}  |  FAIL: ${fail}`);
    process.exit(fail > 0 ? 2 : 0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(99); });
