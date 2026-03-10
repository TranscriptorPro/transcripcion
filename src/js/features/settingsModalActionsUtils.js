// Settings Modal Actions Utils
// Encapsulates click handlers for Info and Upgrade actions in settings modal.
(function () {
    'use strict';

    function initUpgradeButton(options) {
        const opts = options || {};
        const watchForClose = opts.watchForClose;
        const repopulateAndOpenSettings = opts.repopulateAndOpenSettings;

        const btn = document.getElementById('settingsUpgradePlan');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const overlay = document.getElementById('settingsModalOverlay');
            if (overlay) overlay.classList.remove('active');

            if (typeof window.openPricingCart === 'function') {
                window.openPricingCart();
                const pricingOverlay = document.getElementById('pricingModalOverlay');
                if (pricingOverlay && typeof watchForClose === 'function') {
                    watchForClose(pricingOverlay, () => {
                        if (typeof repopulateAndOpenSettings === 'function') {
                            repopulateAndOpenSettings();
                        }
                    });
                }
            }
        });
    }

    function initInfoSection(options) {
        const opts = options || {};
        const watchForClose = opts.watchForClose;
        const repopulateAndOpenSettings = opts.repopulateAndOpenSettings;

        const contactBtn = document.getElementById('settingsContactSupport');
        if (contactBtn) {
            contactBtn.addEventListener('click', () => {
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.classList.remove('active');
                const btnContacto = document.getElementById('btnContacto');
                if (btnContacto) btnContacto.click();
            });
        }

        const helpBtn = document.getElementById('settingsOpenHelp');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.classList.remove('active');
                const helpModal = document.getElementById('helpModal');
                if (!helpModal) return;

                document.querySelectorAll('.help-tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.helpTab === 'guide');
                });
                document.querySelectorAll('.help-tab-content').forEach(p => p.classList.remove('active'));
                const panel = document.querySelector('[data-help-panel="guide"]');
                if (panel) panel.classList.add('active');
                helpModal.classList.add('active');

                if (typeof watchForClose === 'function') {
                    watchForClose(helpModal, () => {
                        if (typeof repopulateAndOpenSettings === 'function') {
                            repopulateAndOpenSettings();
                        }
                    });
                }
            });
        }

        const autoTourToggle = document.getElementById('settingsAutoTourToggle');
        if (autoTourToggle) {
            const syncAutoTourToggle = async () => {
                if (typeof window.getAutoTourEnabled === 'function') {
                    autoTourToggle.checked = !!(await window.getAutoTourEnabled());
                }
            };

            syncAutoTourToggle();
            autoTourToggle.addEventListener('change', () => {
                if (typeof window.setAutoTourEnabled === 'function') {
                    window.setAutoTourEnabled(!!autoTourToggle.checked);
                }
                if (typeof showToast === 'function') {
                    showToast(
                        autoTourToggle.checked ? '✅ Tutorial automático activado' : 'ℹ️ Tutorial automático desactivado',
                        'success',
                        2000
                    );
                }
            });
        }

        const startTourNowBtn = document.getElementById('settingsStartTourNow');
        if (startTourNowBtn) {
            startTourNowBtn.addEventListener('click', () => {
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.classList.remove('active');
                if (typeof window.startGuideTour === 'function') {
                    setTimeout(() => window.startGuideTour(), 150);
                }
            });
        }

        const restartTourNowBtn = document.getElementById('settingsRestartTourNow');
        if (restartTourNowBtn) {
            restartTourNowBtn.addEventListener('click', () => {
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.classList.remove('active');
                if (typeof window.restartGuideTour === 'function') {
                    setTimeout(() => window.restartGuideTour(), 150);
                } else if (typeof window.startGuideTour === 'function') {
                    setTimeout(() => window.startGuideTour(), 150);
                }
            });
        }
    }

    window.SettingsModalActionsUtils = {
        initUpgradeButton,
        initInfoSection
    };
})();
