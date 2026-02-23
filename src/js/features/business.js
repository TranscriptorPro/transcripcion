
// ============ WORKPLACE PROFILES ============
window.initWorkplaceManagement = function () {
    let workplaceProfiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');

    function populateWorkplaceDropdown() {
        const sel = document.getElementById('pdfWorkplace');
        const quick = document.getElementById('quickWorkplaceSelector');
        if (!sel && !quick) return;
        const current = sel?.value;
        if (sel) sel.innerHTML = '<option value="">Seleccionar lugar...</option>';
        if (quick) quick.innerHTML = '<option value="">🏥 Lugar de trabajo</option>';
        workplaceProfiles.forEach((p, i) => {
            const label = p.name || `Lugar ${i + 1}`;
            if (sel) {
                const opt = document.createElement('option');
                opt.value = i; opt.textContent = label;
                sel.appendChild(opt);
            }
            if (quick) {
                const opt = document.createElement('option');
                opt.value = i; opt.textContent = label;
                quick.appendChild(opt);
            }
        });
        if (sel && current !== '') sel.value = current;
    }

    function loadWorkplaceProfile(index) {
        const profile = workplaceProfiles[index];
        if (!profile) return;
        const addr = document.getElementById('pdfWorkplaceAddress');
        const phone = document.getElementById('pdfWorkplacePhone');
        const email = document.getElementById('pdfWorkplaceEmail');
        const logo = document.getElementById('pdfLogoPreview');
        if (addr) addr.value = profile.address || '';
        if (phone) phone.value = profile.phone || '';
        if (email) email.value = profile.email || '';
        if (logo && profile.logo && profile.logo.startsWith('data:image/')) {
            logo.innerHTML = `<img src="${profile.logo}" alt="Logo">`;
        }
    }

    document.getElementById('pdfWorkplace')?.addEventListener('change', (e) => {
        if (e.target.value !== '') loadWorkplaceProfile(parseInt(e.target.value));
    });

    // Selector rápido de lugar de trabajo (barra del editor)
    document.getElementById('quickWorkplaceSelector')?.addEventListener('change', (e) => {
        const idx = e.target.value;
        if (idx === '') return;
        loadWorkplaceProfile(parseInt(idx));
        // Sincronizar con el select del modal de config PDF
        const pdfSel = document.getElementById('pdfWorkplace');
        if (pdfSel) pdfSel.value = idx;
        // Persistir en pdf_config
        const config = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        const profile = workplaceProfiles[parseInt(idx)];
        if (profile) {
            config.selectedWorkplace = idx;
            config.workplaceAddress = profile.address || '';
            config.workplacePhone   = profile.phone   || '';
            config.workplaceEmail   = profile.email   || '';
            localStorage.setItem('pdf_config', JSON.stringify(config));
        }
        if (typeof showToast === 'function') showToast(`🏥 ${profile?.name || 'Lugar'} seleccionado`, 'success');
    });

    document.getElementById('btnSaveWorkplace')?.addEventListener('click', () => {
        const name = document.getElementById('wpName')?.value?.trim();
        if (!name) { showToast('Ingrese un nombre para el lugar', 'error'); return; }

        const logoInput = document.getElementById('wpLogo');
        const profile = {
            name,
            address: document.getElementById('wpAddress')?.value?.trim() || '',
            phone: document.getElementById('wpPhone')?.value?.trim() || '',
            email: document.getElementById('wpEmail')?.value?.trim() || '',
            footer: document.getElementById('wpFooter')?.value?.trim() || '',
            logo: null
        };

        const save = () => {
            workplaceProfiles.push(profile);
            localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));
            populateWorkplaceDropdown();
            document.getElementById('workplaceModalOverlay')?.classList.remove('active');
            showToast('Lugar guardado ✓', 'success');
        };

        if (logoInput?.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profile.logo = e.target.result;
                save();
            };
            reader.readAsDataURL(logoInput.files[0]);
        } else {
            save();
        }
    });

    populateWorkplaceDropdown();
}

// ---- Original initBusinessSuite updated ----
window.initBusinessSuite = function () {
    const isAdmin = (typeof CLIENT_CONFIG === 'undefined' || CLIENT_CONFIG.type === 'ADMIN');

    if (isAdmin) {
        _initAdmin();
    } else {
        _initClient();
    }
};

// ─── Flujo ADMIN ─────────────────────────────────────────────────────────────
function _initAdmin() {
    // Preservar personalizaciones del admin (nombre, institución, color) ya guardadas
    const existing = JSON.parse(localStorage.getItem('prof_data') || '{}');
    const adminProfData = {
        nombre:          existing.nombre          || 'Administrador',
        matricula:       existing.matricula       || 'ADMIN',
        workplace:       existing.workplace       || 'Panel de Administración',
        specialties:     existing.specialties     || ['Todas'],
        estudios:        existing.estudios        || [],
        especialidad:    existing.especialidad    || '',
        institutionName: existing.institutionName || '',
        headerColor:     existing.headerColor     || '#1a56a0',
    };
    localStorage.setItem('prof_data', JSON.stringify(adminProfData));
    localStorage.setItem('onboarding_date', new Date().toISOString());

    // Admin siempre ve el card de API Key
    window.GROQ_API_KEY = localStorage.getItem('groq_api_key') || '';

    _initCommonModules();

    try {
        if (typeof applyProfessionalData === 'function') applyProfessionalData(adminProfData);
        if (typeof updatePersonalization === 'function') updatePersonalization(adminProfData);
        if (typeof initializeMode === 'function') initializeMode();
    } catch (e) {
        console.error('Error inicializando datos admin:', e);
    }

    const btnAdminAccess = document.getElementById('btnAdminAccess');
    if (btnAdminAccess) {
        btnAdminAccess.addEventListener('click', () => window.open('recursos/admin.html', '_blank'));
    }

    const onboardingOverlay = document.getElementById('onboardingOverlay');
    if (onboardingOverlay) onboardingOverlay.style.display = 'none';
}

// ─── Flujo CLIENTE (NORMAL / PRO / TRIAL) ────────────────────────────────────
function _initClient() {
    // K2: ocultar panel de API Key del admin
    const apiKeyCard = document.getElementById('adminApiKeyCard');
    if (apiKeyCard) apiKeyCard.style.display = 'none';

    // K1: el criterio de primer uso es la aceptación de T&C, NO la ausencia de datos.
    // Los datos (nombre, matrícula, API key) los precarga el admin antes de entregar la app.
    const accepted = localStorage.getItem('onboarding_accepted');
    if (!accepted) {
        _showClientOnboarding();
        return; // los módulos se inicializan dentro del handler de aceptación
    }

    // Ya aceptó T&C: inicializar con los datos precargados por el admin
    const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
    window.GROQ_API_KEY = localStorage.getItem('groq_api_key') || '';
    _initCommonModules();

    try {
        if (typeof applyProfessionalData === 'function') applyProfessionalData(profData);
        if (typeof updatePersonalization === 'function') updatePersonalization(profData);
        if (typeof initializeMode === 'function') initializeMode();
    } catch (e) {
        console.error('Error inicializando datos cliente:', e);
    }

    const onboardingOverlay = document.getElementById('onboardingOverlay');
    if (onboardingOverlay) onboardingOverlay.style.display = 'none';
}

// ─── Módulos comunes (admin + cliente) ───────────────────────────────────────
function _initCommonModules() {
    if (typeof initTheme === 'function') initTheme();
    if (typeof updateApiStatus === 'function') updateApiStatus(localStorage.getItem('groq_api_key'));
    if (typeof populateTemplateDropdown === 'function') populateTemplateDropdown();
    if (typeof initModals === 'function') initModals();
    if (typeof initShortcuts === 'function') initShortcuts();
    if (typeof initApiManagement === 'function') initApiManagement();
    if (typeof initWorkplaceManagement === 'function') initWorkplaceManagement();
    if (typeof initStructurer === 'function') initStructurer();
    if (typeof initContact === 'function') initContact();
    if (typeof initDiagnostic === 'function') initDiagnostic();
    if (typeof initPatientRegistryPanel === 'function') initPatientRegistryPanel();
}

// ─── Onboarding de cliente: bienvenida + T&C + confirmación de datos precargados ─
function _showClientOnboarding() {
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;

    // Leer datos que el admin precargó en localStorage antes de entregar la app
    const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');

    // Rellenar la tarjeta de datos precargados (solo lectura)
    const displayNombre    = document.getElementById('onboardingDisplayNombre');
    const displayMatricula = document.getElementById('onboardingDisplayMatricula');
    if (displayNombre)    displayNombre.textContent    = profData.nombre    || '(no configurado)';
    if (displayMatricula) displayMatricula.textContent = profData.matricula || '(no configurado)';

    // Ocultar el step de API Key (solo lo usa el flujo admin, nunca el cliente)
    const apiStep = document.getElementById('onboardingApiKeyStep');
    if (apiStep) apiStep.style.display = 'none';

    overlay.style.display = 'flex';

    // T&C → habilitar botón
    const acceptTerms = document.getElementById('acceptTerms');
    const submitBtn   = document.getElementById('btnSubmitOnboarding');
    if (acceptTerms && submitBtn) {
        acceptTerms.addEventListener('change', () => {
            submitBtn.disabled = !acceptTerms.checked;
        });
    }

    // Aceptación
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (!acceptTerms?.checked) return;

            localStorage.setItem('onboarding_accepted', 'true');
            overlay.style.display = 'none';

            window.GROQ_API_KEY = localStorage.getItem('groq_api_key') || '';
            _initCommonModules();

            try {
                if (typeof applyProfessionalData === 'function') applyProfessionalData(profData);
                if (typeof updatePersonalization === 'function') updatePersonalization(profData);
                if (typeof initializeMode === 'function') initializeMode();
            } catch (err) {
                console.error('Error tras onboarding cliente:', err);
            }

            const saludo = profData.nombre ? `¡Bienvenido/a, ${profData.nombre}! 🎉` : '¡Bienvenido/a! 🎉';
            if (typeof showToast === 'function') showToast(saludo, 'success');
        });
    }
}
