// Settings Editor Prefs Utils
// Encapsulates editor preferences and autosave behavior from settings panel.
(function () {
    'use strict';

    let autosaveTimer = null;

    function applyEditorPrefs(prefs) {
        const editor = document.getElementById('mainEditor') || document.getElementById('editor');
        if (editor) {
            const sizes = { small: '0.82rem', medium: '0.95rem', large: '1.1rem' };
            editor.style.fontSize = sizes[prefs.editorFontSize] || sizes.medium;
        }

        const inlineReviewEnabled = prefs.inlineParagraphReview !== false;
        window.inlineParagraphReviewEnabled = inlineReviewEnabled;
        if (typeof window._refreshInlineReviewButtons === 'function') {
            window._refreshInlineReviewButtons(inlineReviewEnabled);
        }

        if (prefs.autosave) {
            startAutosave();
        } else {
            stopAutosave();
        }
    }

    function initEditorPrefs(options) {
        const opts = options || {};
        const getPrefs = opts.getPrefs;
        const savePrefs = opts.savePrefs;

        if (typeof getPrefs !== 'function' || typeof savePrefs !== 'function') return;

        const fontSize = document.getElementById('settingsEditorFontSize');
        const autosave = document.getElementById('settingsAutosave');
        const undoHistory = document.getElementById('settingsUndoHistory');
        const inlineReview = document.getElementById('settingsInlineReviewToggle');

        if (fontSize) {
            fontSize.addEventListener('change', () => {
                const prefs = getPrefs();
                prefs.editorFontSize = fontSize.value;
                savePrefs(prefs);
                applyEditorPrefs(prefs);
                if (typeof window.showToast === 'function') {
                    window.showToast('Tamaño de texto actualizado', 'success');
                }
            });
        }

        if (autosave) {
            autosave.addEventListener('change', () => {
                const prefs = getPrefs();
                prefs.autosave = autosave.checked;
                savePrefs(prefs);
                applyEditorPrefs(prefs);
            });
        }

        if (undoHistory) {
            undoHistory.addEventListener('change', () => {
                const prefs = getPrefs();
                prefs.undoHistory = undoHistory.checked;
                savePrefs(prefs);
            });
        }

        if (inlineReview) {
            inlineReview.addEventListener('change', () => {
                const prefs = getPrefs();
                prefs.inlineParagraphReview = inlineReview.checked;
                savePrefs(prefs);
                applyEditorPrefs(prefs);
                if (typeof window.showToast === 'function') {
                    window.showToast(
                        inlineReview.checked
                            ? 'Revisión IA en párrafos activada'
                            : 'Revisión IA en párrafos desactivada',
                        'info'
                    );
                }
            });
        }
    }

    function populateEditorPrefs(getPrefs) {
        if (typeof getPrefs !== 'function') return;

        const prefs = getPrefs();
        const fontSize = document.getElementById('settingsEditorFontSize');
        const autosave = document.getElementById('settingsAutosave');
        const undoHistory = document.getElementById('settingsUndoHistory');
        const inlineReview = document.getElementById('settingsInlineReviewToggle');

        if (fontSize) fontSize.value = prefs.editorFontSize;
        if (autosave) autosave.checked = prefs.autosave;
        if (undoHistory) undoHistory.checked = prefs.undoHistory;
        if (inlineReview) inlineReview.checked = prefs.inlineParagraphReview !== false;
    }

    function startAutosave() {
        if (autosaveTimer) return;

        autosaveTimer = setInterval(() => {
            const editor = document.getElementById('mainEditor') || document.getElementById('editor');
            if (editor && editor.innerHTML && editor.innerHTML.length > 10) {
                if (typeof appDB !== 'undefined') appDB.set('autosave_draft', editor.innerHTML);
                localStorage.setItem('autosave_draft', editor.innerHTML);
                const ts = Date.now().toString();
                if (typeof appDB !== 'undefined') appDB.set('autosave_ts', ts);
                localStorage.setItem('autosave_ts', ts);
            }
        }, 30000);
    }

    function stopAutosave() {
        if (!autosaveTimer) return;
        clearInterval(autosaveTimer);
        autosaveTimer = null;
    }

    function restoreAutosaveDraft() {
        const draft = localStorage.getItem('autosave_draft');
        const ts = localStorage.getItem('autosave_ts');
        if (!draft || !ts) return false;

        const age = Date.now() - parseInt(ts, 10);
        if (age > 24 * 60 * 60 * 1000) return false;

        const editor = document.getElementById('mainEditor') || document.getElementById('editor');
        if (editor && (!editor.innerHTML || editor.innerHTML.length < 20)) {
            editor.innerHTML = draft;
            if (typeof window.showToast === 'function') {
                window.showToast('📝 Borrador restaurado automáticamente', 'info');
            }
            return true;
        }
        return false;
    }

    window.SettingsEditorPrefsUtils = {
        initEditorPrefs,
        populateEditorPrefs,
        applyEditorPrefs,
        restoreAutosaveDraft
    };
})();
