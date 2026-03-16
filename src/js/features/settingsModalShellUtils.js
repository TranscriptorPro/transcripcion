// Settings Modal Shell Utils
// Encapsulates modal shell interactions: accordions, open/close, visibility by plan.
(function () {
    'use strict';

    function initAccordions() {
        document.querySelectorAll('.stg-accordion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const acc = btn.closest('.stg-accordion');
                if (!acc) return;
                const wasOpen = acc.classList.contains('open');
                // Cerrar todos los demás
                document.querySelectorAll('.stg-accordion.open').forEach(a => {
                    if (a !== acc) a.classList.remove('open');
                });
                acc.classList.toggle('open', !wasOpen);
                // Si se abrió, hacer scroll para que el botón quede arriba del modal
                if (!wasOpen) {
                    setTimeout(() => {
                        const body = acc.closest('.settings-body');
                        if (body) {
                            body.scrollTo({ top: acc.offsetTop - 8, behavior: 'smooth' });
                        } else {
                            acc.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 30);
                }
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

        const allSections = ['cuenta', 'apikey', 'workplace', 'profiles', 'pdf', 'editor', 'tools', 'theme', 'skins', 'stats', 'backup', 'info', 'update', 'about'];

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
