// ============ PRO SIDEBAR SOURCE MODE (Audio/Text) ============

(function initProSidebarSourceMode() {
    const TEXT_FILE_ACCEPT = '.txt,.text,.md,.rtf,.csv,.json,.doc,.docx,.pdf,text/plain,text/markdown,text/rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const MAMMOTH_CDN = 'https://unpkg.com/mammoth/mammoth.browser.min.js';
    const MAX_TEXT_IMPORT_BYTES = 12 * 1024 * 1024; // 12 MB
    const MAX_EXTRACTED_TEXT_CHARS = 600000;
    const MAX_PDF_PAGES_TO_EXTRACT = 180;
    const ALLOWED_TEXT_EXTENSIONS = new Set(['txt', 'text', 'md', 'rtf', 'csv', 'json', 'doc', 'docx', 'pdf']);

    function isNormalUser() {
        const type = String((window.CLIENT_CONFIG && window.CLIENT_CONFIG.type) || 'ADMIN').toUpperCase();
        return type === 'NORMAL';
    }

    function canUseTextStructuring() {
        // Regla de producto: todos excepto NORMAL.
        return !isNormalUser();
    }

    function isProModeActive() {
        // Si el modo está explícitamente en normal, ocultar selector incluso para ADMIN.
        return window.currentMode !== 'normal';
    }

    function getEls() {
        return {
            switchWrap: document.getElementById('proInputSourceSwitch'),
            sourceToggle: document.getElementById('proSourceToggle'),
            audioPanel: document.getElementById('audioSourcePanel'),
            textPanel: document.getElementById('textSourcePanel'),
            textInput: document.getElementById('proTextInput'),
            fileInput: document.getElementById('proTextFileInput'),
            fileBtn: document.getElementById('btnAttachTextFile'),
            clearBtn: document.getElementById('btnClearTextSource'),
            structureBtn: document.getElementById('btnStructureTextPro'),
            fileName: document.getElementById('proTextFileName')
        };
    }

    function escHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getExtension(fileName) {
        const name = String(fileName || '').toLowerCase();
        const idx = name.lastIndexOf('.');
        return idx >= 0 ? name.slice(idx + 1) : '';
    }

    function truncateTextIfNeeded(text) {
        const raw = String(text || '');
        if (raw.length <= MAX_EXTRACTED_TEXT_CHARS) return raw;
        if (typeof showToast === 'function') {
            showToast('ℹ️ El texto importado es muy extenso. Se usará un recorte para estructurar más rápido.', 'info', 3200);
        }
        return raw.slice(0, MAX_EXTRACTED_TEXT_CHARS);
    }

    function validateSelectedFile(file) {
        if (!file) throw new Error('Archivo inválido');

        const ext = getExtension(file.name);
        if (!ALLOWED_TEXT_EXTENSIONS.has(ext)) {
            throw new Error('Formato no compatible. Usá TXT, DOC, DOCX o PDF.');
        }

        const size = Number(file.size || 0);
        if (size <= 0) throw new Error('El archivo está vacío');
        if (size > MAX_TEXT_IMPORT_BYTES) {
            throw new Error('Archivo demasiado grande (máx. 12 MB para estructuración de texto).');
        }

        return ext;
    }

    function readAsText(file, encoding) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.readAsText(file, encoding || 'utf-8');
        });
    }

    function readAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    function normalizeExtractedText(raw) {
        return String(raw || '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[\t\f\v]+/g, ' ')
            .replace(/\u0000/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    function scoreReadableText(raw) {
        const text = String(raw || '');
        if (!text) return 0;

        const letters = (text.match(/[A-Za-z\u00C0-\u017F]/g) || []).length;
        const spaces = (text.match(/\s/g) || []).length;
        const weird = (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g) || []).length;
        const len = text.length;

        const letterRatio = letters / Math.max(len, 1);
        const spaceRatio = spaces / Math.max(len, 1);
        const weirdRatio = weird / Math.max(len, 1);

        return (letterRatio * 0.7) + (spaceRatio * 0.2) - (weirdRatio * 1.2);
    }

    function loadExternalScript(url, globalKey) {
        return new Promise((resolve, reject) => {
            if (globalKey && window[globalKey]) {
                resolve(window[globalKey]);
                return;
            }

            const existing = document.querySelector(`script[data-ext-lib="${globalKey || url}"]`);
            if (existing) {
                existing.addEventListener('load', () => resolve(globalKey ? window[globalKey] : true), { once: true });
                existing.addEventListener('error', () => reject(new Error(`No se pudo cargar ${url}`)), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.dataset.extLib = globalKey || url;
            script.onload = () => resolve(globalKey ? window[globalKey] : true);
            script.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
            document.head.appendChild(script);
        });
    }

    async function ensurePdfJs() {
        if (!window.pdfjsLib) {
            await loadExternalScript(PDFJS_CDN, 'pdfjsLib');
        }
        if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
        }
        return window.pdfjsLib;
    }

    async function ensureMammoth() {
        if (!window.mammoth) {
            await loadExternalScript(MAMMOTH_CDN, 'mammoth');
        }
        return window.mammoth;
    }

    async function extractPdfText(file) {
        const lib = await ensurePdfJs();
        if (!lib || typeof lib.getDocument !== 'function') {
            throw new Error('No se pudo inicializar el lector de PDF');
        }

        const buffer = await readAsArrayBuffer(file);
        const data = new Uint8Array(buffer);
        const pdf = await lib.getDocument({ data }).promise;
        const pages = [];

        const maxPages = Math.min(pdf.numPages, MAX_PDF_PAGES_TO_EXTRACT);
        for (let i = 1; i <= maxPages; i += 1) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const line = (content.items || []).map((it) => it && it.str ? it.str : '').join(' ').trim();
            if (line) pages.push(line);
        }

        if (pdf.numPages > MAX_PDF_PAGES_TO_EXTRACT && typeof showToast === 'function') {
            showToast(`ℹ️ PDF extenso: se extrajeron las primeras ${MAX_PDF_PAGES_TO_EXTRACT} páginas.`, 'info', 3200);
        }

        return truncateTextIfNeeded(normalizeExtractedText(pages.join('\n\n')));
    }

    async function extractDocxText(file) {
        const mammoth = await ensureMammoth();
        if (!mammoth || typeof mammoth.extractRawText !== 'function') {
            throw new Error('No se pudo inicializar el lector DOCX');
        }
        const buffer = await readAsArrayBuffer(file);
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        return truncateTextIfNeeded(normalizeExtractedText(result && result.value));
    }

    function extractDocTextFallback(arrayBuffer) {
        const decoders = [];
        try { decoders.push(new TextDecoder('latin1')); } catch (_) {}
        try { decoders.push(new TextDecoder('windows-1252')); } catch (_) {}
        try { decoders.push(new TextDecoder('utf-8')); } catch (_) {}

        let best = '';
        let bestScore = -999;

        const postClean = (value) => String(value || '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
            .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ');

        decoders.forEach((decoder) => {
            try {
                const raw = decoder.decode(arrayBuffer);
                const cleaned = normalizeExtractedText(postClean(raw));
                const score = scoreReadableText(cleaned);
                if (score > bestScore) {
                    bestScore = score;
                    best = cleaned;
                }
            } catch (_) {}
        });

        if (bestScore < 0.08 || best.length < 20) {
            return '';
        }

        return best;
    }

    function detectLikelyCorruptedExtraction(text) {
        try {
            const normalized = normalizeExtractedText(text);
            if (!normalized) return true;
            const score = scoreReadableText(normalized);
            return score < 0.12;
        } catch (_) {
            return true;
        }
    }

    async function extractTextFromFile(file) {
        const ext = validateSelectedFile(file);

        if (ext === 'pdf') return extractPdfText(file);
        if (ext === 'docx') return extractDocxText(file);
        if (ext === 'doc') {
            const buffer = await readAsArrayBuffer(file);
            const text = extractDocTextFallback(buffer);
            if (!text) {
                throw new Error('No se pudo extraer texto del .doc. Convertí a .docx para mejor compatibilidad.');
            }
            if (detectLikelyCorruptedExtraction(text)) {
                throw new Error('El .doc parece dañado o poco legible. Guardalo como .docx y volvé a subirlo.');
            }
            if (typeof showToast === 'function') {
                showToast('ℹ️ Archivo .doc importado con extracción compatible', 'info', 2800);
            }
            return truncateTextIfNeeded(text);
        }

        return truncateTextIfNeeded(normalizeExtractedText(await readAsText(file, 'utf-8')));
    }

    function setEditorRawText(text, sourceLabel) {
        const editorEl = window.editor || document.getElementById('editor');
        if (!editorEl) return false;

        const clean = String(text || '').trim();
        if (!clean) return false;

        const body = clean
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => `<p class="report-p">${escHtml(line)}</p>`)
            .join('');

        editorEl.innerHTML = body || `<p class="report-p">${escHtml(clean)}</p>`;

        if (!Array.isArray(window.transcriptions)) window.transcriptions = [];
        const entry = {
            fileName: sourceLabel || 'Texto manual',
            text: clean
        };

        if (window.transcriptions.length === 0) {
            window.transcriptions.push(entry);
            window.activeTabIndex = 0;
        } else {
            window.transcriptions.push(entry);
            window.activeTabIndex = window.transcriptions.length - 1;
        }

        window._lastRawTranscription = clean;

        if (typeof createTabs === 'function') createTabs();
        if (typeof updateWordCount === 'function') updateWordCount();
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
        if (typeof triggerPatientDataCheck === 'function') triggerPatientDataCheck(clean);
        return true;
    }

    function applySourceUI() {
        const els = getEls();
        if (!els.switchWrap || !els.sourceToggle || !els.audioPanel || !els.textPanel) return;

        if (!canUseTextStructuring() || !isProModeActive()) {
            els.switchWrap.style.display = 'none';
            els.sourceToggle.checked = false;
            els.audioPanel.style.display = '';
            els.textPanel.style.display = 'none';
            return;
        }

        els.switchWrap.style.display = '';
        const textMode = !!els.sourceToggle.checked;
        els.audioPanel.style.display = textMode ? 'none' : '';
        els.textPanel.style.display = textMode ? '' : 'none';
    }

    function bind() {
        const els = getEls();
        if (!els.switchWrap) return;

        if (els.fileInput) {
            els.fileInput.setAttribute('accept', TEXT_FILE_ACCEPT);
        }

        // Regla UX: siempre iniciar en Audio al abrir la app.
        if (els.sourceToggle) els.sourceToggle.checked = false;

        applySourceUI();

        if (els.sourceToggle && !els.sourceToggle._bound) {
            els.sourceToggle._bound = true;
            els.sourceToggle.addEventListener('change', applySourceUI);
        }

        if (els.fileBtn && els.fileInput && !els.fileBtn._bound) {
            els.fileBtn._bound = true;
            els.fileBtn.addEventListener('click', () => els.fileInput.click());

            els.fileInput.addEventListener('change', async () => {
                const f = els.fileInput.files && els.fileInput.files[0];
                if (!f) return;

                try {
                    if (typeof showToast === 'function') {
                        showToast('⏳ Procesando archivo para estructuración...', 'info', 1800);
                    }
                    const txt = await extractTextFromFile(f);
                    if (!txt) throw new Error('El archivo no contiene texto legible');

                    if (els.textInput) els.textInput.value = txt;
                    if (els.fileName) els.fileName.textContent = `Archivo cargado: ${f.name}`;

                    if (typeof showToast === 'function') {
                        showToast('✅ Archivo listo para estructurar', 'success', 1800);
                    }
                } catch (err) {
                    if (typeof showToast === 'function') {
                        showToast(`No se pudo leer el archivo: ${err && err.message ? err.message : 'error desconocido'}`, 'error');
                    }
                }
            });
        }

        if (els.structureBtn && !els.structureBtn._bound) {
            els.structureBtn._bound = true;
            els.structureBtn.addEventListener('click', async () => {
                const text = String((els.textInput && els.textInput.value) || '').trim();
                if (!text) {
                    if (typeof showToast === 'function') showToast('Pegá o adjuntá un texto para estructurar', 'warning');
                    return;
                }

                // Admin puede estar en modo normal; forzamos Pro para estructurar con IA.
                if (typeof setMode === 'function' && window.currentMode !== 'pro') {
                    setMode('pro');
                }

                const fromFile = (els.fileInput && els.fileInput.files && els.fileInput.files[0]) ? els.fileInput.files[0].name : '';
                const label = fromFile || 'Texto manual';
                const ok = setEditorRawText(text, label);
                if (!ok) {
                    if (typeof showToast === 'function') showToast('No se pudo cargar el texto en el editor', 'error');
                    return;
                }

                if (typeof window.autoStructure === 'function') {
                    await window.autoStructure({ silent: false });
                } else if (typeof showToast === 'function') {
                    showToast('No se encontró la función de estructuración IA', 'error');
                }
            });
        }

        if (els.clearBtn && !els.clearBtn._bound) {
            els.clearBtn._bound = true;
            els.clearBtn.addEventListener('click', () => {
                // Reusar la misma lógica de limpieza del panel de audio.
                const resetBtn = document.getElementById('resetBtn');
                if (resetBtn) {
                    resetBtn.click();
                } else {
                    if (els.textInput) els.textInput.value = '';
                    if (els.fileInput) els.fileInput.value = '';
                    if (els.fileName) els.fileName.textContent = '';
                    if (typeof showToast === 'function') showToast('Pantalla limpiada', 'success');
                }
            });
        }
    }

    window.updateProSourceModeUI = applySourceUI;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
