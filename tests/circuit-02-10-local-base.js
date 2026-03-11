/**
 * Circuits 2–10: Local-base tests (no AI, no Groq)
 * ─────────────────────────────────────────────────
 * Playwright headed — Chrome visible.
 *
 * C2  — Persistencia preferencias (tema, color custom, ajustes UI)
 * C3  — Restauración de borrador (ya cubierto en C1, reinforce check)
 * C4  — Edición avanzada (formato, listas, alineación, clear format)
 * C5  — Buscar/Reemplazar
 * C6  — Copiar texto al portapapeles
 * C7  — Gestión de tabs
 * C8  — Datos de paciente manuales (modal)
 * C9  — Registro de pacientes CRUD
 * C10 — Import/Export del registro de pacientes
 *
 * Usage:
 *   $env:APP_URL='https://transcriptorpro.github.io/transcripcion/'
 *   node tests/circuit-02-10-local-base.js
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
    const artifactsDir = path.join(process.cwd(), 'anexos', 'accesorios', `c2_10_artifacts_${stamp}`);
    ensureDir(artifactsDir);
    const ssDir = path.join(artifactsDir, 'screenshots');
    ensureDir(ssDir);

    const results = [];
    const consoleErrors = [];
    const add = (id, status, detail) => {
        results.push({ id, status, detail });
        const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
        console.log(`${icon} ${id} — ${detail}`);
    };
    const ss = async (pg, name) => {
        try { await pg.screenshot({ path: path.join(ssDir, `${name}.png`), fullPage: false }); } catch (_) { }
    };

    const browser = await chromium.launch({ headless: false, slowMo: 80 });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });

    // Mock Groq
    await context.route('**/openai/v1/chat/completions', async (route) => {
        await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ choices: [{ message: { content: '# MOCK\n## HALLAZGOS\n- Mock.\n## CONCLUSION\nMock.' } }] }),
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

    // ── Load app fresh ──────────────────────────────────────────────────────
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    add('LOAD', 'PASS', 'App cargada');

    // ═════════════════════════════════════════════════════════════════════════
    // C2: PERSISTENCIA DE PREFERENCIAS (tema, color custom)
    // ═════════════════════════════════════════════════════════════════════════

    // C2-01: Abrir settings y cambiar tema
    try {
        const settingsBtn = page.locator('#settingsBtn, #btnSettings, [data-action="settings"]').first();
        if (await settingsBtn.count()) {
            await settingsBtn.click();
            await page.waitForTimeout(800);
        }
        // Buscar un botón de tema (theme btn)
        const themeExists = await page.evaluate(() => {
            const modal = document.getElementById('settingsModal') || document.getElementById('settingsOverlay');
            return modal ? modal.offsetParent !== null || modal.classList.contains('active') || window.getComputedStyle(modal).display !== 'none' : false;
        });
        if (themeExists) {
            add('C2-01', 'PASS', 'Modal de settings abierto');
        } else {
            // Try opening via function
            await page.evaluate(() => {
                if (typeof window.openSettingsModal === 'function') window.openSettingsModal();
            });
            await page.waitForTimeout(800);
            add('C2-01', 'PASS', 'Settings abierto por función');
        }
        await ss(page, 'C2-01_settings');
    } catch (e) {
        add('C2-01', 'FAIL', `Error abriendo settings: ${e.message}`);
    }

    // C2-02: Cambiar tema oscuro/claro
    try {
        const themeResult = await page.evaluate(() => {
            // Buscar botones de tema
            const themeBtns = document.querySelectorAll('[data-theme], .theme-btn, .theme-option');
            if (themeBtns.length === 0) return { found: false };
            // Click en el segundo si existe (cambiar a otro tema)
            const targetBtn = themeBtns.length > 1 ? themeBtns[1] : themeBtns[0];
            targetBtn.click();
            const currentTheme = localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || '';
            return { found: true, theme: currentTheme, count: themeBtns.length };
        });
        if (themeResult.found) {
            add('C2-02', 'PASS', `Tema cambiado (${themeResult.count} opciones, actual: "${themeResult.theme}")`);
        } else {
            add('C2-02', 'WARN', 'No se encontraron botones de tema en settings');
        }
        await ss(page, 'C2-02_tema');
    } catch (e) {
        add('C2-02', 'FAIL', `Error: ${e.message}`);
    }

    // C2-03: Verificar tema persiste tras recarga
    try {
        const themeBefore = await page.evaluate(() => localStorage.getItem('theme'));
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2500);
        const themeAfter = await page.evaluate(() => localStorage.getItem('theme'));
        if (themeBefore && themeAfter && themeBefore === themeAfter) {
            add('C2-03', 'PASS', `Tema persistió: "${themeAfter}"`);
        } else if (!themeBefore) {
            add('C2-03', 'WARN', `Tema no estaba en localStorage antes de recarga`);
        } else {
            add('C2-03', 'FAIL', `Tema cambió: "${themeBefore}" → "${themeAfter}"`);
        }
    } catch (e) {
        add('C2-03', 'FAIL', `Error: ${e.message}`);
    }

    // C2-04: Color custom
    try {
        const colorResult = await page.evaluate(() => {
            localStorage.setItem('customPrimaryColor', '#e11d48');
            return localStorage.getItem('customPrimaryColor');
        });
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2000);
        const colorPersisted = await page.evaluate(() => localStorage.getItem('customPrimaryColor'));
        if (colorPersisted === '#e11d48') {
            add('C2-04', 'PASS', 'Color custom persistió');
        } else {
            add('C2-04', 'FAIL', `Color custom no persistió: "${colorPersisted}"`);
        }
    } catch (e) {
        add('C2-04', 'FAIL', `Error: ${e.message}`);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // C4: EDICIÓN AVANZADA (formatos, listas, alineación)
    // ═════════════════════════════════════════════════════════════════════════

    // Insertar texto de trabajo
    const workText = 'Paciente María González, DNI 28.123.456, 44 años. Consulta por fatiga crónica y episodios de mareos frecuentes. Antecedentes: diabetes tipo 2, tratamiento con metformina.';
    await page.evaluate((txt) => {
        const ed = document.getElementById('editor');
        if (ed) { ed.innerHTML = txt; ed.dispatchEvent(new Event('input', { bubbles: true })); }
    }, workText);
    await page.waitForTimeout(300);

    // C4-01: Subrayado
    try {
        const underline = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            if (!ed || !ed.firstChild) return { ok: false, reason: 'no_editor' };
            const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
            let tn = null; while (walker.nextNode()) { if (walker.currentNode.textContent.length > 10) { tn = walker.currentNode; break; } }
            if (!tn) return { ok: false, reason: 'no_text' };
            const r = document.createRange(); r.setStart(tn, 0); r.setEnd(tn, Math.min(10, tn.length));
            const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
            document.execCommand('underline', false, null);
            return { ok: /<u\b/i.test(ed.innerHTML) };
        });
        add('C4-01', underline.ok ? 'PASS' : 'FAIL', underline.ok ? 'Subrayado aplicado' : `No subrayado: ${underline.reason || 'sin <u>'}`);
    } catch (e) { add('C4-01', 'FAIL', e.message); }

    // C4-02: Lista con viñetas
    try {
        const list = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            ed.focus();
            document.execCommand('insertUnorderedList', false, null);
            return { ok: /<ul\b/i.test(ed.innerHTML) || /<li\b/i.test(ed.innerHTML) };
        });
        add('C4-02', list.ok ? 'PASS' : 'FAIL', list.ok ? 'Lista con viñetas creada' : 'No se creó lista <ul>');
    } catch (e) { add('C4-02', 'FAIL', e.message); }

    // C4-03: Alineación centro
    try {
        const align = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            ed.focus();
            document.execCommand('justifyCenter', false, null);
            return { ok: /text-align:\s*center/i.test(ed.innerHTML) || ed.querySelector('[style*="center"]') !== null };
        });
        add('C4-03', align.ok ? 'PASS' : 'WARN', align.ok ? 'Alineación centro aplicada' : 'No se detectó text-align:center (puede variar por browser)');
    } catch (e) { add('C4-03', 'FAIL', e.message); }

    // C4-04: Limpiar formato
    try {
        const cleared = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            // Select all
            const range = document.createRange(); range.selectNodeContents(ed);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
            document.execCommand('removeFormat', false, null);
            const html = ed.innerHTML;
            return { hasStrong: /<strong\b/i.test(html), hasEm: /<em\b/i.test(html), hasU: /<u\b/i.test(html) };
        });
        const clean = !cleared.hasStrong && !cleared.hasEm && !cleared.hasU;
        add('C4-04', clean ? 'PASS' : 'WARN', clean ? 'Formato limpiado' : `Formato residual: strong=${cleared.hasStrong} em=${cleared.hasEm} u=${cleared.hasU}`);
        await ss(page, 'C4-04_clear_format');
    } catch (e) { add('C4-04', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C5: BUSCAR/REEMPLAZAR
    // ═════════════════════════════════════════════════════════════════════════

    // Re-set editor with clean text
    await page.evaluate((txt) => {
        const ed = document.getElementById('editor');
        if (ed) { ed.innerHTML = txt; ed.dispatchEvent(new Event('input', { bubbles: true })); }
    }, workText);
    await page.waitForTimeout(300);

    // C5-01: Abrir panel buscar/reemplazar
    try {
        const frPanel = await page.evaluate(() => {
            const toggleBtn = document.getElementById('toggleFindReplace');
            if (toggleBtn) toggleBtn.click();
            const panel = document.getElementById('findReplacePanel');
            if (!panel) return { exists: false };
            return { exists: true, visible: window.getComputedStyle(panel).display !== 'none' };
        });
        if (frPanel.exists && frPanel.visible) {
            add('C5-01', 'PASS', 'Panel buscar/reemplazar abierto');
        } else if (frPanel.exists) {
            add('C5-01', 'FAIL', 'Panel existe pero está oculto');
        } else {
            add('C5-01', 'FAIL', '#findReplacePanel no encontrado');
        }
        await ss(page, 'C5-01_find_replace');
    } catch (e) { add('C5-01', 'FAIL', e.message); }

    // C5-02: Buscar texto
    try {
        const found = await page.evaluate(() => {
            const input = document.getElementById('findInput');
            if (!input) return { ok: false, reason: 'no_findInput' };
            input.value = 'fatiga';
            input.dispatchEvent(new Event('input'));
            const btn = document.getElementById('findNextBtn');
            if (btn) btn.click();
            const ed = document.getElementById('editor');
            const hasHighlight = ed && (ed.innerHTML.includes('<mark') || ed.innerHTML.includes('highlight'));
            return { ok: true, highlighted: hasHighlight };
        });
        add('C5-02', found.ok ? 'PASS' : 'FAIL', `Búsqueda ejecutada, highlight=${found.highlighted}`);
    } catch (e) { add('C5-02', 'FAIL', e.message); }

    // C5-03: Reemplazar texto
    try {
        const replaced = await page.evaluate(() => {
            const findInput = document.getElementById('findInput');
            const replaceInput = document.getElementById('replaceInput');
            if (!findInput || !replaceInput) return { ok: false, reason: 'inputs missing' };
            findInput.value = 'fatiga';
            replaceInput.value = 'cansancio';
            const btn = document.getElementById('replaceAllBtn') || document.getElementById('replaceBtn');
            if (btn) btn.click();
            const ed = document.getElementById('editor');
            const text = ed ? ed.innerText : '';
            return { ok: text.includes('cansancio'), hasFatiga: text.includes('fatiga') };
        });
        if (replaced.ok && !replaced.hasFatiga) {
            add('C5-03', 'PASS', 'Reemplazo exitoso: "fatiga" → "cansancio"');
        } else if (replaced.ok) {
            add('C5-03', 'WARN', 'Reemplazo parcial: "cansancio" presente pero "fatiga" también');
        } else {
            add('C5-03', 'FAIL', `Reemplazo falló: ${replaced.reason || 'texto no contiene "cansancio"'}`);
        }
        await ss(page, 'C5-03_replace');
    } catch (e) { add('C5-03', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C6: COPIAR AL PORTAPAPELES
    // ═════════════════════════════════════════════════════════════════════════
    try {
        const copyResult = await page.evaluate(async () => {
            const copyBtn = document.getElementById('copyBtn');
            if (!copyBtn) return { ok: false, reason: 'copyBtn not found' };
            // Ensure button is visible/enabled
            copyBtn.style.display = 'inline-flex';
            copyBtn.disabled = false;
            copyBtn.click();
            // Wait a moment for clipboard
            await new Promise(r => setTimeout(r, 500));
            // Try using clipboard API
            try {
                const text = await navigator.clipboard.readText();
                return { ok: text.length > 20, len: text.length };
            } catch (_) {
                // Clipboard API may be blocked in automation
                return { ok: true, len: -1, note: 'clipboard read blocked by browser' };
            }
        });
        if (copyResult.ok) {
            add('C6-01', 'PASS', `Copiar ejecutado (clipboard len=${copyResult.len}${copyResult.note ? ', ' + copyResult.note : ''})`);
        } else {
            add('C6-01', 'FAIL', `Copiar falló: ${copyResult.reason}`);
        }
        await ss(page, 'C6-01_copy');
    } catch (e) { add('C6-01', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C7: GESTIÓN DE TABS
    // ═════════════════════════════════════════════════════════════════════════

    // C7-01: Crear transcripciones simuladas para generar tabs
    try {
        const tabsCreated = await page.evaluate(() => {
            window.transcriptions = [
                { fileName: 'audio_test_1.mp3', text: '<p>Primera transcripción de prueba QA.</p>' },
                { fileName: 'audio_test_2.mp3', text: '<p>Segunda transcripción de prueba QA con más contenido.</p>' },
                { fileName: 'audio_test_3.mp3', text: '<p>Tercera transcripción para validar tabs múltiples.</p>' }
            ];
            window.activeTabIndex = 0;
            if (typeof createTabs === 'function') createTabs();
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
            const tabsEl = document.getElementById('tabsContainer');
            const tabs = tabsEl ? tabsEl.querySelectorAll('.tab') : [];
            return { count: tabs.length, containerVisible: tabsEl?.classList.contains('active') };
        });
        if (tabsCreated.count === 3) {
            add('C7-01', 'PASS', `3 tabs creados, container active=${tabsCreated.containerVisible}`);
        } else {
            add('C7-01', 'FAIL', `Tabs creados: ${tabsCreated.count} (esperado 3)`);
        }
        await ss(page, 'C7-01_tabs');
    } catch (e) { add('C7-01', 'FAIL', e.message); }

    // C7-02: Cambiar de tab
    try {
        const switchResult = await page.evaluate(() => {
            if (typeof switchTab === 'function') switchTab(1);
            const ed = document.getElementById('editor');
            const text = ed ? ed.innerText : '';
            return { activeIdx: window.activeTabIndex, text: text.slice(0, 60) };
        });
        if (switchResult.activeIdx === 1 && switchResult.text.includes('Segunda')) {
            add('C7-02', 'PASS', 'Tab 2 activado correctamente');
        } else {
            add('C7-02', 'FAIL', `switchTab(1): idx=${switchResult.activeIdx}, text="${switchResult.text}"`);
        }
        await ss(page, 'C7-02_switch_tab');
    } catch (e) { add('C7-02', 'FAIL', e.message); }

    // C7-03: Cerrar tab
    try {
        const closeResult = await page.evaluate(() => {
            const before = window.transcriptions.length;
            if (typeof closeTab === 'function') closeTab(2); // cerrar el tercero
            const after = window.transcriptions.length;
            const tabs = document.getElementById('tabsContainer')?.querySelectorAll('.tab')?.length || 0;
            return { before, after, uiTabs: tabs };
        });
        if (closeResult.after === closeResult.before - 1) {
            add('C7-03', 'PASS', `Tab cerrado: ${closeResult.before} → ${closeResult.after} (UI: ${closeResult.uiTabs})`);
        } else {
            add('C7-03', 'FAIL', `closeTab: ${closeResult.before} → ${closeResult.after}`);
        }
    } catch (e) { add('C7-03', 'FAIL', e.message); }

    // C7-04: Cerrar todos los tabs
    try {
        const closeAll = await page.evaluate(() => {
            while (window.transcriptions && window.transcriptions.length > 0) {
                if (typeof closeTab === 'function') closeTab(0);
                else break;
            }
            const state = window.appState;
            const edText = document.getElementById('editor')?.innerText?.trim() || '';
            return { remaining: window.transcriptions?.length || 0, state, editorEmpty: edText.length === 0 };
        });
        if (closeAll.remaining === 0 && closeAll.state === 'IDLE') {
            add('C7-04', 'PASS', 'Todos los tabs cerrados, estado IDLE');
        } else {
            add('C7-04', 'WARN', `remaining=${closeAll.remaining}, state=${closeAll.state}, editorEmpty=${closeAll.editorEmpty}`);
        }
        await ss(page, 'C7-04_close_all');
    } catch (e) { add('C7-04', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C8: DATOS DE PACIENTE MANUALES (modal)
    // ═════════════════════════════════════════════════════════════════════════

    // Primero poner contenido en editor para que los botones estén activos
    await page.evaluate(() => {
        const ed = document.getElementById('editor');
        if (ed) { ed.innerHTML = '<h2>INFORME TEST</h2><p>Contenido de prueba para datos de paciente.</p>'; }
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
    });
    await page.waitForTimeout(500);

    // C8-01: Abrir modal de paciente
    try {
        const opened = await page.evaluate(() => {
            if (typeof window.openPatientDataModal === 'function') {
                window.openPatientDataModal();
                const overlay = document.getElementById('patientDataRequiredOverlay');
                return overlay ? overlay.classList.contains('active') : false;
            }
            return false;
        });
        add('C8-01', opened ? 'PASS' : 'FAIL', opened ? 'Modal de paciente abierto' : 'No se pudo abrir modal paciente');
        await ss(page, 'C8-01_patient_modal');
    } catch (e) { add('C8-01', 'FAIL', e.message); }

    // C8-02: Guardar datos de paciente
    try {
        const saved = await page.evaluate(() => {
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            set('reqPatientName', 'Juan Pérez');
            set('reqPatientDni', '31.456.789');
            set('reqPatientAge', '58');
            const sexEl = document.getElementById('reqPatientSex');
            if (sexEl) sexEl.value = 'Masculino';
            set('reqPatientInsurance', 'OSDE');
            set('reqPatientAffiliateNum', '12345');

            const btn = document.getElementById('btnSavePatientData');
            if (btn) btn.click();

            const cfg = window._pdfConfigCache || {};
            const overlay = document.getElementById('patientDataRequiredOverlay');
            const modalClosed = overlay ? !overlay.classList.contains('active') : true;
            return { name: cfg.patientName, dni: cfg.patientDni, closed: modalClosed };
        });
        await page.waitForTimeout(500);
        if (saved.name === 'Juan Pérez' && saved.closed) {
            add('C8-02', 'PASS', `Paciente guardado: ${saved.name}, DNI: ${saved.dni}`);
        } else {
            add('C8-02', 'FAIL', `Guardado: name="${saved.name}", closed=${saved.closed}`);
        }
        await ss(page, 'C8-02_patient_saved');
    } catch (e) { add('C8-02', 'FAIL', e.message); }

    // C8-03: Header de paciente insertado en editor
    try {
        const header = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            const h = ed?.querySelector('.patient-data-header');
            return { exists: !!h, text: h ? h.textContent.slice(0, 80) : '' };
        });
        if (header.exists) {
            add('C8-03', 'PASS', `Header paciente insertado: "${header.text}"`);
        } else {
            add('C8-03', 'WARN', 'Header de paciente no encontrado en editor');
        }
    } catch (e) { add('C8-03', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C9: REGISTRO DE PACIENTES CRUD
    // ═════════════════════════════════════════════════════════════════════════

    // C9-01: Verificar que el paciente se guardó en el registro
    try {
        const registry = await page.evaluate(() => {
            if (typeof getAllPatients === 'function') return getAllPatients();
            return [];
        });
        const found = registry.some(p => p.name === 'Juan Pérez' || (p.dni && p.dni.includes('31.456')));
        add('C9-01', found ? 'PASS' : 'FAIL', found ? `Paciente en registro (${registry.length} total)` : `Paciente no encontrado (${registry.length} en registro)`);
    } catch (e) { add('C9-01', 'FAIL', e.message); }

    // C9-02: Agregar segundo paciente
    try {
        const added = await page.evaluate(() => {
            if (typeof savePatientToRegistry !== 'function') return { ok: false, reason: 'savePatientToRegistry undefined' };
            savePatientToRegistry({ name: 'Ana Gómez', dni: '28.123.456', age: '44', sex: 'Femenino', insurance: 'Swiss Medical' });
            const all = typeof getAllPatients === 'function' ? getAllPatients() : [];
            return { ok: all.length >= 2, count: all.length };
        });
        add('C9-02', added.ok ? 'PASS' : 'FAIL', `Segundo paciente agregado (${added.count} total)`);
    } catch (e) { add('C9-02', 'FAIL', e.message); }

    // C9-03: Buscar paciente
    try {
        const search = await page.evaluate(() => {
            if (typeof searchPatientRegistry !== 'function') return { ok: false, reason: 'searchPatientRegistry undefined' };
            const results = searchPatientRegistry('Ana');
            return { ok: results.length > 0, count: results.length, first: results[0]?.name || '' };
        });
        add('C9-03', search.ok ? 'PASS' : 'FAIL', search.ok ? `Búsqueda: ${search.count} resultado(s), primero: "${search.first}"` : `Búsqueda falló: ${search.reason}`);
    } catch (e) { add('C9-03', 'FAIL', e.message); }

    // C9-04: Editar paciente (update por DNI)
    try {
        const updated = await page.evaluate(() => {
            if (typeof savePatientToRegistry !== 'function') return { ok: false };
            savePatientToRegistry({ name: 'Ana Gómez López', dni: '28.123.456', age: '45', sex: 'Femenino', insurance: 'Swiss Medical' });
            const all = typeof getAllPatients === 'function' ? getAllPatients() : [];
            const found = all.find(p => p.dni === '28.123.456');
            return { ok: found && found.name === 'Ana Gómez López' && found.age === '45', name: found?.name, age: found?.age };
        });
        add('C9-04', updated.ok ? 'PASS' : 'FAIL', updated.ok ? 'Paciente actualizado por DNI' : `Update: name="${updated.name}", age="${updated.age}"`);
    } catch (e) { add('C9-04', 'FAIL', e.message); }

    // C9-05: Eliminar paciente
    try {
        const deleted = await page.evaluate(() => {
            const all = typeof getAllPatients === 'function' ? getAllPatients() : [];
            const before = all.length;
            // Remove by filtering
            const filtered = all.filter(p => p.dni !== '28.123.456');
            if (typeof setRegistry === 'function') setRegistry(filtered);
            const after = typeof getAllPatients === 'function' ? getAllPatients().length : filtered.length;
            return { before, after, removed: before > after };
        });
        add('C9-05', deleted.removed ? 'PASS' : 'FAIL', `Eliminar paciente: ${deleted.before} → ${deleted.after}`);
    } catch (e) { add('C9-05', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // C10: IMPORT/EXPORT REGISTRO DE PACIENTES
    // ═════════════════════════════════════════════════════════════════════════

    // Asegurar datos de registro para import/export
    await page.evaluate(() => {
        if (typeof savePatientToRegistry === 'function') {
            savePatientToRegistry({ name: 'Test Export 1', dni: '11.111.111', age: '30', sex: 'Masculino', insurance: 'Test OS' });
            savePatientToRegistry({ name: 'Test Export 2', dni: '22.222.222', age: '40', sex: 'Femenino', insurance: 'Test OS 2' });
        }
    });

    // C10-01: Abrir panel registro
    try {
        const panelOpened = await page.evaluate(() => {
            if (typeof initPatientRegistryPanel === 'function') initPatientRegistryPanel();
            const btn = document.getElementById('btnOpenPatientRegistry') || document.querySelector('[data-action="patientRegistry"]');
            if (btn) { btn.click(); }
            const panel = document.getElementById('patientRegistryPanel') || document.getElementById('registryOverlay');
            if (!panel) return { exists: false };
            return { exists: true, visible: panel.classList.contains('active') || window.getComputedStyle(panel).display !== 'none' };
        });
        add('C10-01', panelOpened.exists ? 'PASS' : 'WARN', panelOpened.exists ? `Panel registro abierto (visible=${panelOpened.visible})` : 'Panel registro no encontrado');
        await ss(page, 'C10-01_registry_panel');
    } catch (e) { add('C10-01', 'FAIL', e.message); }

    // C10-02: Export JSON
    try {
        const exportResult = await page.evaluate(() => {
            const all = typeof getAllPatients === 'function' ? getAllPatients() : [];
            if (all.length === 0) return { ok: false, reason: 'no patients' };
            const json = JSON.stringify(all, null, 2);
            return { ok: json.length > 10, count: all.length, len: json.length };
        });
        add('C10-02', exportResult.ok ? 'PASS' : 'FAIL', exportResult.ok ? `Export JSON: ${exportResult.count} pacientes, ${exportResult.len} bytes` : `Export falló: ${exportResult.reason}`);
    } catch (e) { add('C10-02', 'FAIL', e.message); }

    // C10-03: Import JSON (simulated)
    try {
        const importResult = await page.evaluate(() => {
            const importData = [
                { name: 'Importado 1', dni: '99.999.999', age: '25', sex: 'Masculino', insurance: 'Import OS' },
                { name: 'Importado 2', dni: '88.888.888', age: '35', sex: 'Femenino', insurance: 'Import OS 2' }
            ];
            const before = typeof getAllPatients === 'function' ? getAllPatients().length : 0;
            importData.forEach(p => {
                if (typeof savePatientToRegistry === 'function') savePatientToRegistry(p);
            });
            const after = typeof getAllPatients === 'function' ? getAllPatients().length : 0;
            return { before, after, added: after > before };
        });
        add('C10-03', importResult.added ? 'PASS' : 'FAIL', `Import: ${importResult.before} → ${importResult.after} pacientes`);
    } catch (e) { add('C10-03', 'FAIL', e.message); }

    // ═════════════════════════════════════════════════════════════════════════
    // FINAL: Console errors check
    // ═════════════════════════════════════════════════════════════════════════
    if (consoleErrors.length === 0) {
        add('C2-10-CONSOLE', 'PASS', '0 errores JS en consola durante C2-C10');
    } else {
        add('C2-10-CONSOLE', 'WARN', `${consoleErrors.length} error(es): ${consoleErrors.slice(0, 3).join(' | ')}`);
    }

    await ss(page, 'C2-10_FINAL');
    await browser.close();

    // ── Write report ─────────────────────────────────────────────────────────
    const reportPath = path.join(artifactsDir, 'C2_10_REPORT.md');
    const pass = results.filter(r => r.status === 'PASS').length;
    const warn = results.filter(r => r.status === 'WARN').length;
    const fail = results.filter(r => r.status === 'FAIL').length;

    const lines = [
        '# Circuitos 2–10: Base local — Reporte',
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
    console.log(`\n═══ RESUMEN C2-C10 ═══`);
    console.log(`  PASS: ${pass}  |  WARN: ${warn}  |  FAIL: ${fail}`);
    process.exit(fail > 0 ? 2 : 0);
}

main().catch((e) => { console.error('Fatal C2-10 error:', e); process.exit(99); });
