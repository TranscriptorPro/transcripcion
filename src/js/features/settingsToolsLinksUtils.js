// Settings Tools Links Utils
// Encapsulates settings tool-link actions (history/dictionary/shortcuts).
(function () {
    'use strict';

    function initToolsLinks(options) {
        const opts = options || {};
        const watchForClose = opts.watchForClose;
        const repopulateAndOpenSettings = opts.repopulateAndOpenSettings;

        const historyBtn = document.getElementById('settingsOpenHistory');
        const dictBtn = document.getElementById('settingsOpenDictionary');
        const shortcutsBtn = document.getElementById('settingsOpenShortcuts');
        const paymentsBtn = document.getElementById('settingsOpenPaymentsPortal');
        const overlay = document.getElementById('settingsModalOverlay');

        const reopenSettings = () => {
            if (typeof repopulateAndOpenSettings === 'function') {
                repopulateAndOpenSettings();
            }
        };

        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                if (overlay) overlay.classList.remove('active');
                const histOverlay = document.getElementById('reportHistoryOverlay');
                if (histOverlay) {
                    histOverlay.classList.add('active');
                    if (typeof watchForClose === 'function') watchForClose(histOverlay, reopenSettings);
                }
            });
        }

        if (dictBtn) {
            dictBtn.addEventListener('click', () => {
                if (overlay) overlay.classList.remove('active');
                if (typeof window.openMedDictModal === 'function') {
                    window.openMedDictModal({ skipEditorCheck: true, defaultTab: 'dictionary' });
                } else {
                    const dictModal = document.getElementById('medDictModal');
                    if (dictModal) dictModal.classList.add('active');
                }
                const dictModal = document.getElementById('medDictModal');
                if (dictModal && typeof watchForClose === 'function') {
                    watchForClose(dictModal, reopenSettings);
                }
            });
        }

        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', () => {
                if (overlay) overlay.classList.remove('active');
                const helpModal = document.getElementById('helpModal');
                if (helpModal) {
                    document.querySelectorAll('.help-tab').forEach(t => {
                        t.classList.toggle('active', t.dataset.helpTab === 'shortcuts');
                    });
                    document.querySelectorAll('.help-tab-content').forEach(p => p.classList.remove('active'));
                    const panel = document.querySelector('[data-help-panel="shortcuts"]');
                    if (panel) panel.classList.add('active');
                    helpModal.classList.add('active');
                    if (typeof watchForClose === 'function') watchForClose(helpModal, reopenSettings);
                }
            });
        }

        if (paymentsBtn) {
            paymentsBtn.addEventListener('click', () => {
                if (overlay) overlay.classList.remove('active');

                const medicoId = (window.CLIENT_CONFIG && window.CLIENT_CONFIG.medicoId)
                    ? String(window.CLIENT_CONFIG.medicoId)
                    : '';
                if (!medicoId) {
                    if (typeof showToast === 'function') showToast('No se encontró ID de médico para abrir pagos.', 'warning');
                    return;
                }

                const configuredPortal = (window.CLIENT_CONFIG && window.CLIENT_CONFIG.paymentPortalUrl)
                    ? String(window.CLIENT_CONFIG.paymentPortalUrl).trim()
                    : '';
                const fallbackPortal = (function () {
                    const rawPath = String(window.location.pathname || '');
                    const basePath = rawPath.replace(/index\.html?$/i, '');
                    return window.location.origin + basePath + 'recursos/registro.html';
                })();
                const portalBase = configuredPortal || fallbackPortal;
                const portalUrl = portalBase + '?id=' + encodeURIComponent(medicoId);

                const pOverlay = document.getElementById('paymentsPortalOverlay');
                const pFrame = document.getElementById('paymentsPortalFrame');
                const pClose = document.getElementById('paymentsPortalCloseBtn');
                const pNewTab = document.getElementById('paymentsPortalOpenNewTab');
                if (!pOverlay || !pFrame || !pClose || !pNewTab) {
                    window.open(portalUrl, '_blank');
                    return;
                }

                pFrame.src = portalUrl;
                pOverlay.style.display = 'block';

                const closePortal = () => {
                    pOverlay.style.display = 'none';
                    pFrame.src = '';
                    reopenSettings();
                };

                pClose.onclick = closePortal;
                pOverlay.onclick = (ev) => {
                    if (ev.target === pOverlay) closePortal();
                };
                pNewTab.onclick = () => window.open(portalUrl, '_blank');
            });
        }
    }

    window.SettingsToolsLinksUtils = {
        initToolsLinks
    };
})();
