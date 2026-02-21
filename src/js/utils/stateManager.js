// ============ MODE SELECTOR (PRO/NORMAL) & STATE MANAGER ============

window.updateButtonsVisibility = function (state) {
    window.appState = state;

    const structureBtn           = document.getElementById('structureBtn');
    const downloadPdfBtn         = document.getElementById('downloadPdfBtn');
    const btnConfigPdfMain       = document.getElementById('btnConfigPdfMain');
    const btnPreviewPdfMain      = document.getElementById('btnPreviewPdfMain');
    const copyBtn                = document.getElementById('copyBtn');
    const downloadBtn            = document.getElementById('downloadBtn');
    const downloadBtnContainer   = document.getElementById('downloadBtnContainer');
    const btnStructureAI         = document.getElementById('btnStructureAI');
    const normalTemplateSelect   = document.getElementById('normalTemplateSelect');
    const btnApplyTemplate       = document.getElementById('btnApplyTemplate');

    const isTranscribed  = ['TRANSCRIBED', 'STRUCTURED', 'PREVIEWED'].includes(state);
    const isStructured   = ['STRUCTURED', 'PREVIEWED'].includes(state);
    const isProMode      = window.currentMode === 'pro';
    const isNormalMode   = isTranscribed && !isProMode;

    // btnStructureAI: visible in pro mode after transcription
    if (btnStructureAI) {
        btnStructureAI.style.display = (isTranscribed && isProMode) ? 'inline-flex' : 'none';
        btnStructureAI.disabled = !isTranscribed;
    }

    // Normal mode template controls
    if (normalTemplateSelect) {
        normalTemplateSelect.style.display = isNormalMode ? 'inline-block' : 'none';
    }
    if (btnApplyTemplate) {
        btnApplyTemplate.style.display = isNormalMode ? 'inline-flex' : 'none';
    }

    // PDF buttons: visible after transcription
    if (btnConfigPdfMain) {
        btnConfigPdfMain.style.display = isTranscribed ? 'inline-flex' : 'none';
        btnConfigPdfMain.disabled = !isTranscribed;
    }
    if (btnPreviewPdfMain) {
        btnPreviewPdfMain.style.display = isTranscribed ? 'inline-flex' : 'none';
        btnPreviewPdfMain.disabled = !isTranscribed;
    }

    // Copy & Download: visible after transcription
    if (copyBtn) {
        copyBtn.style.display = isTranscribed ? 'inline-flex' : 'none';
        copyBtn.disabled = !isTranscribed;
    }
    if (downloadBtnContainer) {
        downloadBtnContainer.style.display = isTranscribed ? 'block' : 'none';
    }
    if (downloadBtn) {
        downloadBtn.disabled = !isTranscribed;
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
};

const proModeToggle = document.getElementById('proModeToggle');
const proToggleContainer = document.getElementById('proToggleContainer');
const resetBtn = document.getElementById('resetBtn');

if (proModeToggle) {
    proModeToggle.addEventListener('change', (e) => {
        const mode = e.target.checked ? 'pro' : 'normal';
        setMode(mode, true);
        localStorage.setItem('last_profile_type', mode);

        if (proToggleContainer) {
            proToggleContainer.classList.toggle('mode-normal', !e.target.checked);
        }
    });
}

function setMode(mode, notify = false) {
    window.currentMode = mode;
    const templateDropdown = document.getElementById('templateDropdownMain');
    const templateDivider = document.getElementById('templateDivider');
    const templateSelectorContainer = document.getElementById('templateSelectorContainer'); // may not be on all views

    if (proModeToggle) proModeToggle.checked = (mode === 'pro');
    if (proToggleContainer) {
        proToggleContainer.classList.toggle('mode-normal', mode === 'normal');
    }

    if (mode === 'normal') {
        if (templateSelectorContainer) templateSelectorContainer.style.display = 'none';
        if (templateDropdown) templateDropdown.style.display = 'none';
        if (templateDivider) templateDivider.style.display = 'none';
        if (notify && typeof showToast !== 'undefined') showToast('Modo Normal activado', 'info');
    } else {
        if (templateDropdown) templateDropdown.style.display = 'inline-block';
        if (templateDivider) templateDivider.style.display = 'block';
        if (notify && typeof showToast !== 'undefined') showToast('Modo Pro ✨ activado', 'success');
    }

    if (typeof updateButtonsVisibility !== 'undefined' && typeof appState !== 'undefined') {
        updateButtonsVisibility(appState);
    }
    updateUIByMode();
}

function initializeMode() {
    if (typeof CLIENT_CONFIG === 'undefined') return;

    // Check saved preference first
    const savedMode = localStorage.getItem('last_profile_type');
    if (savedMode) {
        setMode(savedMode);
        return;
    }

    const isAdminOrPro = ['ADMIN', 'PRO', 'TRIAL'].includes(CLIENT_CONFIG.type);
    if (isAdminOrPro) {
        setMode('pro');
    } else {
        setMode('normal');
        if (proModeToggle) {
            proModeToggle.disabled = true;
            const sw = proModeToggle.closest('.pro-toggle-switch');
            if (sw) { sw.style.opacity = '0.5'; sw.style.cursor = 'not-allowed'; }
        }
    }
}


// Template Global Sync Listeners
const templateSelect = document.getElementById('templateSelect');
const templateDropdownMain = document.getElementById('templateDropdownMain');

if (templateSelect) {
    templateSelect.addEventListener('change', (e) => {
        window.selectedTemplate = e.target.value;
        if (templateDropdownMain) templateDropdownMain.value = e.target.value;
        if (typeof showToast !== 'undefined') showToast(`Plantilla: ${templateSelect.options[templateSelect.selectedIndex].text}`, 'success');
    });
}

if (templateDropdownMain) {
    templateDropdownMain.addEventListener('change', (e) => {
        window.selectedTemplate = e.target.value;
        if (templateSelect) templateSelect.value = e.target.value;
        if (typeof showToast !== 'undefined') showToast(`Plantilla: ${e.target.options[e.target.selectedIndex].text}`, 'success');
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
        // Reset globals
        window.uploadedFiles = [];
        window.transcriptions = [];
        window.activeTabIndex = 0;
        window.isProcessing = false;

        // Reset editor
        const editor = document.getElementById('editor');
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

        if (typeof disableButtons === 'function') disableButtons();

        const processingStatus = document.getElementById('processingStatus');
        if (processingStatus) processingStatus.classList.remove('active');

        // Hide Wizard Step 2 & Metadata
        const wizardTemplateCard = document.getElementById('wizardTemplateCard');
        if (wizardTemplateCard) wizardTemplateCard.style.display = 'none';

        const reportMetadataCard = document.getElementById('reportMetadataCard');
        if (reportMetadataCard) reportMetadataCard.style.display = 'none';

        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('IDLE');
        if (typeof showToast !== 'undefined') showToast('Limpiado ✓', 'success');
    });
}

// Buttons helpers mappings
window.enableButtons = function () {
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    if (copyBtn) copyBtn.disabled = false;
    if (downloadBtn) downloadBtn.disabled = false;
}

window.disableButtons = function () {
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    if (copyBtn) copyBtn.disabled = true;
    if (downloadBtn) downloadBtn.disabled = true;
}
