// ============ EDITOR WYSIWYG ============

if (editor) {
    editor.addEventListener('input', () => {
        if (typeof window.updateWordCount === 'function') window.updateWordCount();
        saveUndoState();
    });

    // ── Detectar texto pegado → limpiar formato Word + activar Estructurar ──
    editor.addEventListener('paste', (e) => {
        // Interceptar el paste para limpiar basura de Word/Google Docs
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        const html = clipboardData.getData('text/html');
        const plain = clipboardData.getData('text/plain');

        // Si viene de Word/Docs (tiene HTML con estilos), limpiar
        if (html && (html.includes('mso-') || html.includes('MsoNormal') || html.includes('docs-internal') || html.includes('<o:p>'))) {
            e.preventDefault();

            // Limpiar: conservar solo estructura básica, eliminar estilos inline
            let clean = html
                .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '')               // tags de Office
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')            // bloques de estilo
                .replace(/<meta[^>]*>/gi, '')                              // metas
                .replace(/<img[^>]*>/gi, '')                               // RM-3: eliminar imágenes pegadas
                // RB-4: Limpiar comentarios de Google Docs
                .replace(/<sup><a[^>]*href="#cmnt[^"]*"[^>]*>[\s\S]*?<\/a><\/sup>/gi, '')  // marcadores de comentario en texto
                .replace(/<div[^>]*><p[^>]*><a[^>]*href="#cmnt[^"]*"[^>]*>[\s\S]*?<\/a>[\s\S]*?<\/p><\/div>/gi, '') // bloques de comentario al pie
                .replace(/<a[^>]*id="cmnt_ref[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')  // refs de comentario
                .replace(/<a[^>]*id="cmnt\d+"[^>]*>[\s\S]*?<\/a>/gi, '')        // anclas de comentario
                .replace(/class="[^"]*"/gi, '')                            // clases Word
                .replace(/style="[^"]*"/gi, '')                            // estilos inline
                .replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1')            // spans vacíos
                .replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1')          // font tags
                .replace(/(<p[^>]*>)\s*(<\/p>)/gi, '')                     // párrafos vacíos
                .replace(/<p[^>]*>/gi, '<p>')                              // limpiar attrs de <p>
                .replace(/\n\s*\n/g, '\n')                                 // líneas vacías excesivas
                .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>')              // doble BR
                .trim();

            // Insertar el HTML limpio
            document.execCommand('insertHTML', false, clean);
        }

        // Activar botón Estructurar después de que el contenido esté en el DOM
        setTimeout(() => {
            const text = editor.innerText.trim();
            if (text.length < 30) return;

            if (window.appState === 'IDLE' || window.appState === 'FILES_LOADED') {
                const entry = { fileName: 'Texto pegado', text: editor.innerHTML };
                if (!window.transcriptions) window.transcriptions = [];
                if (window.transcriptions.length === 0) {
                    window.transcriptions.push(entry);
                    window.activeTabIndex = 0;
                } else {
                    window.transcriptions[window.activeTabIndex] = entry;
                }

                if (typeof createTabs === 'function') createTabs();
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');

                if (window.currentMode === 'normal' && typeof populateLimitedTemplates === 'function') {
                    populateLimitedTemplates();
                }

                if (typeof showToast === 'function') {
                    showToast('📋 Texto pegado detectado — podés estructurarlo con IA', 'info');
                }
            }
        }, 50);
    });
}

// formatText delegado a executeFormatAndFocus (mantener por retrocompatibilidad)
window.formatText = cmd => executeFormatAndFocus(cmd);

// ============ FORMATTING HANDLERS ============

function executeFormatAndFocus(cmd) {
    document.execCommand(cmd, false, null);
    if (editor) editor.focus();
    updateActiveStates();
}

const formatButtons = {
    'boldBtn': 'bold',
    'italicBtn': 'italic',
    'underlineBtn': 'underline',
    'strikeBtn': 'strikeThrough',
    'alignLeftBtn': 'justifyLeft',
    'alignCenterBtn': 'justifyCenter',
    'alignRightBtn': 'justifyRight',
    'justifyBtn': 'justifyFull',
    'bulletListBtn': 'insertUnorderedList',
    'numberedListBtn': 'insertOrderedList'
};

/* Attach event listeners automatically to existing buttons */
for (const [id, command] of Object.entries(formatButtons)) {
    const btn = $(id);
    if (btn) {
        btn.addEventListener('click', () => executeFormatAndFocus(command));
    }
}

// Update Active States for Format Buttons
function updateActiveStates() {
    for (const [id, command] of Object.entries(formatButtons)) {
        const btn = $(id);
        if (btn) {
            btn.classList.toggle('active', document.queryCommandState(command));
        }
    }
}

document.addEventListener('selectionchange', updateActiveStates);

// Keyboard Shortcuts for Formatting
if (editor) {
    editor.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            let handled = true;
            switch (e.key.toLowerCase()) {
                case 'b': document.execCommand('bold', false, null); break;
                case 'i': document.execCommand('italic', false, null); break;
                case 'u': document.execCommand('underline', false, null); break;
                default: handled = false;
            }
            if (handled) {
                e.preventDefault();
                updateActiveStates();
            }
        }
    });
}

// Special controls 

const fontSizeToolbar = $('fontSizeToolbar');
if (fontSizeToolbar && editor) {
    fontSizeToolbar.addEventListener('change', () => {
        document.execCommand('fontSize', false, '7');
        const fontElements = editor.querySelectorAll('font[size="7"]');
        fontElements.forEach(el => {
            el.removeAttribute('size');
            el.style.fontSize = fontSizeToolbar.value;
        });
        editor.focus();
    });
}

function handleFontSizeChange(increase = true) {
    if (!editor) return;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedContent = range.extractContents();
        const span = document.createElement('span');
        // Leer fontSize del texto seleccionado (no del contenedor editor)
        const anchorEl = selection.anchorNode?.parentElement || editor;
        const currentSize = parseInt(window.getComputedStyle(anchorEl).fontSize) || parseInt(window.getComputedStyle(editor).fontSize);
        const newSize = increase ? currentSize + 2 : Math.max(10, currentSize - 2);
        span.style.fontSize = newSize + 'px';
        span.appendChild(selectedContent);
        range.insertNode(span);
        editor.focus();
    }
}

const increaseFontBtn = $('increaseFontBtn');
if (increaseFontBtn) increaseFontBtn.addEventListener('click', () => handleFontSizeChange(true));

const decreaseFontBtn = $('decreaseFontBtn');
if (decreaseFontBtn) decreaseFontBtn.addEventListener('click', () => handleFontSizeChange(false));

const lineSpacingSelect = $('lineSpacingSelect');
if (lineSpacingSelect && editor) {
    lineSpacingSelect.addEventListener('change', () => {
        editor.style.lineHeight = lineSpacingSelect.value;
    });
}

const clearFormatBtn = $('clearFormatBtn');
if (clearFormatBtn && editor) {
    clearFormatBtn.addEventListener('click', () => {
        document.execCommand('removeFormat', false, null);
        editor.focus();
    });
}

const insertLinkBtn = $('insertLinkBtn');
if (insertLinkBtn && editor) {
    insertLinkBtn.addEventListener('click', async () => {
        const url = await window.showCustomPrompt('Ingrese la URL:', 'https://ejemplo.com');
        if (url) {
            document.execCommand('createLink', false, url);
            editor.focus();
        }
    });
}

const insertTableBtn = $('insertTableBtn');
if (insertTableBtn && editor) {
    insertTableBtn.addEventListener('click', async () => {
        const rows = await window.showCustomPrompt('Número de filas:', '', '3');
        if (!rows) return;
        const cols = await window.showCustomPrompt('Número de columnas:', '', '3');
        if (rows && cols) {
            let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 1rem 0;">';
            for (let i = 0; i < parseInt(rows); i++) {
                tableHTML += '<tr>';
                for (let j = 0; j < parseInt(cols); j++) {
                    tableHTML += '<td style="border: 1px solid var(--border, #ddd); padding: 8px;">&nbsp;</td>';
                }
                tableHTML += '</tr>';
            }
            tableHTML += '</table>';
            document.execCommand('insertHTML', false, tableHTML);
            editor.focus();
        }
    });
}


// ============ ETAPA 8: VERSIONADO / SNAPSHOTS DEL EDITOR ============
// Guarda snapshots nombrados en localStorage (persistentes entre recargas).
// Momentos: transcripción cruda, estructurado, edición manual (cada 5 min).
// Navegación: botón en toolbar o desde Settings > Herramientas.

(function _initEditorSnapshots() {
    const _SNAP_KEY = 'editor_snapshots';
    const _MAX_SNAPS = 30;
    const _AUTO_INTERVAL = 5 * 60 * 1000; // 5 min
    let _autoTimer = null;
    let _lastAutoHash = '';
    let _snapsCache = null;
    if (typeof appDB !== 'undefined') {
        appDB.get(_SNAP_KEY).then(function(v) { _snapsCache = v || []; }).catch(function() {});
    }

    function _getSnaps() {
        if (_snapsCache !== null) return _snapsCache;
        try { return JSON.parse(localStorage.getItem(_SNAP_KEY)) || []; } catch(_) { return []; }
    }
    function _saveSnaps(arr) {
        _snapsCache = arr;
        if (typeof appDB !== 'undefined') appDB.set(_SNAP_KEY, arr);
        else { try { localStorage.setItem(_SNAP_KEY, JSON.stringify(arr)); } catch(_) {} }
    }

    /**
     * Guardar snapshot del editor.
     * @param {string} label — nombre descriptivo (ej: "Transcripción cruda", "Estructurado")
     * @param {string} [source] — quién lo generó: 'auto'|'transcription'|'structuring'|'manual'
     */
    window.saveEditorSnapshot = function(label, source = 'auto') {
        const ed = document.getElementById('editor');
        if (!ed || !ed.innerHTML.trim()) return;

        const html = ed.innerHTML;
        // Evitar snapshot idéntico al último
        const hash = html.length + '_' + html.slice(0, 100);
        const snaps = _getSnaps();
        if (snaps.length > 0 && snaps[snaps.length - 1]._hash === hash) return;

        snaps.push({
            label: label || 'Snapshot',
            source: source,
            ts: new Date().toISOString(),
            html: html,
            wordCount: (ed.innerText || '').split(/\s+/).filter(Boolean).length,
            _hash: hash
        });

        // Limitar cantidad
        while (snaps.length > _MAX_SNAPS) snaps.shift();
        _saveSnaps(snaps);
    };

    /** Obtener lista de snapshots (sin HTML para performance) */
    window.getEditorSnapshots = function() {
        return _getSnaps().map((s, i) => ({
            index: i,
            label: s.label,
            source: s.source,
            ts: s.ts,
            wordCount: s.wordCount
        }));
    };

    /** Restaurar un snapshot por índice */
    window.restoreEditorSnapshot = function(index) {
        const snaps = _getSnaps();
        const snap = snaps[index];
        if (!snap) return false;
        const ed = document.getElementById('editor');
        if (!ed) return false;

        // Guardar estado actual antes de restaurar
        saveEditorSnapshot('Antes de restaurar v' + (index + 1), 'manual');

        ed.innerHTML = snap.html;
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof window.updateWordCount === 'function') window.updateWordCount();

        // Establecer estado correcto: si el snapshot era de estructurado → STRUCTURED
        if (typeof updateButtonsVisibility === 'function') {
            const isStructured = snap.source === 'structuring' || (snap.label && /estructurad|structured/i.test(snap.label));
            updateButtonsVisibility(isStructured ? 'STRUCTURED' : 'TRANSCRIBED');
        }

        if (typeof showToast === 'function') {
            const date = new Date(snap.ts);
            const timeStr = date.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
            showToast(`📋 Restaurado: "${snap.label}" (${timeStr})`, 'success');
        }
        return true;
    };

    /** Borrar todos los snapshots */
    window.clearEditorSnapshots = function() {
        _snapsCache = [];
        if (typeof appDB !== 'undefined') appDB.remove(_SNAP_KEY);
        else localStorage.removeItem(_SNAP_KEY);
    };

    /** Mostrar panel de versiones (modal simple) */
    window.showSnapshotPanel = function() {
        const snaps = _getSnaps();
        if (snaps.length === 0) {
            if (typeof showToast === 'function') showToast('📋 No hay versiones guardadas aún', 'info');
            return;
        }

        // Crear modal on-the-fly
        let overlay = document.getElementById('snapshotPanelOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'snapshotPanelOverlay';
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal" style="max-width:520px;">
                    <div class="modal-header">
                        <h2>📋 Historial de versiones</h2>
                        <button class="modal-close" id="closeSnapshotPanel">&times;</button>
                    </div>
                    <div class="modal-body" id="snapshotPanelBody" style="max-height:400px;overflow-y:auto;"></div>
                    <div class="modal-footer" style="justify-content:space-between;">
                        <button class="btn btn-outline" id="btnClearSnapshots" style="font-size:0.8rem;color:#ef4444;border-color:#ef4444;">🗑️ Borrar todo</button>
                        <button class="btn btn-outline" id="btnCloseSnapPanel">Cerrar</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
            document.getElementById('closeSnapshotPanel').addEventListener('click', () => overlay.classList.remove('active'));
            document.getElementById('btnCloseSnapPanel').addEventListener('click', () => overlay.classList.remove('active'));
            document.getElementById('btnClearSnapshots').addEventListener('click', async () => {
                const ok = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('🗑️ Borrar historial', '¿Eliminar todas las versiones guardadas?')
                    : confirm('¿Eliminar todas las versiones guardadas?');
                if (ok) {
                    clearEditorSnapshots();
                    overlay.classList.remove('active');
                    if (typeof showToast === 'function') showToast('🗑️ Historial de versiones borrado', 'info');
                }
            });
        }

        // Renderizar lista
        const body = document.getElementById('snapshotPanelBody');
        const sourceIcons = { transcription: '🎙️', structuring: '🤖', manual: '✏️', auto: '⏱️' };
        body.innerHTML = snaps.map((s, i) => {
            const date = new Date(s.ts);
            const timeStr = date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const icon = sourceIcons[s.source] || '📄';
            return `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.65rem 0.5rem;border-bottom:1px solid var(--border);cursor:pointer;" class="snapshot-row" data-idx="${i}">
                <span style="font-size:1.2rem;">${icon}</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.88rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.label}</div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">${timeStr} · ${s.wordCount || '?'} palabras</div>
                </div>
                <button class="btn btn-outline btn-sm" style="font-size:0.75rem;flex-shrink:0;" data-restore="${i}">Restaurar</button>
            </div>`;
        }).reverse().join('');

        // Delegación de clicks
        body.onclick = (e) => {
            const btn = e.target.closest('[data-restore]');
            if (btn) {
                const idx = parseInt(btn.dataset.restore);
                restoreEditorSnapshot(idx);
                overlay.classList.remove('active');
            }
        };

        overlay.classList.add('active');
    };

    // ── Auto-snapshot cada 5 min si el editor cambió ──
    function _autoSnapshot() {
        const ed = document.getElementById('editor');
        if (!ed || !ed.innerHTML.trim()) return;
        const hash = ed.innerHTML.length + '_' + ed.innerHTML.slice(0, 100);
        if (hash === _lastAutoHash) return;
        _lastAutoHash = hash;
        saveEditorSnapshot('Auto-guardado', 'auto');
    }

    _autoTimer = setInterval(_autoSnapshot, _AUTO_INTERVAL);

    // Botón toolbar
    const btnSnap = document.getElementById('btnEditorSnapshots');
    if (btnSnap) btnSnap.addEventListener('click', () => showSnapshotPanel());

    // Exponer para que structurer y transcriptor guarden snapshots
    window._editorSnapshotsReady = true;
})();

// Undo/Redo System - Handled in state.js

function saveUndoState() {
    if (!editor) return;
    const html = editor.innerHTML;
    // No guardar si es idéntico al último estado
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === html) return;
    undoStack.push(html);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
}

// Guardar estado inicial al primer foco del editor
if (editor) {
    editor.addEventListener('focus', function _initUndo() {
        if (undoStack.length === 0) saveUndoState();
        editor.removeEventListener('focus', _initUndo);
    }, { once: true });
}

const undoBtn = $('undoBtn');
if (undoBtn) {
    undoBtn.addEventListener('click', () => {
        if (undoStack.length > 1 && editor) {
            redoStack.push(undoStack.pop());
            editor.innerHTML = undoStack[undoStack.length - 1] || '';
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
        }
    });
}

const redoBtn = $('redoBtn');
if (redoBtn) {
    redoBtn.addEventListener('click', () => {
        if (redoStack.length && editor) {
            const state = redoStack.pop();
            undoStack.push(state);
            editor.innerHTML = state;
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
        }
    });
}


// Find & Replace
function highlightText(text) {
    if (!editor) return;
    // Limpiar marcas previas antes de resaltar
    let content = editor.innerHTML;
    content = content.replace(/<mark>(.*?)<\/mark>/gi, '$1');
    if (!text) { editor.innerHTML = content; return; }
    const highlighted = content.replace(new RegExp(`(${escapeRegex(text)})`, 'gi'), '<mark>$1</mark>');
    editor.innerHTML = highlighted;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const toggleFindReplace = $('toggleFindReplace');
const findReplacePanel = $('findReplacePanel');
const closeFindReplace = $('closeFindReplace');
const findInput = $('findInput');
const replaceInput = $('replaceInput');

if (toggleFindReplace && findReplacePanel && findInput) {
    toggleFindReplace.addEventListener('click', () => {
        findReplacePanel.classList.toggle('active');
        if (findReplacePanel.classList.contains('active')) findInput.focus();
    });
}

if (closeFindReplace && findReplacePanel) {
    closeFindReplace.addEventListener('click', () => findReplacePanel.classList.remove('active'));
}

// ---- Find & Replace helpers ----
const btnMatchCase = $('btnMatchCase');
const btnWholeWord = $('btnWholeWord');

function isFRMatchCase() { return btnMatchCase?.getAttribute('aria-pressed') === 'true'; }
function isFRWholeWord() { return btnWholeWord?.getAttribute('aria-pressed') === 'true'; }

if (btnMatchCase) {
    btnMatchCase.addEventListener('click', () => {
        const active = btnMatchCase.getAttribute('aria-pressed') === 'true';
        btnMatchCase.setAttribute('aria-pressed', String(!active));
        btnMatchCase.classList.toggle('active', !active);
    });
}
if (btnWholeWord) {
    btnWholeWord.addEventListener('click', () => {
        const active = btnWholeWord.getAttribute('aria-pressed') === 'true';
        btnWholeWord.setAttribute('aria-pressed', String(!active));
        btnWholeWord.classList.toggle('active', !active);
    });
}

// Build regex respecting options
function buildSearchRegex(find, forAll) {
    let pattern = escapeRegex(find);
    if (typeof isFRWholeWord === 'function' && isFRWholeWord()) pattern = `(?<![\\w\u00C0-\u017E])` + pattern + `(?![\\w\u00C0-\u017E])`;
    const flags = ((typeof isFRMatchCase === 'function' && isFRMatchCase()) ? '' : 'i') + (forAll ? 'g' : '');
    return new RegExp(pattern, flags);
}

// Replace text in DOM text nodes (preserves HTML formatting)
function replaceInTextNodes(rootEl, regex, replaceWith) {
    let count = 0;
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    for (const textNode of nodes) {
        const original = textNode.nodeValue;
        const replaced = original.replace(regex, replaceWith);
        if (replaced !== original) {
            count += (original.match(regex) || []).length;
            textNode.nodeValue = replaced;
        }
    }
    return count;
}

const findNextBtn = $('findNextBtn');
if (findNextBtn && findInput && editor) {
    findNextBtn.addEventListener('click', () => {
        const text = findInput.value;
        if (!text) return;
        try {
            const regex = buildSearchRegex(text, false);
            if (regex.test(editor.innerText)) {
                highlightText(text);
            } else {
                showToast('No encontrado', 'error');
            }
        } catch (e) {
            showToast('Expresión inválida', 'error');
        }
    });
}

const replaceBtn = $('replaceBtn');
if (replaceBtn && findInput && replaceInput && editor) {
    replaceBtn.addEventListener('click', () => {
        const find = findInput.value;
        const replace = replaceInput.value;
        if (!find) return;
        try {
            const regex = buildSearchRegex(find, false);
            saveUndoState();
            const count = replaceInTextNodes(editor, regex, replace);
            if (count > 0) {
                if (typeof window.updateWordCount === 'function') window.updateWordCount();
                showToast('Reemplazado', 'success');
            } else {
                showToast('No encontrado', 'error');
            }
        } catch (e) {
            showToast('Expresión inválida', 'error');
        }
    });
}

const replaceAllBtn = $('replaceAllBtn');
if (replaceAllBtn && findInput && replaceInput && editor) {
    replaceAllBtn.addEventListener('click', () => {
        const find = findInput.value;
        const replace = replaceInput.value;
        if (!find) return;
        try {
            const regex = buildSearchRegex(find, true);
            saveUndoState();
            const count = replaceInTextNodes(editor, regex, replace);
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
            showToast(count > 0 ? `${count} reemplazado(s)` : 'No encontrado', count > 0 ? 'success' : 'error');
        } catch (e) {
            showToast('Expresión inválida', 'error');
        }
    });
}


// ============ COPY & DOWNLOAD ============
if (copyBtn && editor) {
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(editor.innerText);
            showToast('Copiado ✓', 'success');
        } catch { showToast('Error al copiar', 'error'); }
    });
}

const printBtn = document.getElementById('printBtn');
if (printBtn) {
    printBtn.addEventListener('click', () => {
        if (typeof openPrintPreview === 'function') {
            openPrintPreview();
        } else {
            window.print(); // fallback
        }
    });
}

// Download controls
const downloadDropdown = document.getElementById('downloadDropdown');
const downloadBtnMain = document.getElementById('downloadBtnMain');
const downloadBtnChevron = document.getElementById('downloadBtn');

// ── Download Favorite System ──
const FORMAT_LABELS = { pdf: 'PDF', rtf: 'RTF', txt: 'TXT', html: 'HTML' };

let _prefFmtCache = null;
if (typeof appDB !== 'undefined') {
    appDB.get('preferred_download_format').then(function(v) { if (v) _prefFmtCache = v; }).catch(function() {});
}

function getPreferredFormat() {
    return _prefFmtCache || localStorage.getItem('preferred_download_format') || 'pdf';
}

function setPreferredFormat(fmt) {
    _prefFmtCache = fmt;
    if (typeof appDB !== 'undefined') appDB.set('preferred_download_format', fmt);
    else localStorage.setItem('preferred_download_format', fmt);
    updateFavUI();
}

function updateFavUI() {
    const fav = getPreferredFormat();
    // Update main button label
    const label = document.getElementById('downloadFavLabel');
    if (label) label.textContent = FORMAT_LABELS[fav] || 'PDF';
    // Update stars in dropdown
    document.querySelectorAll('#downloadDropdown .fav-star').forEach(star => {
        const fmt = star.dataset.fmt;
        star.textContent = fmt === fav ? '⭐' : '☆';
        star.classList.toggle('active', fmt === fav);
    });
}

// Main button: 1-click download with favorite format
if (downloadBtnMain) {
    downloadBtnMain.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadFile(getPreferredFormat());
    });
}

// Chevron: toggle dropdown
if (downloadBtnChevron && downloadDropdown) {
    downloadBtnChevron.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadDropdown.classList.toggle('open');
    });

    document.addEventListener('click', e => {
        if (!downloadBtnChevron.contains(e.target) && !downloadDropdown.contains(e.target)
            && !(downloadBtnMain && downloadBtnMain.contains(e.target))) {
            downloadDropdown.classList.remove('open');
        }
    });
}

// Star click handlers (set favorite)
document.querySelectorAll('#downloadDropdown .fav-star').forEach(star => {
    star.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        setPreferredFormat(star.dataset.fmt);
        if (typeof showToast === 'function') showToast(`⭐ Formato favorito: ${FORMAT_LABELS[star.dataset.fmt]}`, 'success');
    });
});

// Init favorite UI on load
updateFavUI();

document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        const format = item.dataset.format;
        downloadFile(format);
        if (downloadDropdown) downloadDropdown.classList.remove('open');
    });
});

async function downloadFile(format) {
    if (!editor) return;
    const text = editor.innerText || '';
    if (!text.trim()) return showToast('No hay texto para descargar', 'error');

    // Validación de datos profesionales (solo bloquea si la app está totalmente sin configurar)
    if (typeof validateBeforeDownload === 'function' && !validateBeforeDownload(format)) return;

    // ── Auto-sync datos del paciente desde formularios hacia pdf_config ──────
    // pdfMaker lee de IndexedDB/pdf_config; si el usuario ingresó datos en los campos
    // req* del formulario de la app (sin pasar por el modal PDF), los sincronizamos ahora.
    const pdfConfig = window._pdfConfigCache
        || (typeof appDB !== 'undefined' ? await appDB.get('pdf_config') : null)
        || JSON.parse(localStorage.getItem('pdf_config') || '{}');

    const _vf = (id) => document.getElementById(id)?.value?.trim() || '';
    const _syncField = (cfgKey, ...ids) => {
        if (!pdfConfig[cfgKey]) {
            const v = ids.reduce((acc, id) => acc || _vf(id), '');
            if (v) { pdfConfig[cfgKey] = v; return true; }
        }
        return false;
    };
    let _cfgDirty = false;
    _cfgDirty |= _syncField('patientName',    'reqPatientName',    'pdfPatientName');
    _cfgDirty |= _syncField('patientDni',     'reqPatientDni',     'pdfPatientDni');
    _cfgDirty |= _syncField('patientAge',     'reqPatientAge',     'pdfPatientAge');
    _cfgDirty |= _syncField('patientSex',     'reqPatientSex',     'pdfPatientSex');
    _cfgDirty |= _syncField('patientInsurance','reqPatientInsurance','pdfPatientInsurance');
    _cfgDirty |= _syncField('patientAffiliateNum','reqPatientAffiliateNum','pdfPatientAffiliateNum');
    if (_cfgDirty) {
        window._pdfConfigCache = pdfConfig;
        // Persistir en IndexedDB para que pdfMaker lo lea (await garantiza escritura antes de leer)
        if (typeof appDB !== 'undefined') await appDB.set('pdf_config', pdfConfig);
        else localStorage.setItem('pdf_config', JSON.stringify(pdfConfig));
    }

    // ── Advertencia por ausencia de datos del paciente ────────────────────────
    // Solo en Modo Normal (no Pro/Gift/Clinic). En Pro/Gift el paciente puede estar
    // en el cuerpo del informe estructurado, no en los metadatos.
    const _isProLike = window.currentMode === 'pro'
        || !['NORMAL', 'TRIAL'].includes((window.CLIENT_CONFIG?.type || 'NORMAL').toUpperCase());
    const _hasPatient = !!(pdfConfig.patientName);

    if (!_hasPatient && !_isProLike) {
        return new Promise(resolve => {
            const overlay = document.getElementById('customConfirmModal');
            if (!overlay) { _doDownload(format, text).then(() => resolve(true)); return; }
            const titleEl   = document.getElementById('customConfirmTitle');
            const msgEl     = document.getElementById('customConfirmMessage');
            const acceptBtn = document.getElementById('customConfirmAccept');
            const cancelBtn = document.getElementById('customConfirmCancel');
            if (titleEl) titleEl.textContent = '⚠️ Sin datos del paciente';
            if (msgEl)   msgEl.textContent   = 'El informe no tiene datos del paciente. ¿Desea descargarlo así?';
            overlay.classList.add('active');
            const cleanup = () => {
                overlay.classList.remove('active');
                acceptBtn?.removeEventListener('click', onYes);
                cancelBtn?.removeEventListener('click', onNo);
                overlay.removeEventListener('click', onBg);
            };
            const onYes = () => { cleanup(); _doDownload(format, text).then(() => resolve(true)); };
            const onNo  = () => { cleanup(); if (typeof window.openPatientDataModal === 'function') window.openPatientDataModal(); resolve(false); };
            const onBg  = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
            acceptBtn?.addEventListener('click', onYes);
            cancelBtn?.addEventListener('click', onNo);
            overlay.addEventListener('click', onBg);
        });
    }

    await _doDownload(format, text);
}

async function _doDownload(format, text) {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // Need globals transcriptions and activeTabIndex
    const safeTranscriptions = typeof transcriptions !== 'undefined' ? transcriptions : [];
    const safeActiveIndex = typeof activeTabIndex !== 'undefined' ? activeTabIndex : 0;

    const fileName = (safeTranscriptions[safeActiveIndex]?.fileName || 'informe').replace(/\.[^/.]+$/, '');
    const date = new Date().toLocaleDateString('es-ES');
    const fileDate = new Date().toISOString().split('T')[0];

    if (format === 'pdf' && typeof downloadPDFWrapper !== 'undefined') {
        // Pasamos innerHTML para preservar H1/H2/H3/tablas/negritas del editor
        const htmlContent = editor.innerHTML || text;
        await downloadPDFWrapper(htmlContent, fileName, date, fileDate);
        return;
    }

    let blob, ext;
    switch (format) {
        case 'rtf': blob = new Blob([createRTF(text, date)], { type: 'application/rtf' }); ext = 'rtf'; break;
        case 'txt': blob = new Blob([`INFORME MÉDICO\nFecha: ${date}\n\n${text}`], { type: 'text/plain;charset=utf-8' }); ext = 'txt'; break;
        case 'html': blob = new Blob([createHTML(text, date)], { type: 'text/html;charset=utf-8' }); ext = 'html'; break;
    }

    if (blob) {
        await saveToDisk(blob, `${fileName}_${fileDate}.${ext}`);
        showToast(`Descargado .${ext}`, 'success');
    }
}

/**
 * Guarda un Blob en disco usando la File System Access API (no genera Zone.Identifier).
 * Si el browser no la soporta, usa el método clásico anchor+click como fallback.
 * @param {Blob} blob
 * @param {string} filename
 */
async function saveToDisk(blob, filename) {
    // File System Access API: disponible en Chrome/Edge 86+ cuando se sirve
    // desde https o http://localhost. Los archivos NO reciben Zone.Identifier.
    if (window.showSaveFilePicker) {
        const ext = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
            pdf:  'application/pdf',
            rtf:  'application/rtf',
            txt:  'text/plain',
            html: 'text/html',
        };
        const types = [{
            description: ext.toUpperCase() + ' file',
            accept: { [mimeTypes[ext] || blob.type || 'application/octet-stream']: ['.' + ext] },
        }];
        try {
            const handle = await window.showSaveFilePicker({ suggestedName: filename, types });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            // El usuario canceló el diálogo → no hacer nada
            if (err.name === 'AbortError') return;
            // Cualquier otro error → caer al método de fallback
            console.warn('showSaveFilePicker falló, usando fallback:', err);
        }
    }
    // Fallback: anchor + click (puede generar Zone.Identifier en Windows)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
window.saveToDisk = saveToDisk;

// Wrapper defaults globally
window.downloadRTF = () => downloadFile('rtf');
window.downloadTXT = () => downloadFile('txt');
window.downloadHTML = () => downloadFile('html');
window.downloadPDF = () => downloadFile('pdf');

function createRTF(text, fecha) {
    const lines = text.split('\n');
    let body = '';
    for (const line of lines) {
        const escaped = line
            .replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}')
            .replace(/[áàäâ]/g, "\\'e1").replace(/[éèëê]/g, "\\'e9").replace(/[íìïî]/g, "\\'ed")
            .replace(/[óòöô]/g, "\\'f3").replace(/[úùüû]/g, "\\'fa").replace(/ñ/g, "\\'f1")
            .replace(/Ñ/g, "\\'d1").replace(/[ÁÀÄÂ]/g, "\\'c1").replace(/[ÉÈËÊ]/g, "\\'c9")
            .replace(/[ÍÌÏÎ]/g, "\\'cd").replace(/[ÓÒÖÔ]/g, "\\'d3").replace(/[ÚÙÜÛ]/g, "\\'da");
        body += escaped + '\\par\n';
    }
    return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440\\qc\\f0\\fs36\\b INFORME M\\'c9DICO\\b0\\par\\fs24\\i Fecha: ${fecha}\\i0\\par\\par\\ql\\fs24${body}}`;
}

function createHTML(text, fecha) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Informe Médico</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8}
h1{text-align:center;border-bottom:2px solid #333;padding-bottom:10px}
.fecha{text-align:center;color:#666;font-style:italic}</style></head>
<body><h1>INFORME MÉDICO</h1><p class="fecha">Fecha: ${fecha}</p>
${text.split('\n').map(l => `<p>${l}</p>`).join('')}</body></html>`;
}

// ============ APPLY TEMPLATE BUTTON (Normal Mode) — dropdown ============
const applyTemplateBtn = document.getElementById('btnApplyTemplate');
const normalTemplateDropdown = document.getElementById('normalTemplateDropdown');
const normalTemplateList = document.getElementById('normalTemplateList');

function buildStaticTemplate(templateName, rawText) {
    const nd = '<span class="no-data-field" contenteditable="false" data-field-empty="1"><span class="no-data-text">[No especificado]</span><button class="no-data-edit-btn" tabindex="0" title="Completar campo" type="button">✏️</button></span>';
    return `<h1 class="report-h1">${templateName}</h1>
<h2 class="report-h2">Datos del Paciente</h2>
<p class="report-p"><strong>Nombre:</strong> ${nd} &nbsp; <strong>DNI:</strong> ${nd}</p>
<p class="report-p"><strong>Edad:</strong> ${nd} &nbsp; <strong>Sexo:</strong> ${nd}</p>
<h2 class="report-h2">Transcripción</h2>
${rawText.split('\n').filter(l => l.trim()).map(line => `<p class="report-p">${line}</p>`).join('\n')}
<h2 class="report-h2">Conclusión</h2>
<p class="report-p">${nd}</p>`;
}

async function applyNormalTemplate(templateKey) {
    // Guard: evitar doble invocación concurrente
    if (window._applyingTemplate) return;
    window._applyingTemplate = true;

    normalTemplateDropdown.style.display = 'none';
    const editorEl = document.getElementById('editor');
    const rawText = editorEl ? editorEl.innerText : '';

    if (!rawText.trim()) {
        if (typeof showToast === 'function') showToast('No hay texto para aplicar plantilla', 'error');
        return;
    }
    if (typeof MEDICAL_TEMPLATES === 'undefined') return;

    const template = MEDICAL_TEMPLATES[templateKey];
    const templateName = template ? template.name : 'General';

    // Limpiar rawText de elementos UI antes de guardar
    const _tclone = document.createElement('div');
    _tclone.innerHTML = editorEl.innerHTML;
    _tclone.querySelectorAll('.patient-placeholder-banner, .patient-data-header, .btn-append-inline, .original-text-banner').forEach(el => el.remove());
    window._lastRawTranscription = _tclone.innerText;

    const hasKey = window.GROQ_API_KEY;
    const canUseAI = hasKey && typeof structureTranscription === 'function';

    if (canUseAI) {
        if (applyTemplateBtn) applyTemplateBtn.disabled = true;
        const aiBar = document.getElementById('aiProgressBar');
        if (aiBar) aiBar.style.display = 'block';
        try {
            const rawMarkdown = await structureTranscription(rawText, templateKey);
            const { body, note } = parseAIResponse(rawMarkdown);
            editorEl.innerHTML = body;
            window._lastStructuredHTML = body;
            if (typeof showAINote === 'function') showAINote(note, templateName);
            const btnR = document.getElementById('btnRestoreOriginal');
            if (btnR) { btnR.style.display = ''; btnR._showingOriginal = false; btnR.innerHTML = '↩ Original'; btnR.classList.remove('toggle-active'); }
            const btnM = document.getElementById('btnMedicalCheck');
            if (btnM) btnM.style.display = '';
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada con IA`, 'success');
            if (typeof triggerPatientDataCheck === 'function') triggerPatientDataCheck(rawText);
        } catch (e) {
            editorEl.innerHTML = buildStaticTemplate(templateName, rawText);
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada`, 'success');
        } finally {
            window._applyingTemplate = false;
            if (applyTemplateBtn) applyTemplateBtn.disabled = false;
            const aiBar2 = document.getElementById('aiProgressBar');
            if (aiBar2) aiBar2.style.display = 'none';
        }
    } else {
        editorEl.innerHTML = buildStaticTemplate(templateName, rawText);
        if (typeof window.updateWordCount === 'function') window.updateWordCount();
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
        if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada`, 'success');
        window._applyingTemplate = false;
    }
}

if (applyTemplateBtn && normalTemplateDropdown) {
    applyTemplateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = normalTemplateDropdown.style.display !== 'none';
        normalTemplateDropdown.style.display = isOpen ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
        if (normalTemplateDropdown) normalTemplateDropdown.style.display = 'none';
    });

    if (normalTemplateList) {
        normalTemplateList.addEventListener('click', (e) => {
            const item = e.target.closest('li[data-value]');
            if (!item) return;
            e.stopPropagation();
            applyNormalTemplate(item.dataset.value);
        });
    }
}

// ============ MODAL EDITAR CAMPO [No especificado] ============

// ── Etapa 5: Sugerencias dinámicas por nombre de campo ──────────────────────
const _fieldSuggestions = {
    // Datos del paciente
    'sexo':         ['Masculino', 'Femenino'],
    'género':       ['Masculino', 'Femenino'],
    'edad':         ['Pediátrico', 'Adulto', 'Adulto mayor'],
    // Preparación / técnica
    'preparación':       ['Ayuno de 8 hs', 'Sin preparación especial', 'Ayuno de 6 hs', 'Vejiga llena'],
    'acceso':            ['Oral', 'Nasal', 'Transanal', 'Transvaginal', 'Suprapúbico'],
    'vía de acceso':     ['Oral', 'Nasal', 'Transanal'],
    'técnica':           ['Convencional', 'Helicoidal', 'Multicorte', 'Con gadolinio'],
    'contraste':         ['Sin contraste', 'Con contraste EV iodado', 'Con gadolinio', 'Oral y EV'],
    'medio de contraste': ['Sin contraste', 'Con contraste EV', 'Oral'],
    'sedación':          ['Sin sedación', 'Con sedación', 'Anestesia general'],
    'anestesia':         ['Local', 'General', 'Raquídea', 'Sin anestesia'],
    // Indicación / motivo
    'indicación':   ['Control', 'Screening', 'Dolor', 'Seguimiento post-quirúrgico', 'Estadificación'],
    'motivo':       ['Control periódico', 'Dolor', 'Estudio de rutina', 'Seguimiento'],
    'motivo de consulta': ['Dolor', 'Control', 'Disnea', 'Fiebre', 'Mareos'],
    'motivo de estudio':  ['Control', 'Dolor abdominal', 'Screening', 'Seguimiento'],
    // Hallazgos comunes
    'lateralidad':  ['Derecha', 'Izquierda', 'Bilateral'],
    'localización': ['Superior', 'Inferior', 'Anterior', 'Posterior', 'Central', 'Periférico'],
    'tamaño':       ['Pequeño', 'Mediano', 'Grande'],
    'márgenes':     ['Regulares', 'Irregulares', 'Bien definidos', 'Mal definidos'],
    'ecogenicidad': ['Anecoico', 'Hipoecoico', 'Isoecoico', 'Hiperecoico', 'Heterogéneo'],
    'densidad':     ['Hipodensa', 'Isodensa', 'Hiperdensa', 'Heterogénea'],
    'señal':        ['Hiperintensa en T2', 'Hipointensa en T1', 'Isointensa', 'Heterogénea'],
    'contorno':     ['Regular', 'Irregular', 'Lobulado'],
    // Cardiovascular
    'ritmo':        ['Sinusal', 'Fibrilación auricular', 'Irregular'],
    'frecuencia':   ['Normal', 'Taquicardia', 'Bradicardia'],
    'función sistólica': ['Conservada', 'Levemente reducida', 'Moderadamente reducida', 'Severamente reducida'],
    // Generales
    'antecedentes':      ['Sin antecedentes relevantes', 'HTA', 'DBT', 'Dislipidemia', 'Tabaquismo'],
    'medicación':        ['Sin medicación actual', 'Antihipertensivos', 'Anticoagulantes'],
    'alergias':          ['Sin alergias conocidas', 'Alergia a iodo', 'Alergia a penicilina'],
    'estado general':    ['Bueno', 'Regular', 'Malo'],
    'evolución':         ['Favorable', 'Estable', 'Desfavorable', 'Sin cambios significativos'],
    'plan':              ['Control en 6 meses', 'Control en 1 año', 'Derivar a especialista', 'Completar estudios'],
    'conducta':          ['Control ambulatorio', 'Internación', 'Interconsulta', 'Alta médica'],
    'diagnóstico':       ['A confirmar', 'Presuntivo', 'Confirmado'],
};

const _FIELD_HISTORY_KEY = 'field_value_history';

let _fldHistCache = null;
if (typeof appDB !== 'undefined') {
    appDB.get(_FIELD_HISTORY_KEY).then(function(v) { _fldHistCache = v || {}; }).catch(function() {});
}

function _getFieldHistory() {
    if (_fldHistCache !== null) return _fldHistCache;
    try { return JSON.parse(localStorage.getItem(_FIELD_HISTORY_KEY)) || {}; } catch(_) { return {}; }
}

function _saveFieldValue(fieldName, value) {
    if (!fieldName || !value || value.length < 2 || value.length > 100) return;
    const h = _getFieldHistory();
    const key = fieldName.toLowerCase().trim();
    if (!h[key]) h[key] = [];
    // No duplicar
    if (!h[key].includes(value)) {
        h[key].unshift(value);
        if (h[key].length > 8) h[key] = h[key].slice(0, 8);
    }
    _fldHistCache = h;
    if (typeof appDB !== 'undefined') appDB.set(_FIELD_HISTORY_KEY, h);
    else { try { localStorage.setItem(_FIELD_HISTORY_KEY, JSON.stringify(h)); } catch(_) {} }
}

function _renderDynamicChips(fieldName) {
    const container = document.getElementById('efDynamicChips');
    if (!container) return;
    container.innerHTML = '';
    if (!fieldName) { container.style.display = 'none'; return; }

    const key = fieldName.toLowerCase().trim();
    const suggestions = new Map(); // preserva orden, evita duplicados

    // 1) Valores aprendidos del uso (prioridad)
    const history = _getFieldHistory()[key] || [];
    history.forEach(v => suggestions.set(v, 'history'));

    // 2) Valores del diccionario fijo
    const dictKey = Object.keys(_fieldSuggestions).find(k => key.includes(k) || k.includes(key));
    if (dictKey) {
        _fieldSuggestions[dictKey].forEach(v => { if (!suggestions.has(v)) suggestions.set(v, 'dict'); });
    }

    if (suggestions.size === 0) { container.style.display = 'none'; return; }

    suggestions.forEach((source, val) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-outline btn-sm ef-quick-btn';
        btn.dataset.val = val;
        btn.textContent = val;
        btn.style.fontSize = '0.75rem';
        btn.style.padding = '0.2rem 0.55rem';
        if (source === 'history') {
            btn.style.borderColor = 'var(--primary)';
            btn.style.color = 'var(--primary)';
            btn.title = 'Usado anteriormente';
        } else {
            btn.style.borderColor = 'var(--border)';
            btn.title = 'Sugerencia';
        }
        container.appendChild(btn);
    });

    container.style.display = 'flex';
}
// ── Fin Etapa 5 ──────────────────────────────────────────────────────────────

(function () {
    const modal    = document.getElementById('editFieldModal');
    const overlay  = modal; // es el propio modal-overlay
    if (!modal) return;

    let _targetSpan = null; // span.no-data-field activo
    let _efRecorder = null;
    let _efChunks   = [];
    let _efRecordInterval = null;
    let _efRecording = false;

    // Pro = tiene API key Y el modo del cliente lo permite
    const isPro = () => !!(window.GROQ_API_KEY) &&
        (typeof CLIENT_CONFIG === 'undefined' ||
         CLIENT_CONFIG.type === 'ADMIN' ||
         CLIENT_CONFIG.hasProMode === true);

    // ── Abrir modal ──────────────────────────────────────────────
    function openEditFieldModal(span) {
        _targetSpan = span;

        // Obtener texto contexto (línea del párrafo que contiene el span)
        const para = span.closest('p,li') || span.parentElement;
        const ctx  = document.getElementById('editFieldContext');
        if (ctx && para) {
            const full = para.innerText || para.textContent;
            ctx.textContent = full.length > 90 ? full.slice(0, 87) + '…' : full;
        }

        // C1: Extraer nombre del campo (texto del párrafo ANTES del span)
        const title = document.getElementById('editFieldModalTitle');
        if (title && para) {
            let labelText = '';
            for (const node of para.childNodes) {
                if (node === span || (node.nodeType === 1 && node.contains && node.contains(span))) break;
                labelText += node.textContent || '';
            }
            labelText = labelText.trim().replace(/:+\s*$/, '').trim();
            // Si hay varios segmentos con ':', tomar el último
            const colonIdx = labelText.lastIndexOf(':');
            if (colonIdx >= 0) labelText = labelText.slice(colonIdx + 1).trim();
            if (labelText.length > 40) labelText = labelText.slice(0, 40) + '…';
            title.textContent = labelText
                ? '✏️ ' + labelText.charAt(0).toUpperCase() + labelText.slice(1)
                : '✏️ Completar campo';
        }

        // Limpiar estado
        document.getElementById('efTextInput').value     = '';
        document.getElementById('efRecordResult').value  = '';
        document.getElementById('efTranscribeStatus').textContent = '';
        document.getElementById('efRecordTime').textContent = '00:00';
        _stopRecordingEF();

        // Pestaña por defecto
        _switchTab('write');

        // Etapa 5: renderizar chips dinámicos según el nombre del campo
        const fieldLabel = title ? title.textContent.replace(/^✏️\s*/, '').trim() : '';
        _renderDynamicChips(fieldLabel);

        // Tab Grabar: siempre visible (en Normal se muestra locked por _switchTab)

        overlay.classList.add('active');
        setTimeout(() => document.getElementById('efTextInput').focus(), 80);
    }

    // ── Cerrar modal ─────────────────────────────────────────────
    function closeEditFieldModal() {
        _stopRecordingEF();
        overlay.classList.remove('active');
        _targetSpan = null;
    }

    // ── Aplicar valor al span ────────────────────────────────────
    function applyFieldValue(val) {
        if (!_targetSpan) return;
        const text = (val || '').trim();
        if (!text) { closeEditFieldModal(); return; }

        // Etapa 5: guardar valor usado para aprendizaje
        const titleEl = document.getElementById('editFieldModalTitle');
        const fieldLabel = titleEl ? titleEl.textContent.replace(/^✏️\s*/, '').trim() : '';
        if (fieldLabel && text !== 's/p' && text !== 'Sin particularidades' && text !== 'No evaluado') {
            _saveFieldValue(fieldLabel, text);
        }

        const node = document.createTextNode(text);
        _targetSpan.replaceWith(node);
        const editorEl = document.getElementById('editor');
        if (editorEl) editorEl.dispatchEvent(new Event('input', { bubbles: true }));
        closeEditFieldModal();
    }

    // ── Pestañas ─────────────────────────────────────────────────
    function _switchTab(tab) {
        const isWrite = tab === 'write';
        const tabWrite = document.getElementById('efTabWrite');
        const tabRecord = document.getElementById('efTabRecord');
        document.getElementById('efPanelWrite').style.display   = isWrite ? '' : 'none';
        document.getElementById('efPanelRecord').style.display  = isWrite ? 'none' : '';
        // Tab Escribir: estilo simple
        tabWrite.style.background  = isWrite ? 'var(--primary)' : 'var(--bg-card)';
        tabWrite.style.color       = isWrite ? '#fff' : 'var(--text-primary)';
        // Tab Grabar: en modo Normal → siempre locked; en Pro/Gift/Clinic → habilitado
        const _isProCtx = window.currentMode === 'pro'
            || (typeof CLIENT_CONFIG !== 'undefined' && (CLIENT_CONFIG.type === 'PRO' || CLIENT_CONFIG.type === 'ADMIN'));
        if (!_isProCtx) {
            // Modo Normal: deshabilitado con candado
            tabRecord.classList.remove('btn-pro-animated');
            tabRecord.style.background = 'var(--bg-card)';
            tabRecord.style.color = 'var(--text-secondary)';
            tabRecord.style.opacity = '0.55';
            tabRecord.style.cursor = 'not-allowed';
            tabRecord.disabled = true;
        } else if (isWrite) {
            // Pro + tab Escribir activo → Grabar muestra animación Gemini atractiva
            tabRecord.disabled = false;
            tabRecord.style.opacity = '1';
            tabRecord.style.cursor = 'pointer';
            tabRecord.classList.add('btn-pro-animated');
        } else {
            // Pro + tab Grabar activo → estilo activo sólido
            tabRecord.disabled = false;
            tabRecord.style.opacity = '1';
            tabRecord.style.cursor = 'pointer';
            tabRecord.classList.remove('btn-pro-animated');
            tabRecord.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
            tabRecord.style.color = '#fff';
        }
    }

    document.getElementById('efTabWrite')?.addEventListener('click', () => _switchTab('write'));
    document.getElementById('efTabRecord')?.addEventListener('click', () => {
        // Modo Normal → siempre bloqueado (salvo que CLIENT_CONFIG sea PRO/ADMIN)
        const _isProClick = window.currentMode === 'pro'
            || (typeof CLIENT_CONFIG !== 'undefined' && (CLIENT_CONFIG.type === 'PRO' || CLIENT_CONFIG.type === 'ADMIN'));
        if (!_isProClick) {
            showToast('🔒 Función disponible solo en Modo Pro', 'info');
            return;
        }
        if (!isPro()) { showToast('🔑 API Key requerida para grabar y transcribir', 'info'); return; }
        _switchTab('record');
    });

    // Botones de opciones rápidas (s/p, Sin particularidades)
    document.getElementById('efPanelWrite')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.ef-quick-btn');
        if (!btn) return;
        applyFieldValue(btn.dataset.val);
    });

    // ── Grabación y transcripción ─────────────────────────────────
    function _stopRecordingEF() {
        if (_efRecorder && _efRecording) {
            try { _efRecorder.stop(); } catch(e) {}
        }
        _efRecording = false;
        clearInterval(_efRecordInterval);
        const btn = document.getElementById('efRecordBtn');
        if (btn) {
            document.getElementById('efRecordIcon').textContent  = '🎙️';
            document.getElementById('efRecordLabel').textContent = 'Iniciar grabación';
            btn.classList.remove('recording-pulse');
        }
    }

    document.getElementById('efRecordBtn')?.addEventListener('click', async () => {
        if (!_efRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                _efChunks = [];
                _efRecorder = new MediaRecorder(stream);
                _efRecorder.ondataavailable = e => _efChunks.push(e.data);
                _efRecorder.onstop = async () => {
                    stream.getTracks().forEach(t => t.stop());
                    const realMime = _efRecorder.mimeType || 'audio/webm';
                    const ext = realMime.includes('ogg') ? 'ogg' : 'webm';
                    const blob = new Blob(_efChunks, { type: realMime });
                    const file = new File([blob], `campo.${ext}`, { type: realMime });
                    const status = document.getElementById('efTranscribeStatus');
                    const result = document.getElementById('efRecordResult');
                    if (status) status.textContent = '⏳ Transcribiendo...';
                    try {
                        let txt = await window.transcribeAudioSimple(file);
                        if (typeof window.cleanTranscriptionText === 'function') {
                            txt = window.cleanTranscriptionText(txt);
                        }
                        if (result) result.value = txt.trim();
                        if (status) status.textContent = txt
                            ? '✅ Transcripción lista. Editá si es necesario y pulsá Aplicar.'
                            : '🔇 No se detectó dictado claro. Intentá de nuevo.';
                    } catch(e) {
                        if (status) status.textContent = '❌ Error al transcribir. Intentá de nuevo.';
                    }
                };
                _efRecorder.start();
                _efRecording = true;
                const start = Date.now();
                _efRecordInterval = setInterval(() => {
                    const d = Date.now() - start;
                    const s = Math.floor((d/1000)%60), m = Math.floor(d/60000);
                    const el = document.getElementById('efRecordTime');
                    if (el) el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                }, 1000);
                document.getElementById('efRecordIcon').textContent  = '⏹️';
                document.getElementById('efRecordLabel').textContent = 'Detener grabación';
                document.getElementById('efRecordBtn').classList.add('recording-pulse');
            } catch(err) {
                showToast('No se pudo acceder al micrófono', 'error');
            }
        } else {
            _stopRecordingEF();
        }
    });

    // C2: Dejar en blanco — elimina el span del DOM
    function clearFieldValue() {
        if (!_targetSpan) return;
        _targetSpan.remove();
        const editorEl = document.getElementById('editor');
        if (editorEl) editorEl.dispatchEvent(new Event('input', { bubbles: true }));
        closeEditFieldModal();
    }
    document.getElementById('btnBlankEditField')?.addEventListener('click', clearFieldValue);

    // Eliminar campo — quita la sección completa (H2/H3 + contenido hasta el siguiente H2/H3)
    function deleteFieldSection() {
        if (!_targetSpan) return;
        const editorEl = document.getElementById('editor');
        if (!editorEl) return;

        // Encontrar el heading (h2/h3) que contiene o precede al span
        let heading = _targetSpan.closest('h2, h3, .report-h2, .report-h3');
        if (!heading) {
            // Buscar el heading anterior en el DOM
            let node = _targetSpan.closest('p, li, div') || _targetSpan.parentElement;
            while (node && node !== editorEl) {
                let prev = node.previousElementSibling;
                while (prev) {
                    const tag = prev.tagName?.toLowerCase();
                    if (tag === 'h2' || tag === 'h3' || prev.classList?.contains('report-h2') || prev.classList?.contains('report-h3')) {
                        heading = prev;
                        break;
                    }
                    prev = prev.previousElementSibling;
                }
                if (heading) break;
                node = node.parentElement;
            }
        }

        if (!heading) {
            // Fallback: solo eliminar el span y su contenedor
            const para = _targetSpan.closest('p, li') || _targetSpan.parentElement;
            if (para && para !== editorEl) para.remove();
            closeEditFieldModal();
            return;
        }

        // Recolectar todos los elementos entre este heading y el siguiente heading del mismo o mayor nivel
        const headingLevel = heading.tagName?.toLowerCase() === 'h2' || heading.classList?.contains('report-h2') ? 2 : 3;
        const toRemove = [heading];
        let sibling = heading.nextElementSibling;
        while (sibling) {
            const sibTag = sibling.tagName?.toLowerCase();
            const sibIsH2 = sibTag === 'h2' || sibling.classList?.contains('report-h2');
            const sibIsH3 = sibTag === 'h3' || sibling.classList?.contains('report-h3');
            const sibLevel = sibIsH2 ? 2 : sibIsH3 ? 3 : 99;
            if (sibLevel <= headingLevel) break; // Siguiente sección del mismo nivel o superior
            toRemove.push(sibling);
            sibling = sibling.nextElementSibling;
        }

        toRemove.forEach(el => {
            // También eliminar nodos de texto vacíos (saltos de línea, br) entre secciones
            let nextNode = el.nextSibling;
            while (nextNode && (nextNode.nodeType === 3 && nextNode.textContent.trim() === '' || nextNode.nodeName === 'BR')) {
                const toKill = nextNode;
                nextNode = nextNode.nextSibling;
                toKill.remove();
            }
            el.remove();
        });
        editorEl.dispatchEvent(new Event('input', { bubbles: true }));
        closeEditFieldModal();
        if (typeof showToast === 'function') showToast('🗑️ Sección eliminada del informe', 'info');
    }

    // Modal de confirmación custom (reemplaza confirm() nativo)
    // Soporta callback legacy Y Promise
    function showCustomConfirm(title, message, onAccept) {
        const overlay = document.getElementById('customConfirmModal');
        const titleEl = document.getElementById('customConfirmTitle');
        const msgEl = document.getElementById('customConfirmMessage');
        const acceptBtn = document.getElementById('customConfirmAccept');
        const cancelBtn = document.getElementById('customConfirmCancel');

        // Si no hay modal en el DOM, fallback al nativo
        if (!overlay) {
            if (onAccept) { if (window.confirm(message)) onAccept(); return Promise.resolve(false); }
            return Promise.resolve(window.confirm(message));
        }

        titleEl.textContent = title;
        msgEl.textContent = message;
        overlay.classList.add('active');

        return new Promise(resolve => {
            function cleanup() {
                overlay.classList.remove('active');
                acceptBtn.removeEventListener('click', onYes);
                cancelBtn.removeEventListener('click', onNo);
                overlay.removeEventListener('click', onOverlay);
                document.removeEventListener('keydown', onKey);
            }
            function onYes() { cleanup(); if (onAccept) onAccept(); resolve(true); }
            function onNo() { cleanup(); resolve(false); }
            function onOverlay(e) { if (e.target === overlay) onNo(); }
            function onKey(e) { if (e.key === 'Escape') onNo(); }

            acceptBtn.addEventListener('click', onYes);
            cancelBtn.addEventListener('click', onNo);
            overlay.addEventListener('click', onOverlay);
            document.addEventListener('keydown', onKey);
            acceptBtn.focus();
        });
    }

    // Modal de prompt custom (reemplaza prompt() nativo)
    function showCustomPrompt(title, placeholder, defaultValue) {
        const overlay = document.getElementById('customPromptModal');
        const titleEl = document.getElementById('customPromptTitle');
        const input = document.getElementById('customPromptInput');
        const acceptBtn = document.getElementById('customPromptAccept');
        const cancelBtn = document.getElementById('customPromptCancel');

        if (!overlay) return Promise.resolve(window.prompt(title, defaultValue || ''));

        titleEl.textContent = title;
        input.placeholder = placeholder || '';
        input.value = defaultValue || '';
        overlay.classList.add('active');
        setTimeout(() => { input.focus(); input.select(); }, 50);

        return new Promise(resolve => {
            function cleanup() {
                overlay.classList.remove('active');
                acceptBtn.removeEventListener('click', onAccept);
                cancelBtn.removeEventListener('click', onCancel);
                overlay.removeEventListener('click', onOverlay);
                input.removeEventListener('keydown', onKey);
                document.removeEventListener('keydown', onEsc);
            }
            function onAccept() { const v = input.value.trim(); cleanup(); resolve(v || null); }
            function onCancel() { cleanup(); resolve(null); }
            function onOverlay(e) { if (e.target === overlay) onCancel(); }
            function onKey(e) { if (e.key === 'Enter') { e.preventDefault(); onAccept(); } }
            function onEsc(e) { if (e.key === 'Escape') onCancel(); }

            acceptBtn.addEventListener('click', onAccept);
            cancelBtn.addEventListener('click', onCancel);
            overlay.addEventListener('click', onOverlay);
            input.addEventListener('keydown', onKey);
            document.addEventListener('keydown', onEsc);
        });
    }

    // Exponer globalmente para que otros módulos puedan usar modales propios
    window.showCustomConfirm = showCustomConfirm;
    window.showCustomPrompt = showCustomPrompt;

    document.getElementById('btnDeleteFieldSection')?.addEventListener('click', () => {
        const sectionName = document.getElementById('editFieldModalTitle')?.textContent?.replace(/^✏️\s*/, '') || 'esta sección';
        showCustomConfirm(
            '🗑️ Eliminar campo',
            `¿Eliminar "${sectionName}" del informe? Esta acción no se puede deshacer.`,
            () => deleteFieldSection()
        );
    });

    // ── Confirmar ─────────────────────────────────────────────────
    document.getElementById('btnConfirmEditField')?.addEventListener('click', () => {
        const writePanel = document.getElementById('efPanelWrite');
        const isWrite = writePanel && writePanel.style.display !== 'none';
        const val = isWrite
            ? document.getElementById('efTextInput').value
            : document.getElementById('efRecordResult').value;
        applyFieldValue(val);
    });

    // ── Cancelar & cerrar ─────────────────────────────────────────
    document.getElementById('btnCancelEditField')?.addEventListener('click', closeEditFieldModal);
    document.getElementById('closeEditFieldModal')?.addEventListener('click', closeEditFieldModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeEditFieldModal(); });

    // ── Teclas en textarea ────────────────────────────────────────
    document.getElementById('efTextInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('btnConfirmEditField').click(); }
        if (e.key === 'Escape') closeEditFieldModal();
    });

    // ── Abrir desde botón lápiz en el editor ─────────────────────
    if (editor) {
        editor.addEventListener('click', (e) => {
            const btn = e.target.closest('.no-data-edit-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                const span = btn.closest('.no-data-field');
                if (span) openEditFieldModal(span);
            }
        });
    }

    // Exponer para tests y uso externo
    window._openEditFieldModal = openEditFieldModal;
    window._closeEditFieldModal = closeEditFieldModal;
}());
