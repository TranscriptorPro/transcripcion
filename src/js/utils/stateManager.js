// ============ MODE SELECTOR (PRO/NORMAL) & STATE MANAGER ============

/**
 * Detecta si el HTML del editor parece un informe ya estructurado.
 * Criterio: contiene encabezados (h1-h4) o al menos 2 secciones con <strong>.
 */
window.detectEditorState = function (html) {
    if (!html || html.trim().length < 50) return 'IDLE';
    const hasHeadings = /<h[1-4]\b/i.test(html);
    const strongCount = (html.match(/<strong\b/gi) || []).length;
    return (hasHeadings || strongCount >= 2) ? 'STRUCTURED' : 'TRANSCRIBED';
};

window.updateButtonsVisibility = function (state) {
    window.appState = state;

    const structureBtn           = document.getElementById('structureBtn');
    const downloadPdfBtn         = document.getElementById('downloadPdfBtn');
    const btnConfigPdfMain       = document.getElementById('btnConfigPdfMain');
    const copyBtn                = document.getElementById('copyBtn');
    const printBtn               = document.getElementById('printBtn');
    const downloadBtn            = document.getElementById('downloadBtn');
    const downloadBtnContainer   = document.getElementById('downloadBtnContainer');
    const btnStructureAI         = document.getElementById('btnStructureAI');
    const btnApplyTemplate       = document.getElementById('btnApplyTemplate');
    const applyTemplateWrapper   = document.getElementById('applyTemplateWrapper');
    const inlineReviewQuickCtrl  = document.getElementById('inlineReviewQuickControl');

    const isStructuring  = state === 'STRUCTURING';
    const isTranscribed  = ['TRANSCRIBED', 'STRUCTURED', 'PREVIEWED'].includes(state);
    const isStructured   = ['STRUCTURED', 'PREVIEWED'].includes(state);
    const isProMode      = window.currentMode === 'pro'
        || (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'PRO');
    const hasAdvancedPlan = (typeof CLIENT_CONFIG !== 'undefined'
        && (CLIENT_CONFIG.type === 'PRO' || CLIENT_CONFIG.type === 'ADMIN'));
    const isNormalMode   = isTranscribed && !isProMode;

    // btnStructureAI: visible in pro mode after transcription, hidden after structuring
    if (btnStructureAI) {
        const showStructureBtn = isTranscribed && isProMode && !isStructured;
        btnStructureAI.style.display = showStructureBtn ? 'inline-flex' : 'none';
        btnStructureAI.disabled = !isTranscribed;
    }

    // btnCompareView: visible after structuring (need both original + structured)
    const btnCompareView = document.getElementById('btnCompareView');
    if (btnCompareView) {
        btnCompareView.style.display = isStructured ? '' : 'none';
        // Exit comparison if going back to a non-structured state
        if (!isStructured && window._isComparisonMode && typeof window.exitComparisonMode === 'function') {
            window.exitComparisonMode();
        }
    }

    const editorEl = document.getElementById('editor');
    const looksStructuredByDom = !!(editorEl && editorEl.querySelector('h1, h2, h3, h4, .report-h1, .report-h2, .report-h3, .section-header, strong'));

    // Toggle rápido de revisión IA: visible con estructura detectada (estado o DOM) para planes avanzados.
    if (inlineReviewQuickCtrl) {
        inlineReviewQuickCtrl.style.display = ((isStructured || looksStructuredByDom) && hasAdvancedPlan) ? 'flex' : 'none';
    }

    // Normal mode template controls
    if (applyTemplateWrapper) {
        applyTemplateWrapper.style.display = isNormalMode ? 'inline-block' : 'none';
    }
    if (btnApplyTemplate) {
        btnApplyTemplate.style.display = isNormalMode ? 'inline-flex' : 'none';
    }

    // PDF buttons: visible after transcription
    if (btnConfigPdfMain) {
        btnConfigPdfMain.style.display = (isTranscribed && !isStructuring) ? 'inline-flex' : 'none';
        btnConfigPdfMain.disabled = !isTranscribed || isStructuring;
        // Actualizar semáforo de completitud al mostrar el botón
        if (isTranscribed && !isStructuring && typeof updateConfigTrafficLight === 'function') {
            updateConfigTrafficLight();
        }
    }
    // Selector rápido de perfil de salida:
    // Admin: siempre visible tras transcripción
    // Clones: solo visible si omitió el Session Assistant (fallback)
    const quickProfileSelector = document.getElementById('quickProfileSelector');
    if (quickProfileSelector) {
        const isAdmin = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN');
        const saCompleted = (typeof sessionStorage !== 'undefined') && sessionStorage.getItem('session_configured') === '1';
        if (isAdmin) {
            quickProfileSelector.style.display = isTranscribed ? 'inline-block' : 'none';
        } else {
            // Clones: ocultar si ya usó el SA; mostrar como fallback si lo omitió
            quickProfileSelector.style.display = (isTranscribed && !saCompleted) ? 'inline-block' : 'none';
        }
    }

    // Copy & Download: visible after transcription
    if (copyBtn) {
        copyBtn.style.display = (isTranscribed && !isStructuring) ? 'inline-flex' : 'none';
        copyBtn.disabled = !isTranscribed || isStructuring;
    }
    if (printBtn) {
        printBtn.style.display = (isTranscribed && !isStructuring) ? 'inline-flex' : 'none';
        printBtn.disabled = !isTranscribed || isStructuring;
    }
    if (downloadBtnContainer) {
        downloadBtnContainer.style.display = (isTranscribed && !isStructuring) ? 'block' : 'none';
    }
    if (downloadBtn) {
        downloadBtn.disabled = !isTranscribed || isStructuring;
    }
    const downloadBtnMain = document.getElementById('downloadBtnMain');
    if (downloadBtnMain) {
        downloadBtnMain.disabled = !isTranscribed || isStructuring;
    }

    // downloadPdfBtn (separate button, if present)
    if (downloadPdfBtn) {
        downloadPdfBtn.style.display = isStructured ? 'inline-flex' : 'none';
        downloadPdfBtn.disabled = !isStructured;
    }

    // structureBtn (sidebar/wizard button, if present)
    if (structureBtn) {
        structureBtn.disabled = !isTranscribed;
    }

    // Botón "Transcribir y Estructurar" (Pro only): visible en Pro mode, sync disabled con transcribeBtn
    const tAndSBtn = document.getElementById('transcribeAndStructureBtn');
    if (tAndSBtn) {
        tAndSBtn.style.display = isProMode ? '' : 'none';
        // Solo habilitar si transcribeBtn está habilitado (hay archivos pendientes)
        const tBtn = document.getElementById('transcribeBtn');
        tAndSBtn.disabled = tBtn ? tBtn.disabled : true;
    }

    // Botón "Continuar grabando" (Pro only): insertado inline en el editor
    if (typeof window._insertInlineAppendBtn === 'function') {
        window._insertInlineAppendBtn();
    }

    // Botón "Original" — visible tras estructurar para alternar vista
    const btnRestoreOriginal = document.getElementById('btnRestoreOriginal');
    if (btnRestoreOriginal) {
        btnRestoreOriginal.style.display = isStructured ? '' : 'none';
    }

    // Botón diccionario médico: visible tras transcripción
    const btnMedicalCheck = document.getElementById('btnMedicalCheck');
    if (btnMedicalCheck) {
        btnMedicalCheck.style.display = (isTranscribed && !isStructuring) ? '' : 'none';
    }

    if (typeof window.updateProSourceModeUI === 'function') {
        window.updateProSourceModeUI();
    }
};

const proModeToggle = document.getElementById('proModeToggle');
const proToggleContainer = document.getElementById('proToggleContainer');
const resetBtn = document.getElementById('resetBtn');

// ── Cache para last_profile_type ──────────────────────────────────────────
if (typeof appDB !== 'undefined') {
    appDB.get('last_profile_type').then(function(v) { if (v) window._lastProfileTypeCache = v; }).catch(function() {});
}
if (proModeToggle) {
    proModeToggle.addEventListener('change', (e) => {
        const mode = e.target.checked ? 'pro' : 'normal';
        setMode(mode, true);
        // Persist sync first so initializeMode can read it immediately on reload.
        localStorage.setItem('last_profile_type', mode);
        if (typeof appDB !== 'undefined') appDB.set('last_profile_type', mode);
        window._lastProfileTypeCache = mode;

        if (proToggleContainer) {
            proToggleContainer.classList.toggle('mode-normal', !e.target.checked);
        }
    });
}

function setMode(mode, notify = false) {
    window.currentMode = mode;
    const templateSelectorContainer = document.getElementById('templateSelectorContainer'); // may not be on all views

    if (proModeToggle) proModeToggle.checked = (mode === 'pro');
    if (proToggleContainer) {
        proToggleContainer.classList.toggle('mode-normal', mode === 'normal');
    }

    if (mode === 'normal') {
        if (templateSelectorContainer) templateSelectorContainer.style.display = 'none';
        if (notify && typeof showToast !== 'undefined') showToast('🔄 Modo Normal activado', 'success');
    } else {
        if (notify && typeof showToast !== 'undefined') showToast('Modo Pro ✨ activado', 'success');
    }

    if (typeof updateButtonsVisibility !== 'undefined') {
        updateButtonsVisibility(window.appState || 'IDLE');
    }
    updateUIByMode();
    if (typeof window.updateProSourceModeUI === 'function') {
        window.updateProSourceModeUI();
    }
}

function initializeMode() {
    if (typeof CLIENT_CONFIG === 'undefined') return;

    // Check saved preference first
    // PRO clones are ALWAYS pro — ignore any saved preference
    if (CLIENT_CONFIG.type === 'PRO') {
        setMode('pro');
        if (proToggleContainer) proToggleContainer.style.display = 'none';
        return;
    }

    const savedMode = localStorage.getItem('last_profile_type') || window._lastProfileTypeCache;
    if (savedMode) {
        setMode(savedMode);
        return;
    }

    const isAdminOrPro = ['ADMIN', 'PRO', 'TRIAL'].includes(CLIENT_CONFIG.type);
    if (isAdminOrPro) {
        setMode('pro');
        // PRO users (Gift/Clinic/Enterprise) are always PRO — hide the toggle entirely
        if (CLIENT_CONFIG.type === 'PRO' && proToggleContainer) {
            proToggleContainer.style.display = 'none';
        }
    } else {
        setMode('normal');
        // NORMAL users: toggle habilitado para probar Modo Pro temporalmente
        if (proModeToggle) {
            proModeToggle.disabled = false;
        }
    }
}


// Template Global Sync Listeners
const templateSelect = document.getElementById('templateSelect');

if (templateSelect) {
    templateSelect.addEventListener('change', (e) => {
        window.selectedTemplate = e.target.value;
        if (typeof showToast !== 'undefined') showToast(`Plantilla: ${templateSelect.options[templateSelect.selectedIndex].text}`, 'success');
    });
}

function updateUIByMode() {
    // Visual feedback of the current mode
    if (window.currentMode === 'pro') {
        document.body.style.borderTop = "4px solid var(--primary)";
    } else {
        document.body.style.borderTop = "none";
    }
}

// Global UI Reset
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        // RC-3: Bloquear reset mientras se procesa
        if (window.isProcessing || window._structuring) {
            if (typeof showToast !== 'undefined') showToast('⏳ Esperá a que termine el proceso actual', 'warning');
            return;
        }

        // RA-4: Guardar snapshot del editor para undo temporal
        const editor = document.getElementById('editor');
        const editorContent = editor ? editor.innerHTML : '';
        const hadContent = editor && editor.innerText.trim().length > 50;
        const savedAutosave = hadContent ? localStorage.getItem('editor_autosave') : null;
        const savedAutosaveMeta = hadContent ? localStorage.getItem('editor_autosave_meta') : null;

        // Revoke audio URLs and stop playback
        window.uploadedFiles.forEach(item => {
            if (item._audio) item._audio.pause();
            if (item.audioUrl) URL.revokeObjectURL(item.audioUrl);
        });
        if (window._currentAudio) {
            window._currentAudio = null;
            window._currentPlayBtn = null;
        }
        // Reset globals
        window.uploadedFiles = [];
        window.transcriptions = [];
        window.activeTabIndex = 0;
        window.isProcessing = false;

        // Exit comparison mode if active
        if (window._isComparisonMode && typeof window.exitComparisonMode === 'function') {
            window.exitComparisonMode();
        }

        // Reset editor
        if (editor) editor.innerHTML = '';

        // Reset inputs
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';

        // Update components if available
        if (typeof updateFileList === 'function') updateFileList();
        if (typeof createTabs === 'function') createTabs();
        if (typeof updateWordCount === 'function') updateWordCount();

        // Disable action buttons
        const transcribeBtn = document.getElementById('transcribeBtn');
        if (transcribeBtn) transcribeBtn.disabled = true;
        const tAndSReset = document.getElementById('transcribeAndStructureBtn');
        if (tAndSReset) tAndSReset.disabled = true;

        if (typeof disableButtons === 'function') disableButtons();

        const processingStatus = document.getElementById('processingStatus');
        if (processingStatus) processingStatus.classList.remove('active');

        // Hide Wizard Step 2 & Metadata
        const wizardTemplateCard = document.getElementById('wizardTemplateCard');
        if (wizardTemplateCard) wizardTemplateCard.style.display = 'none';

        const reportMetadataCard = document.getElementById('reportMetadataCard');
        if (reportMetadataCard) reportMetadataCard.style.display = 'none';

        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('IDLE');

        // Re-asegurar que la API key siga visible en la UI tras el reset
        if (typeof updateApiStatus === 'function') updateApiStatus();

        // RA-4: Toast con opción de deshacer (7 segundos)
        if (hadContent && typeof showToastWithAction === 'function') {
            showToastWithAction('🗑️ Sesión limpiada', 'success', '↩ Deshacer', () => {
                if (editor) editor.innerHTML = editorContent;
                // Restaurar autosave si existía
                if (savedAutosave) {
                    if (typeof appDB !== 'undefined') appDB.set('editor_autosave', savedAutosave);
                    else localStorage.setItem('editor_autosave', savedAutosave);
                }
                if (savedAutosaveMeta) {
                    if (typeof appDB !== 'undefined') appDB.set('editor_autosave_meta', savedAutosaveMeta);
                    else localStorage.setItem('editor_autosave_meta', savedAutosaveMeta);
                }
                if (typeof updateWordCount === 'function') updateWordCount();
                const undoState = typeof detectEditorState === 'function' ? detectEditorState(editorContent) : 'TRANSCRIBED';
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility(undoState);
                if (typeof showToast !== 'undefined') showToast('↩ Sesión restaurada', 'success');
            }, 7000);
        } else {
            if (typeof showToast !== 'undefined') showToast('Limpiado ✓', 'success');
        }
    });
}

// Buttons helpers mappings
window.enableButtons = function () {
    const ids = ['copyBtn', 'printBtn', 'downloadBtn', 'downloadBtnMain',
                 'structureBtn', 'downloadPdfBtn', 'btnConfigPdfMain'];
    ids.forEach(id => { const b = document.getElementById(id); if (b) b.disabled = false; })
}

window.disableButtons = function () {
    const ids = ['copyBtn', 'printBtn', 'downloadBtn', 'downloadBtnMain',
                 'structureBtn', 'downloadPdfBtn', 'btnConfigPdfMain'];
    ids.forEach(id => { const b = document.getElementById(id); if (b) b.disabled = true; });
}
