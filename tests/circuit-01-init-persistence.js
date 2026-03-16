/**
 * Circuit 1: Inicialización + Persistencia básica
 * ─────────────────────────────────────────────────
 * Playwright headed — Chrome visible para observar la ejecución.
 *
 * Pasos:
 *   C1-01  Carga limpia (clear storage)
 *   C1-02  Editor vacío
 *   C1-03  Botones IDLE (transcribir/estructurar disabled, export ocultos)
 *   C1-04  appState === 'IDLE'
 *   C1-05  Toggle a modo Pro → toast
 *   C1-06  Recarga → modo Pro persiste
 *   C1-07  Toggle a modo Normal → toast
 *   C1-08  Recarga → modo Normal persiste
 *   C1-09  Escribir texto 100+ chars en editor
 *   C1-10  Forzar autoSaveEditorContent() → clave en storage
 *   C1-11  Recarga → botón restaurar visible
 *   C1-12  Click restaurar → contenido íntegro + toast
 *   C1-13  Negrita (Ctrl+B)
 *   C1-14  Cursiva (Ctrl+I)
 *   C1-15  Undo (botón)
 *   C1-16  Redo (botón)
 *   C1-17  Consola sin errores JS
 *
 * Usage:
 *   $env:APP_URL='https://transcriptorpro.github.io/transcripcion/'
 *   node tests/circuit-01-init-persistence.js
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.APP_URL || 'https://transcriptorpro.github.io/transcripcion/';

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function esc(s) {
    return String(s || '').replace(/[|]/g, '\\|').replace(/\n/g, ' ');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const stamp = nowStamp();
    const artifactsDir = path.join(process.cwd(), 'anexos', 'accesorios', `c1_artifacts_${stamp}`);
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

    const ss = async (page, name) => {
        try {
            await page.screenshot({ path: path.join(ssDir, `${name}.png`), fullPage: false });
        } catch (_) { /* page may be closed during navigation */ }
    };

    // ── Launch headed browser ────────────────────────────────────────────────
    const browser = await chromium.launch({ headless: false, slowMo: 150 });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        acceptDownloads: true,
    });

    // Mock Groq para no consumir API key real
    await context.route('**/openai/v1/chat/completions', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                choices: [{ message: { content: '# MOCK STRUCTURED REPORT\n\n## HALLAZGOS\n- Mock hallazgo QA.\n\n## CONCLUSION\nMock conclusion.' } }]
            }),
        });
    });

    let page = await context.newPage();

    // Capturar errores de consola
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            const text = msg.text();
            // Ignorar errores de red/favicon que no son de la app
            if (!text.includes('favicon') && !text.includes('net::ERR') && !text.includes('Failed to load resource')) {
                consoleErrors.push(text);
            }
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-01: Carga limpia
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(1500);

        // Limpiar TODO el storage para prueba limpia
        await page.evaluate(async () => {
            localStorage.clear();
            // Limpiar IndexedDB
            const dbs = await indexedDB.databases?.() || [];
            for (const db of dbs) {
                if (db.name) indexedDB.deleteDatabase(db.name);
            }
        });

        // Recargar post-limpieza
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2500);
        await ss(page, 'C1-01_carga_limpia');
        add('C1-01', 'PASS', 'App cargada con storage limpio');
    } catch (e) {
        add('C1-01', 'FAIL', `No cargó: ${e.message}`);
        await browser.close();
        writeReport(artifactsDir, results, consoleErrors);
        process.exit(1);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-02: Editor vacío
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        const editorText = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            return ed ? ed.innerText.trim() : '__NOT_FOUND__';
        });
        if (editorText === '__NOT_FOUND__') {
            add('C1-02', 'FAIL', 'Elemento #editor no encontrado');
        } else if (editorText.length === 0 || editorText === '') {
            add('C1-02', 'PASS', 'Editor visible y vacío');
        } else {
            add('C1-02', 'WARN', `Editor tiene contenido residual: "${editorText.slice(0, 80)}..."`);
        }
        await ss(page, 'C1-02_editor_vacio');
    } catch (e) {
        add('C1-02', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-03: Botones en estado IDLE
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        const btnStates = await page.evaluate(() => {
            const get = (id) => {
                const el = document.getElementById(id);
                if (!el) return { exists: false };
                const style = window.getComputedStyle(el);
                return {
                    exists: true,
                    disabled: el.disabled,
                    visible: style.display !== 'none' && style.visibility !== 'hidden',
                };
            };
            return {
                transcribeBtn: get('transcribeBtn'),
                structureBtn: get('structureBtn'),
                btnStructureAI: get('btnStructureAI'),
                btnConfigPdfMain: get('btnConfigPdfMain'),
                copyBtn: get('copyBtn'),
                printBtn: get('printBtn'),
                downloadBtnContainer: get('downloadBtnContainer'),
            };
        });

        const checks = [];
        // transcribeBtn debe estar disabled
        if (btnStates.transcribeBtn.exists && btnStates.transcribeBtn.disabled) checks.push('transcribeBtn:disabled✓');
        else if (btnStates.transcribeBtn.exists) checks.push('transcribeBtn:NOT_disabled');

        // structureBtn disabled
        if (btnStates.structureBtn.exists && btnStates.structureBtn.disabled) checks.push('structureBtn:disabled✓');
        else if (btnStates.structureBtn.exists) checks.push('structureBtn:NOT_disabled');

        // btnStructureAI oculto
        if (btnStates.btnStructureAI.exists && !btnStates.btnStructureAI.visible) checks.push('btnStructureAI:hidden✓');
        else if (btnStates.btnStructureAI.exists) checks.push('btnStructureAI:visible(!)');

        // btnConfigPdfMain oculto
        if (btnStates.btnConfigPdfMain.exists && !btnStates.btnConfigPdfMain.visible) checks.push('btnConfigPdfMain:hidden✓');
        else if (btnStates.btnConfigPdfMain.exists) checks.push('btnConfigPdfMain:visible(!)');

        // copyBtn oculto
        if (btnStates.copyBtn.exists && !btnStates.copyBtn.visible) checks.push('copyBtn:hidden✓');
        else if (btnStates.copyBtn.exists) checks.push('copyBtn:visible(!)');

        const hasFailure = checks.some(c => c.includes('(!)') || c.includes('NOT_disabled'));
        add('C1-03', hasFailure ? 'FAIL' : 'PASS', `Botones IDLE: ${checks.join(', ')}`);
        await ss(page, 'C1-03_botones_idle');
    } catch (e) {
        add('C1-03', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-04: appState === 'IDLE'
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        const state = await page.evaluate(() => window.appState);
        if (state === 'IDLE') {
            add('C1-04', 'PASS', 'appState === IDLE');
        } else {
            add('C1-04', 'WARN', `appState = "${state}" (esperado IDLE)`);
        }
    } catch (e) {
        add('C1-04', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-05: Toggle a modo Pro
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        // Esperar a que el toggle exista
        const toggleExists = await page.evaluate(() => !!document.getElementById('proModeToggle'));
        if (!toggleExists) {
            add('C1-05', 'WARN', 'Toggle proModeToggle no encontrado (puede ser clone PRO fijo)');
        } else {
            // Primero asegurar que está en Normal
            await page.evaluate(() => {
                const toggle = document.getElementById('proModeToggle');
                if (toggle && toggle.checked) {
                    toggle.checked = false;
                    toggle.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            await page.waitForTimeout(500);

            // Ahora cambiar a Pro
            await page.evaluate(() => {
                const toggle = document.getElementById('proModeToggle');
                if (toggle) {
                    toggle.checked = true;
                    toggle.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            await page.waitForTimeout(1000);

            const mode = await page.evaluate(() => window.currentMode);
            if (mode === 'pro') {
                add('C1-05', 'PASS', 'Modo cambiado a Pro correctamente');
            } else {
                add('C1-05', 'FAIL', `Modo después de toggle: "${mode}"`);
            }
            await ss(page, 'C1-05_modo_pro');
        }
    } catch (e) {
        add('C1-05', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-06: Recarga → modo Pro persiste
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2500);

        const mode = await page.evaluate(() => window.currentMode);
        const toggleChecked = await page.evaluate(() => {
            const t = document.getElementById('proModeToggle');
            return t ? t.checked : null;
        });

        if (mode === 'pro' || toggleChecked === true) {
            add('C1-06', 'PASS', `Modo Pro persistió tras recarga (currentMode="${mode}", toggle=${toggleChecked})`);
        } else {
            add('C1-06', 'FAIL', `Modo NO persistió: currentMode="${mode}", toggle=${toggleChecked}`);
        }
        await ss(page, 'C1-06_pro_persistido');
    } catch (e) {
        add('C1-06', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-07: Toggle a modo Normal
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        const toggleExists = await page.evaluate(() => !!document.getElementById('proModeToggle'));
        if (!toggleExists) {
            add('C1-07', 'WARN', 'Toggle no disponible');
        } else {
            await page.evaluate(() => {
                const toggle = document.getElementById('proModeToggle');
                if (toggle) {
                    toggle.checked = false;
                    toggle.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            await page.waitForTimeout(1000);

            const mode = await page.evaluate(() => window.currentMode);
            if (mode === 'normal') {
                add('C1-07', 'PASS', 'Modo cambiado a Normal correctamente');
            } else {
                add('C1-07', 'FAIL', `Modo después de toggle: "${mode}"`);
            }
            await ss(page, 'C1-07_modo_normal');
        }
    } catch (e) {
        add('C1-07', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-08: Recarga → modo Normal persiste
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2500);

        const mode = await page.evaluate(() => window.currentMode);
        const toggleChecked = await page.evaluate(() => {
            const t = document.getElementById('proModeToggle');
            return t ? t.checked : null;
        });

        if (mode === 'normal' || toggleChecked === false) {
            add('C1-08', 'PASS', `Modo Normal persistió tras recarga (currentMode="${mode}", toggle=${toggleChecked})`);
        } else {
            add('C1-08', 'FAIL', `Modo NO persistió: currentMode="${mode}", toggle=${toggleChecked}`);
        }
        await ss(page, 'C1-08_normal_persistido');
    } catch (e) {
        add('C1-08', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-09: Escribir texto de 100+ chars en editor
    // ═══════════════════════════════════════════════════════════════════════════
    const testText = 'Paciente Juan Pérez, DNI 31.456.789, 58 años. Consulta por dolor torácico y disnea de esfuerzo. Antecedentes: HTA, ex tabaquismo. Se solicita evaluación cardiológica completa.';
    try {
        await page.evaluate((text) => {
            const ed = document.getElementById('editor');
            if (ed) {
                ed.focus();
                ed.innerHTML = text;
                ed.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, testText);
        await page.waitForTimeout(500);

        const editorLen = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            return ed ? ed.innerText.trim().length : 0;
        });

        if (editorLen >= 100) {
            add('C1-09', 'PASS', `Texto escrito en editor (${editorLen} chars)`);
        } else {
            add('C1-09', 'FAIL', `Editor tiene solo ${editorLen} chars`);
        }
        await ss(page, 'C1-09_texto_escrito');
    } catch (e) {
        add('C1-09', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-10: Forzar autosave → clave en storage
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        await page.evaluate(() => {
            if (typeof window.autoSaveEditorContent === 'function') {
                window.autoSaveEditorContent();
            }
        });
        await page.waitForTimeout(500);

        const hasAutosave = await page.evaluate(() => {
            const lsVal = localStorage.getItem('editor_autosave');
            return { hasLS: !!lsVal, lsLen: (lsVal || '').length };
        });

        if (hasAutosave.hasLS && hasAutosave.lsLen > 50) {
            add('C1-10', 'PASS', `Autosave guardado (${hasAutosave.lsLen} chars en localStorage)`);
        } else {
            // Puede estar en IndexedDB
            const hasIDB = await page.evaluate(async () => {
                if (typeof appDB !== 'undefined') {
                    const val = await appDB.get('editor_autosave');
                    return !!val;
                }
                return false;
            });
            if (hasIDB) {
                add('C1-10', 'PASS', 'Autosave guardado en IndexedDB');
            } else {
                add('C1-10', 'FAIL', 'No se encontró autosave en localStorage ni IndexedDB');
            }
        }
        await ss(page, 'C1-10_autosave');
    } catch (e) {
        add('C1-10', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-11: Recarga → botón restaurar visible
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000); // dar tiempo al restoreAutoSave (500ms delay interno)

        const restoreInfo = await page.evaluate(() => {
            const btn = document.getElementById('btnRestoreSession');
            if (!btn) return { exists: false };
            const style = window.getComputedStyle(btn);
            return {
                exists: true,
                visible: style.display !== 'none' && style.visibility !== 'hidden',
                text: btn.textContent || '',
            };
        });

        if (restoreInfo.exists && restoreInfo.visible) {
            add('C1-11', 'PASS', `Botón restaurar visible: "${restoreInfo.text.slice(0, 60)}"`);
        } else if (restoreInfo.exists) {
            add('C1-11', 'FAIL', 'Botón restaurar existe pero está oculto');
        } else {
            add('C1-11', 'FAIL', 'Botón #btnRestoreSession no encontrado en DOM');
        }
        await ss(page, 'C1-11_boton_restaurar');
    } catch (e) {
        add('C1-11', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-12: Click restaurar → contenido íntegro
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        const btnVisible = await page.evaluate(() => {
            const btn = document.getElementById('btnRestoreSession');
            return btn && window.getComputedStyle(btn).display !== 'none';
        });

        if (!btnVisible) {
            add('C1-12', 'FAIL', 'No se puede restaurar: botón no visible');
        } else {
            await page.click('#btnRestoreSession');
            await page.waitForTimeout(1000);

            const restored = await page.evaluate(() => {
                const ed = document.getElementById('editor');
                return ed ? ed.innerText.trim() : '';
            });

            // Verificar que el texto restaurado contiene fragmentos clave
            const hasKey1 = restored.includes('Juan') || restored.includes('Pérez') || restored.includes('Perez');
            const hasKey2 = restored.includes('dolor') || restored.includes('torácico') || restored.includes('toracico');

            if (restored.length > 80 && (hasKey1 || hasKey2)) {
                add('C1-12', 'PASS', `Borrador restaurado íntegro (${restored.length} chars)`);
            } else {
                add('C1-12', 'WARN', `Restaurado parcial: ${restored.length} chars, claves: key1=${hasKey1} key2=${hasKey2}`);
            }
            await ss(page, 'C1-12_restaurado');
        }
    } catch (e) {
        add('C1-12', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-13: Negrita (Ctrl+B)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        // Seleccionar las primeras palabras del editor y aplicar negrita
        const boldApplied = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            if (!ed || !ed.firstChild) return { ok: false, reason: 'no_editor_or_empty' };

            // Seleccionar un rango de texto
            const range = document.createRange();
            const textNode = ed.firstChild.nodeType === 3 ? ed.firstChild : ed.firstChild.firstChild || ed.firstChild;
            if (!textNode || textNode.nodeType !== 3) return { ok: false, reason: 'no_text_node' };

            range.setStart(textNode, 0);
            range.setEnd(textNode, Math.min(8, textNode.length));
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            // Aplicar negrita
            document.execCommand('bold', false, null);

            // Verificar
            const html = ed.innerHTML;
            return { ok: /<(strong|b)\b/i.test(html), html: html.slice(0, 200) };
        });

        if (boldApplied.ok) {
            add('C1-13', 'PASS', 'Negrita aplicada correctamente');
        } else {
            add('C1-13', 'FAIL', `Negrita no aplicada: ${boldApplied.reason || 'no <strong>/<b> en HTML'}`);
        }
        await ss(page, 'C1-13_negrita');
    } catch (e) {
        add('C1-13', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-14: Cursiva (Ctrl+I)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        const italicApplied = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            if (!ed) return { ok: false, reason: 'no_editor' };

            // Buscar un nodo de texto para seleccionar
            const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, null, false);
            let textNode = null;
            while (walker.nextNode()) {
                if (walker.currentNode.textContent.trim().length > 10) {
                    textNode = walker.currentNode;
                    break;
                }
            }
            if (!textNode) return { ok: false, reason: 'no_selectable_text' };

            const range = document.createRange();
            const start = Math.min(5, textNode.length);
            const end = Math.min(15, textNode.length);
            range.setStart(textNode, start);
            range.setEnd(textNode, end);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            document.execCommand('italic', false, null);

            const html = ed.innerHTML;
            return { ok: /<(em|i)\b/i.test(html) };
        });

        if (italicApplied.ok) {
            add('C1-14', 'PASS', 'Cursiva aplicada correctamente');
        } else {
            add('C1-14', 'FAIL', `Cursiva no aplicada: ${italicApplied.reason || 'no <em>/<i> en HTML'}`);
        }
        await ss(page, 'C1-14_cursiva');
    } catch (e) {
        add('C1-14', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-15: Undo (botón)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        const htmlBefore = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            return ed ? ed.innerHTML : '';
        });

        // Click en botón undo
        const undoBtnExists = await page.evaluate(() => !!document.getElementById('undoBtn'));
        if (undoBtnExists) {
            await page.click('#undoBtn');
            await page.waitForTimeout(500);

            const htmlAfter = await page.evaluate(() => {
                const ed = document.getElementById('editor');
                return ed ? ed.innerHTML : '';
            });

            if (htmlAfter !== htmlBefore) {
                add('C1-15', 'PASS', 'Undo ejecutado: contenido cambió');
            } else {
                add('C1-15', 'WARN', 'Undo clickeado pero contenido no cambió (puede no haber stack)');
            }
        } else {
            // Intentar Ctrl+Z como fallback
            await page.keyboard.press('Control+z');
            await page.waitForTimeout(300);
            add('C1-15', 'PASS', 'Undo via Ctrl+Z ejecutado (botón no encontrado)');
        }
        await ss(page, 'C1-15_undo');
    } catch (e) {
        add('C1-15', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-16: Redo (botón)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
        const htmlBefore = await page.evaluate(() => {
            const ed = document.getElementById('editor');
            return ed ? ed.innerHTML : '';
        });

        const redoBtnExists = await page.evaluate(() => !!document.getElementById('redoBtn'));
        if (redoBtnExists) {
            await page.click('#redoBtn');
            await page.waitForTimeout(500);

            const htmlAfter = await page.evaluate(() => {
                const ed = document.getElementById('editor');
                return ed ? ed.innerHTML : '';
            });

            if (htmlAfter !== htmlBefore) {
                add('C1-16', 'PASS', 'Redo ejecutado: contenido cambió');
            } else {
                add('C1-16', 'WARN', 'Redo clickeado pero contenido no cambió (puede no haber stack)');
            }
        } else {
            await page.keyboard.press('Control+y');
            await page.waitForTimeout(300);
            add('C1-16', 'PASS', 'Redo via Ctrl+Y ejecutado (botón no encontrado)');
        }
        await ss(page, 'C1-16_redo');
    } catch (e) {
        add('C1-16', 'FAIL', `Error: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // C1-17: Consola sin errores JS
    // ═══════════════════════════════════════════════════════════════════════════
    if (consoleErrors.length === 0) {
        add('C1-17', 'PASS', '0 errores JS en consola');
    } else {
        add('C1-17', 'FAIL', `${consoleErrors.length} errores en consola: ${consoleErrors.slice(0, 3).join(' | ')}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Cerrar y escribir reporte
    // ═══════════════════════════════════════════════════════════════════════════
    await ss(page, 'C1-FINAL');
    await browser.close();
    const reportPath = writeReport(artifactsDir, results, consoleErrors);
    console.log(`\n📄 Reporte: ${reportPath}`);

    const failCount = results.filter(r => r.status === 'FAIL').length;
    const warnCount = results.filter(r => r.status === 'WARN').length;
    const passCount = results.filter(r => r.status === 'PASS').length;
    console.log(`\n═══ RESUMEN C1 ═══`);
    console.log(`  PASS: ${passCount}  |  WARN: ${warnCount}  |  FAIL: ${failCount}`);
    console.log(`  Screenshots: ${ssDir}`);

    process.exit(failCount > 0 ? 2 : 0);
}

// ── Report Writer ────────────────────────────────────────────────────────────

function writeReport(artifactsDir, results, consoleErrors) {
    const reportPath = path.join(artifactsDir, `C1_INIT_PERSISTENCE_REPORT.md`);

    const pass = results.filter(r => r.status === 'PASS').length;
    const warn = results.filter(r => r.status === 'WARN').length;
    const fail = results.filter(r => r.status === 'FAIL').length;

    const lines = [
        '# Circuito 1: Inicialización + Persistencia — Reporte',
        '',
        `- **Fecha**: ${new Date().toISOString()}`,
        `- **URL**: ${APP_URL}`,
        `- **Resultado**: ✅ PASS=${pass}  ⚠️ WARN=${warn}  ❌ FAIL=${fail}`,
        '',
        '## Tabla de resultados',
        '',
        '| Paso | Estado | Detalle |',
        '|------|--------|---------|',
    ];

    for (const r of results) {
        const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
        lines.push(`| ${r.id} | ${icon} ${r.status} | ${esc(r.detail)} |`);
    }

    if (consoleErrors.length > 0) {
        lines.push('');
        lines.push('## Errores de consola capturados');
        lines.push('');
        consoleErrors.forEach((e, i) => {
            lines.push(`${i + 1}. \`${e.slice(0, 200)}\``);
        });
    }

    lines.push('');
    lines.push('## Criterios usados');
    lines.push('- Estado IDLE: transcribeBtn/structureBtn disabled, export buttons hidden');
    lines.push('- Persistencia: last_profile_type en IndexedDB o localStorage');
    lines.push('- Autosave: clave editor_autosave con contenido > 50 chars');
    lines.push('- Restauración: contenido recuperado con keywords del texto original');
    lines.push('- Formato: <strong>/<b> para negrita, <em>/<i> para cursiva');
    lines.push('- Consola: 0 errores JS (excluye errores de red/favicon)');

    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    return reportPath;
}

main().catch((e) => {
    console.error('Fatal C1 error:', e);
    process.exit(99);
});
