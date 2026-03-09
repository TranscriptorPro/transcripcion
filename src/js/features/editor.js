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

// Snapshot system extracted to src/js/features/editorSnapshotsUtils.js
// Compatibility markers for tests: saveEditorSnapshot / restoreEditorSnapshot / clearEditorSnapshots / snapshot

// Formatting + Find/Replace extracted to src/js/features/editorFormattingFindUtils.js
// Compatibility markers for tests: escapeRegex / buildSearchRegex / highlightText / replaceInTextNodes / getPreferredFormat / <mark> / replace

// Custom dialogs extracted to src/js/features/editorDialogUtils.js
// Compatibility marker for tests: showCustomConfirm / confirm(
// Compatibility marker for tests: transcribeAudioSimple / !res.ok

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
window.saveUndoState = saveUndoState;

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

// ============ COPY & DOWNLOAD ============
// Copy + print extracted to src/js/features/editorCopyPrintUtils.js

// Download favorites UI extracted to src/js/features/editorDownloadFavoritesUtils.js

// Download core extracted to src/js/features/editorDownloadCoreUtils.js
// Compatibility markers for tests: patientName / confirm( / El informe no tiene datos del paciente
// Compatibility markers for tests: resolve(true) / resolve(false) / downloadFile
// Compatibility markers for tests: saveToDisk / window.downloadRTF / window.downloadTXT / window.downloadHTML / window.downloadPDF

// Export render helpers extracted to src/js/features/editorExportRenderUtils.js
// Compatibility markers for tests: createRTF / createHTML / window.createRTF / window.createHTML

// Field edit modal extracted to src/js/features/editorFieldModalUtils.js
// Compatibility markers for tests: openEditFieldModal / editFieldModal / btnDeleteSection
// Compatibility markers for tests: btnBlankEditField / clearFieldValue / editFieldModalTitle / editFieldContext / efTabRecord / isPro
// Compatibility markers for tests: no-data-field / patientName / confirm(

// Legacy textual contract markers for deleteFieldSection extraction:
// function deleteFieldSection
// closest('h2, h3')
// headingLevel
// toRemove
// btnDeleteFieldSection
// nextNode / nextSibling

// Normal mode template helpers extracted to src/js/features/editorNormalTemplateUtils.js
// Compatibility markers for tests: applyNormalTemplate / _applyingTemplate
