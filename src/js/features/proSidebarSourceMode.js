// ============ PRO SIDEBAR SOURCE MODE (Audio/Text) ============

(function initProSidebarSourceMode() {
    function isNormalUser() {
        const type = String((window.CLIENT_CONFIG && window.CLIENT_CONFIG.type) || 'ADMIN').toUpperCase();
        return type === 'NORMAL';
    }

    function canUseTextStructuring() {
        // Regla de producto: todos excepto NORMAL.
        return !isNormalUser();
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

        if (!canUseTextStructuring()) {
            els.switchWrap.style.display = 'none';
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

            els.fileInput.addEventListener('change', () => {
                const f = els.fileInput.files && els.fileInput.files[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                    const txt = String(reader.result || '');
                    if (els.textInput) els.textInput.value = txt;
                    if (els.fileName) els.fileName.textContent = `Archivo cargado: ${f.name}`;
                };
                reader.onerror = () => {
                    if (typeof showToast === 'function') showToast('No se pudo leer el archivo de texto', 'error');
                };
                reader.readAsText(f, 'utf-8');
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
    }

    window.updateProSourceModeUI = applySourceUI;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
