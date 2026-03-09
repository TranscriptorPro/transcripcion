// Settings Modal Shell Utils
// Encapsulates modal shell interactions: accordions, open/close, visibility by plan.
(function () {
    'use strict';

    function initAccordions() {
        document.querySelectorAll('.stg-accordion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const acc = btn.closest('.stg-accordion');
                if (!acc) return;
                acc.classList.toggle('open');
            });
        });
    }

    function initModalControls(options) {
        const opts = options || {};
        const onOpen = opts.onOpen;

        const overlay = document.getElementById('settingsModalOverlay');
        const closeBtn = document.getElementById('closeSettings');
        const btnSettings = document.getElementById('btnSettings');

        const openModal = () => {
            if (!overlay) return;
            document.querySelectorAll('.stg-accordion').forEach(a => a.classList.remove('open'));
            if (typeof onOpen === 'function') onOpen();
            overlay.classList.add('active');
        };

        const closeModal = () => {
            if (overlay) overlay.classList.remove('active');
        };

        if (btnSettings) btnSettings.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeModal();
            });
        }
    }

    function applyPlanVisibility() {
        const type = (typeof CLIENT_CONFIG !== 'undefined') ? CLIENT_CONFIG.type : 'ADMIN';
        const isAdmin = type === 'ADMIN';
        const isClinic = typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.canGenerateApps;

        function toggleAccordion(stgKey, visible) {
            const el = document.querySelector('.stg-accordion[data-stg="' + stgKey + '"]');
            if (el) el.style.display = visible ? '' : 'none';
        }

        const allSections = ['cuenta', 'apikey', 'workplace', 'profiles', 'pdf', 'editor', 'tools', 'theme', 'skins', 'stats', 'backup', 'info', 'about'];

        if (isAdmin) {
            allSections.forEach((key) => toggleAccordion(key, true));
            if (isClinic) toggleAccordion('profiles', false);
            if (isClinic) toggleAccordion('backup', false);
            return;
        }

        // K2: Cliente final ve solo datos profesionales, lugar de trabajo y soporte.
        const clientAllowed = ['cuenta', 'workplace', 'info'];
        allSections.forEach((key) => toggleAccordion(key, clientAllowed.includes(key)));
    }

    window.SettingsModalShellUtils = {
        initAccordions,
        initModalControls,
        applyPlanVisibility
    };
})();
