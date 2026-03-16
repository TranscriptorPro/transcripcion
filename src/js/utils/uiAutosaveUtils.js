// ============ UI AUTO-SAVE (cada 30s) ============
(function initAutoSave() {
    const AUTOSAVE_KEY = 'editor_autosave';
    const AUTOSAVE_META_KEY = 'editor_autosave_meta';
    const INTERVAL_MS = 8000;
    let _autoSaveTimer = null;

    function saveEditorContent() {
        const editor = document.getElementById('editor');
        if (!editor) return;
        const content = editor.innerHTML;
        if (!content || content.trim() === '' || content === '<br>') return;
        if (typeof appDB !== 'undefined') appDB.set(AUTOSAVE_KEY, content);
        localStorage.setItem(AUTOSAVE_KEY, content);
        const _meta = { timestamp: Date.now(), mode: window.currentMode || 'normal', template: window.selectedTemplate || '', tabIndex: window.activeTabIndex || 0 };
        if (typeof appDB !== 'undefined') appDB.set(AUTOSAVE_META_KEY, _meta);
        localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify(_meta));
    }

    function startAutoSave() {
        if (_autoSaveTimer) clearInterval(_autoSaveTimer);
        _autoSaveTimer = setInterval(saveEditorContent, INTERVAL_MS);
    }

    function restoreAutoSave() {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        let meta;
        try { meta = JSON.parse(localStorage.getItem(AUTOSAVE_META_KEY) || '{}'); }
        catch (_) { meta = {}; }
        if (!saved || !meta.timestamp) return;

        // Solo restaurar si tiene menos de 2 horas
        const ageMs = Date.now() - meta.timestamp;
        if (ageMs > 2 * 60 * 60 * 1000) {
            if (typeof appDB !== 'undefined') { appDB.remove(AUTOSAVE_KEY); appDB.remove(AUTOSAVE_META_KEY); }
            localStorage.removeItem(AUTOSAVE_KEY);
            localStorage.removeItem(AUTOSAVE_META_KEY);
            return;
        }

        const editor = document.getElementById('editor');
        if (!editor) return;
        // Solo ofrecer si el editor esta vacio
        if (editor.innerText.trim().length > 0) return;

        const mins = Math.floor(ageMs / 60000);
        const timeLabel = mins < 1 ? 'menos de 1 min' : mins + ' min';

        // Mostrar boton de restaurar sesion
        const restoreBtn = document.getElementById('btnRestoreSession');
        if (restoreBtn) {
            restoreBtn.textContent = `♻️ Restaurar sesión anterior (hace ${timeLabel})`;
            restoreBtn.style.display = '';
            restoreBtn.onclick = () => {
                editor.innerHTML = saved;
                if (typeof updateWordCount === 'function') updateWordCount();
                const restoredState = typeof detectEditorState === 'function' ? detectEditorState(saved) : 'TRANSCRIBED';
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility(restoredState);
                if (typeof showToast === 'function') showToast('✅ Borrador restaurado', 'success', 2000);
                restoreBtn.style.display = 'none';
            };
        }

        // Tambien mostrar toast discreto
        if (typeof showToast === 'function') {
            showToast(`♻️ Hay un borrador guardado (hace ${timeLabel}). Usá el botón para restaurarlo.`, 'info', 5000);
        }
    }

    // Exponer globalmente
    window.autoSaveEditorContent = saveEditorContent;

    // Intentar restaurar al cargar
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(restoreAutoSave, 500);
        startAutoSave();
    });

    // Guardar al cerrar/salir
    window.addEventListener('beforeunload', saveEditorContent);
    window.addEventListener('pagehide', saveEditorContent);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveEditorContent();
    });

    // Limpiar autosave al resetear
    const resetBtnEl = document.getElementById('resetBtn');
    if (resetBtnEl) {
        resetBtnEl.addEventListener('click', () => {
            if (typeof appDB !== 'undefined') { appDB.remove(AUTOSAVE_KEY); appDB.remove(AUTOSAVE_META_KEY); }
            localStorage.removeItem(AUTOSAVE_KEY);
            localStorage.removeItem(AUTOSAVE_META_KEY);
            // Ocultar boton restaurar si estaba visible
            const restoreBtn = document.getElementById('btnRestoreSession');
            if (restoreBtn) restoreBtn.style.display = 'none';
        });
    }
})();
