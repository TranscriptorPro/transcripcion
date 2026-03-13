// Settings Workplace Utils
// Encapsulates workplace and PDF config navigation actions from settings panel.
(function () {
    'use strict';

    function initWorkplaceSection() {
        const btn = document.getElementById('settingsChangeWorkplace');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const overlay = document.getElementById('settingsModalOverlay');
            if (overlay) overlay.classList.remove('active');
            if (typeof window.openSessionAssistant === 'function') {
                window.openSessionAssistant();
            }
        });
    }

    function populateWorkplace() {
        const el = document.getElementById('settingsCurrentWorkplace');
        if (!el) return;
        const wpName = localStorage.getItem('current_workplace_name');
        el.textContent = wpName || 'No seleccionado';
    }

    function initPdfConfigLink() {
        const btn = document.getElementById('settingsOpenPdfConfig');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const overlay = document.getElementById('settingsModalOverlay');
            if (overlay) overlay.classList.remove('active');
            if (typeof window.openPdfConfigModal === 'function') {
                window.openPdfConfigModal();
            } else {
                const pdfOverlay = document.getElementById('pdfModalOverlay');
                if (pdfOverlay) pdfOverlay.classList.add('active');
            }
        });
    }

    window.SettingsWorkplaceUtils = {
        initWorkplaceSection,
        populateWorkplace,
        initPdfConfigLink
    };
})();
