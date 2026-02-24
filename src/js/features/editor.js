// ============ EDITOR WYSIWYG ============

if (editor) {
    editor.addEventListener('input', () => {
        if (typeof window.updateWordCount === 'function') window.updateWordCount();
        saveUndoState();
    });
}

window.formatText = cmd => {
    document.execCommand(cmd, false, null);
    if (editor) editor.focus();
};

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
        const currentSize = parseInt(window.getComputedStyle(editor).fontSize);
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
    insertLinkBtn.addEventListener('click', () => {
        const url = prompt('Ingrese la URL:');
        if (url) {
            document.execCommand('createLink', false, url);
            editor.focus();
        }
    });
}

const insertTableBtn = $('insertTableBtn');
if (insertTableBtn && editor) {
    insertTableBtn.addEventListener('click', () => {
        const rows = prompt('Número de filas:', '3');
        const cols = prompt('Número de columnas:', '3');
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


// Undo/Redo System - Handled in state.js

function saveUndoState() {
    if (!editor) return;
    undoStack.push(editor.innerHTML);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
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
    const content = editor.innerHTML;
    // Basic highlighted logic
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
    if (isFRWholeWord()) pattern = `(?<![\\w\u00C0-\u017E])` + pattern + `(?![\\w\u00C0-\u017E])`;
    const flags = (isFRMatchCase() ? '' : 'i') + (forAll ? 'g' : '');
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

function getPreferredFormat() {
    return localStorage.getItem('preferred_download_format') || 'pdf';
}

function setPreferredFormat(fmt) {
    localStorage.setItem('preferred_download_format', fmt);
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
    if (!text.trim()) return showToast('No hay texto', 'error');

    // Validación de config antes de PDF
    if (typeof validateBeforeDownload === 'function' && !validateBeforeDownload(format)) return;

    // Advertencia si no hay datos del paciente
    const pdfConfig = JSON.parse(localStorage.getItem('pdf_config') || '{}');
    if (!pdfConfig.patientName) {
        const proceed = confirm('⚠️ El informe no tiene datos del paciente.\n¿Desea descargarlo así?');
        if (!proceed) {
            // Abrir modal de datos del paciente
            if (typeof window.openPatientDataModal === 'function') window.openPatientDataModal();
            return;
        }
    }

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
    const nd = '<span class="no-data" tabindex="0" title="Clic para editar">[No especificado]</span>';
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

    window._lastRawTranscription = rawText;

    const hasKey = window.GROQ_API_KEY || localStorage.getItem('groq_api_key');
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
            if (applyTemplateBtn) applyTemplateBtn.disabled = false;
            const aiBar2 = document.getElementById('aiProgressBar');
            if (aiBar2) aiBar2.style.display = 'none';
        }
    } else {
        editorEl.innerHTML = buildStaticTemplate(templateName, rawText);
        if (typeof window.updateWordCount === 'function') window.updateWordCount();
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
        if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada`, 'success');
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

        // Ocultar tab Pro si no hay API key
        const tabRec = document.getElementById('efTabRecord');
        if (tabRec) tabRec.style.display = isPro() ? '' : 'none';

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
        const node = document.createTextNode(text);
        _targetSpan.replaceWith(node);
        const editorEl = document.getElementById('editor');
        if (editorEl) editorEl.dispatchEvent(new Event('input', { bubbles: true }));
        closeEditFieldModal();
    }

    // ── Pestañas ─────────────────────────────────────────────────
    function _switchTab(tab) {
        const isWrite = tab === 'write';
        document.getElementById('efPanelWrite').style.display   = isWrite ? '' : 'none';
        document.getElementById('efPanelRecord').style.display  = isWrite ? 'none' : '';
        document.getElementById('efTabWrite').style.background  = isWrite ? 'var(--primary)' : 'var(--bg-card)';
        document.getElementById('efTabWrite').style.color       = isWrite ? '#fff' : 'var(--text-primary)';
        document.getElementById('efTabRecord').style.background = isWrite ? 'var(--bg-card)' : 'var(--primary)';
        document.getElementById('efTabRecord').style.color      = isWrite ? 'var(--text-primary)' : '#fff';
    }

    document.getElementById('efTabWrite')?.addEventListener('click', () => _switchTab('write'));
    document.getElementById('efTabRecord')?.addEventListener('click', () => {
        if (!isPro()) { showToast('Función disponible en Modo Pro (API Key requerida)', 'warning'); return; }
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
                    const blob = new Blob(_efChunks, { type: 'audio/wav' });
                    const file = new File([blob], 'campo.wav', { type: 'audio/wav' });
                    const status = document.getElementById('efTranscribeStatus');
                    const result = document.getElementById('efRecordResult');
                    if (status) status.textContent = '⏳ Transcribiendo...';
                    try {
                        const form = new FormData();
                        form.append('file', file);
                        form.append('model', 'whisper-large-v3-turbo');
                        form.append('response_format', 'text');
                        form.append('language', 'es');
                        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${window.GROQ_API_KEY}` },
                            body: form
                        });
                        const txt = await res.text();
                        if (result) result.value = txt.trim();
                        if (status) status.textContent = '✅ Transcripción lista. Editá si es necesario y pulsá Aplicar.';
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

        toRemove.forEach(el => el.remove());
        editorEl.dispatchEvent(new Event('input', { bubbles: true }));
        closeEditFieldModal();
        if (typeof showToast === 'function') showToast('🗑️ Sección eliminada del informe', 'info');
    }
    document.getElementById('btnDeleteFieldSection')?.addEventListener('click', () => {
        const sectionName = document.getElementById('editFieldModalTitle')?.textContent?.replace(/^✏️\s*/, '') || 'esta sección';
        if (confirm(`¿Eliminar "${sectionName}" del informe?\nEsta acción no se puede deshacer.`)) {
            deleteFieldSection();
        }
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
