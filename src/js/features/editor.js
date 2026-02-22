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
                    tableHTML += '<td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>';
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
if (downloadBtn && downloadDropdown) {
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadDropdown.classList.toggle('open');
    });

    document.addEventListener('click', e => {
        if (!downloadBtn.contains(e.target) && !downloadDropdown.contains(e.target)) {
            downloadDropdown.classList.remove('open');
        }
    });
}

document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        const format = item.dataset.format;
        downloadFile(format);
        if (downloadDropdown) downloadDropdown.classList.remove('open');
    });
});

function downloadFile(format) {
    if (!editor) return;
    const text = editor.innerText || '';
    if (!text.trim()) return showToast('No hay texto', 'error');

    // Need globals transcriptions and activeTabIndex
    const safeTranscriptions = typeof transcriptions !== 'undefined' ? transcriptions : [];
    const safeActiveIndex = typeof activeTabIndex !== 'undefined' ? activeTabIndex : 0;

    const fileName = (safeTranscriptions[safeActiveIndex]?.fileName || 'informe').replace(/\.[^/.]+$/, '');
    const date = new Date().toLocaleDateString('es-ES');
    const fileDate = new Date().toISOString().split('T')[0];

    if (format === 'pdf' && typeof downloadPDFWrapper !== 'undefined') {
        downloadPDFWrapper(text, fileName, date, fileDate);
        return;
    }

    let blob, ext;
    switch (format) {
        case 'rtf': blob = new Blob([createRTF(text, date)], { type: 'application/rtf' }); ext = 'rtf'; break;
        case 'txt': blob = new Blob([`INFORME MÉDICO\nFecha: ${date}\n\n${text}`], { type: 'text/plain;charset=utf-8' }); ext = 'txt'; break;
        case 'html': blob = new Blob([createHTML(text, date)], { type: 'text/html;charset=utf-8' }); ext = 'html'; break;
    }

    if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${fileName}_${fileDate}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        showToast(`Descargado .${ext}`, 'success');
    }
}

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
            if (btnR) { btnR.style.display = ''; btnR._showingOriginal = false; btnR.textContent = '↩'; }
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

// Clickable [No especificado] — selecciona el texto al hacer clic para reemplazarlo
if (editor) {
    editor.addEventListener('click', (e) => {
        const noData = e.target.closest('.no-data');
        if (!noData) return;
        const range = document.createRange();
        range.selectNodeContents(noData);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });
}
