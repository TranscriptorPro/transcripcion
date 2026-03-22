// ============ BUSINESS CLIENT/ADMIN FLOW HELPERS ============

// Datos de prueba para admin (actualmente inicio limpio)
function _loadAdminTestData() {
    // No-op: ya no se cargan datos ficticios automaticamente.
    // Ver documentacion/DATOS_DEMO.js para los datos originales.
    console.log('[Admin] Inicio limpio — sin datos de prueba pre-cargados');
}

// Reset app (solo admin)
function _initResetApp() {
    const modal = document.getElementById('resetAppModal');
    const btnOpen = document.getElementById('btnResetApp');
    const btnClose = document.getElementById('btnCloseResetModal');
    const btnCancel = document.getElementById('btnCancelResetApp');
    const btnConfirm = document.getElementById('btnConfirmResetApp');
    if (!modal) return;

    const openModal = () => modal.classList.add('active');
    const closeModal = () => modal.classList.remove('active');

    btnOpen?.addEventListener('click', openModal);
    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    btnConfirm?.addEventListener('click', () => {
        // Claves a borrar (se conserva: groq_api_key, app_theme, onboarding_date)
        const keysToRemove = [
            'workplace_profiles',
            'prof_data',
            'patient_registry',
            'patient_history',
            'pdf_config',
            'pdf_logo',
            'pdf_signature',
            'onboarding_accepted',
            'output_profiles',
        ];
        // Borrar tambien todos los contadores de informe (report_counter_YYYY)
        if (typeof appDB !== 'undefined') {
            Object.keys(localStorage)
                .filter(k => /^report_counter_/.test(k))
                .forEach(k => { appDB.remove(k); localStorage.removeItem(k); });
            keysToRemove.forEach(k => appDB.remove(k));
            // Limpiar caches de ventana
            window._pdfConfigCache = null;
            window._profDataCache = null;
            window._wpProfilesCache = null;
        } else {
            Object.keys(localStorage)
                .filter(k => /^report_counter_/.test(k))
                .forEach(k => localStorage.removeItem(k));
        }

        keysToRemove.forEach(k => localStorage.removeItem(k));

        closeModal();
        if (typeof showToast === 'function') showToast('✅ App reseteada. Recargando...', 'success');
        setTimeout(() => location.reload(), 1200);
    });
}

// Flujo CLIENTE (NORMAL / PRO / TRIAL)
function _initClient() {
    // K2: ocultar panel de API Key y boton admin para clientes
    const apiKeyCard = document.getElementById('adminApiKeyCard');
    if (apiKeyCard) apiKeyCard.style.display = 'none';
    const btnAdminAccess = document.getElementById('btnAdminAccess');
    if (btnAdminAccess) btnAdminAccess.style.display = 'none';

    // Contacto debe estar disponible para no-admin incluso antes de aceptar onboarding.
    if (typeof initContact === 'function') initContact();

    // K1: el criterio de primer uso es la aceptacion de T&C, NO la ausencia de datos.
    // Los datos (nombre, matricula, API key) los precarga el admin antes de entregar la app.
    const accepted = localStorage.getItem('onboarding_accepted');
    if (!accepted) {
        _showClientOnboarding();
        return; // los modulos se inicializan dentro del handler de aceptacion
    }

    // Ya acepto T&C: inicializar con los datos precargados por el admin
    const profData = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
    window.GROQ_API_KEY = (typeof window.getResolvedGroqApiKey === 'function')
        ? window.getResolvedGroqApiKey()
        : (window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '');
    _initCommonModules();

    try {
        if (typeof applyProfessionalData === 'function') applyProfessionalData(profData);
        if (typeof updatePersonalization === 'function') updatePersonalization(profData);
        if (typeof initializeMode === 'function') initializeMode();
    } catch (e) {
        console.error('Error inicializando datos cliente:', e);
    }

    // Settings gear button
    _showSettingsGear();

    const onboardingOverlay = document.getElementById('onboardingOverlay');
    if (onboardingOverlay) onboardingOverlay.classList.remove('active');

    // ── CLINIC: mostrar modal de login por profesional antes del session assistant ──
    let planCode = String((window.CLIENT_CONFIG && (window.CLIENT_CONFIG.planCode || window.CLIENT_CONFIG.plan)) || '').toLowerCase();
    if (!planCode && window.CLIENT_CONFIG && window.CLIENT_CONFIG.canGenerateApps === true) {
        planCode = 'clinic';
    }

    let looksClinicByProfessionals = false;
    try {
        const wpProbe = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        looksClinicByProfessionals = Array.isArray(wpProbe) && wpProbe.some(function(wp) {
            return Array.isArray(wp && wp.professionals) && wp.professionals.length > 1;
        });
    } catch (_) {}

    const isClinicMode = planCode === 'clinic' || looksClinicByProfessionals;

    if (isClinicMode && typeof window.ClinicAuth !== 'undefined') {
        let clinicProfessionals = [];
        try {
            const wp = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
            clinicProfessionals = (wp[0] && wp[0].professionals) || [];
        } catch (_) {}

        window.ClinicAuth.init(clinicProfessionals, function(activePro) {
            // Post-login: session assistant + PWA prompt
            _launchSessionAssistant();
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                _tryPwaInstall(3);
            }
        });

        if (typeof window.ClinicAuth.setupChangeProfButton === 'function') {
            window.ClinicAuth.setupChangeProfButton();
        }
        if (typeof window.ClinicAdminPanel !== 'undefined' &&
            typeof window.ClinicAdminPanel.setup === 'function') {
            window.ClinicAdminPanel.setup();
        }
        return; // session assistant se lanza desde el callback de ClinicAuth.init
    }

    // Session Assistant — se abre cada vez que carga la app
    _launchSessionAssistant();

    // PWA: ofrecer instalar la app en cada visita (si no esta instalada todavia)
    if (!window.matchMedia('(display-mode: standalone)').matches) {
        _tryPwaInstall(3);
    }
}

// Modulos comunes (admin + cliente)
function _initCommonModules() {
    // SIEMPRE cargar API Key desde localStorage (puede haber sido guardada por factory setup)
    const storedKey = (typeof window.getResolvedGroqApiKey === 'function')
        ? window.getResolvedGroqApiKey()
        : (localStorage.getItem('groq_api_key') || '');
    if (storedKey && !window.GROQ_API_KEY) {
        window.GROQ_API_KEY = storedKey;
    }

    if (typeof initTheme === 'function') initTheme();
    if (typeof updateApiStatus === 'function') updateApiStatus(storedKey || window.GROQ_API_KEY);
    if (typeof populateTemplateDropdown === 'function') populateTemplateDropdown();

    if (typeof initModals === 'function') initModals();
    if (typeof initShortcuts === 'function') initShortcuts();
    if (typeof initApiManagement === 'function') initApiManagement();
    if (typeof initWorkplaceManagement === 'function') initWorkplaceManagement();
    if (typeof initOutputProfiles === 'function') initOutputProfiles();
    if (typeof initStructurer === 'function') initStructurer();
    if (typeof initContact === 'function') initContact();
    if (typeof initDiagnostic === 'function') initDiagnostic();
    if (typeof initDatosPanel === 'function') initDatosPanel();
    if (typeof initLicenseManager === 'function') initLicenseManager();
}
