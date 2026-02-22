// ============ EDITOR WYSIWYG ============

function updateWordCount() {
    if (!editor || !wordCount) return;
    const text = editor.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    wordCount.textContent = `${words} palabras`;

    const hasText = text.length > 0;
    if (copyBtn) copyBtn.disabled = !hasText;
    if (downloadBtn) downloadBtn.disabled = !hasText;
}

if (editor) {
    editor.addEventListener('input', () => {
        updateWordCount();
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
            updateWordCount();
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
            updateWordCount();
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

const findNextBtn = $('findNextBtn');
if (findNextBtn && findInput && editor) {
    findNextBtn.addEventListener('click', () => {
        const text = findInput.value;
        if (!text) return;
        const selection = window.getSelection();
        const content = editor.innerText;
        const start = content.indexOf(text, selection.anchorOffset || 0);
        if (start >= 0) {
            highlightText(text);
        } else {
            showToast('No encontrado', 'error');
        }
    });
}

const replaceBtn = $('replaceBtn');
if (replaceBtn && findInput && replaceInput && editor) {
    replaceBtn.addEventListener('click', () => {
        const find = findInput.value;
        const replace = replaceInput.value;
        if (!find) return;
        const html = editor.innerHTML;
        const newHtml = html.replace(find, replace);
        if (html !== newHtml) {
            saveUndoState();
            editor.innerHTML = newHtml;
            updateWordCount();
            showToast('Reemplazado', 'success');
        }
    });
}

const replaceAllBtn = $('replaceAllBtn');
if (replaceAllBtn && findInput && replaceInput && editor) {
    replaceAllBtn.addEventListener('click', () => {
        const find = findInput.value;
        const replace = replaceInput.value;
        if (!find) return;
        saveUndoState();
        const regex = new RegExp(escapeRegex(find), 'gi');
        const text = editor.innerText;
        const count = (text.match(regex) || []).length;
        editor.innerText = text.replace(regex, replace);
        updateWordCount();
        showToast(`${count} reemplazado(s)`, 'success');
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
        window.print();
    });
}

// Download controls
const downloadDropdown = document.querySelector('.dropdown-menu'); // A function scope limit prevents collision
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
        a.click();
        URL.revokeObjectURL(a.href);
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

// ============ APPLY TEMPLATE BUTTON (Normal Mode) ============
const btnApplyTemplateEl = document.getElementById('btnApplyTemplate');
if (btnApplyTemplateEl) {
    btnApplyTemplateEl.addEventListener('click', () => {
        const editor = document.getElementById('editor');
        const rawText = editor ? editor.innerText : '';
        const normalTemplateSelectEl = document.getElementById('normalTemplateSelect');
        const templateKey = normalTemplateSelectEl ? normalTemplateSelectEl.value : 'generico';

        if (!rawText.trim()) {
            if (typeof showToast === 'function') showToast('No hay texto para aplicar plantilla', 'error');
            return;
        }

        if (typeof MEDICAL_TEMPLATES === 'undefined') return;
        const template = MEDICAL_TEMPLATES[templateKey];
        const templateName = template ? template.name : 'General';

        const structured = `<h2>${templateName}</h2>
<h3>Datos del Paciente:</h3>
<p>[Completar desde historial o manualmente]</p>
<h3>Transcripción:</h3>
${rawText.split('\n').filter(l => l.trim()).map(line => `<p>${line}</p>`).join('\n')}
<h3>Conclusión:</h3>
<p>[A completar por el profesional]</p>`;

        if (editor) {
            editor.innerHTML = structured;
            if (typeof updateWordCount === 'function') updateWordCount();
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada`, 'success');
        }
    });
}
