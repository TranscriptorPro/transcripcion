
// ============ WORKPLACE PROFILES ============
window.initWorkplaceManagement = function () {
    let workplaceProfiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');

    function populateWorkplaceDropdown() {
        const sel = document.getElementById('pdfWorkplace');
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">Seleccionar lugar...</option>';
        workplaceProfiles.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.name || `Lugar ${i + 1}`;
            sel.appendChild(opt);
        });
        if (current !== '') sel.value = current;
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

    const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
    const savedKey = localStorage.getItem('groq_api_key') || '';
    const needsOnboarding = !profData.nombre || !savedKey;

    // K1: mostrar onboarding en primer uso (sin perfil o sin API key)
    if (needsOnboarding) {
        _showClientOnboarding(profData, savedKey);
        return; // los módulos se inicializan dentro del submit
    }

    // Ya configurado: inicializar normalmente
    window.GROQ_API_KEY = savedKey;
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
}

// ─── Onboarding de cliente: primer uso ───────────────────────────────────────
function _showClientOnboarding(existingProf, existingKey) {
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;

    // Mostrar el campo de API key (solo para clientes)
    const apiStep = document.getElementById('onboardingApiKeyStep');
    if (apiStep) {
        apiStep.style.display = '';
        // Precargar key si ya existía (solo falta el perfil)
        const apiInput = document.getElementById('onboardingApiKey');
        if (apiInput && existingKey) apiInput.value = existingKey;
    }

    // Precargar datos si ya había perfil (solo falta la key)
    if (existingProf.nombre) {
        const n = document.getElementById('profName');
        const m = document.getElementById('profMatricula');
        if (n) n.value = existingProf.nombre;
        if (m) m.value = existingProf.matricula || '';
    }

    overlay.style.display = 'flex';

    // Wire up accept-terms → habilitar botón submit
    const acceptTerms = document.getElementById('acceptTerms');
    const submitBtn   = document.getElementById('btnSubmitOnboarding');
    if (acceptTerms && submitBtn) {
        acceptTerms.addEventListener('change', () => {
            submitBtn.disabled = !acceptTerms.checked;
        });
    }

    // ── Submit del formulario ──
    const form = document.getElementById('onboardingForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nombre    = document.getElementById('profName')?.value?.trim();
        const matricula = document.getElementById('profMatricula')?.value?.trim();
        const workplace = document.getElementById('profWorkplace')?.value?.trim();
        const apiKey    = document.getElementById('onboardingApiKey')?.value?.trim();

        if (!nombre || !matricula) {
            if (typeof showToast === 'function') showToast('Completá nombre y matrícula', 'error');
            return;
        }
        if (!apiKey) {
            if (typeof showToast === 'function') showToast('Ingresá tu API Key de Groq para continuar', 'error');
            return;
        }

        // Guardar especialidades marcadas
        const specialties = Array.from(
            document.querySelectorAll('input[name="specialty"]:checked')
        ).map(cb => cb.value);

        // Guardar lugares de trabajo
        const workplaces = workplace
            ? workplace.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
            : [];

        const profData = {
            nombre,
            matricula,
            workplace:  workplaces[0] || '',
            workplaces,
            specialties,
            estudios:        [],
            especialidad:    specialties[0] || '',
            institutionName: '',
            headerColor:     '#1a56a0',
        };

        localStorage.setItem('prof_data', JSON.stringify(profData));
        localStorage.setItem('onboarding_date', new Date().toISOString());
        localStorage.setItem('groq_api_key', apiKey);
        window.GROQ_API_KEY = apiKey;

        overlay.style.display = 'none';

        _initCommonModules();
        try {
            if (typeof applyProfessionalData === 'function') applyProfessionalData(profData);
            if (typeof updatePersonalization === 'function') updatePersonalization(profData);
            if (typeof initializeMode === 'function') initializeMode();
        } catch (err) {
            console.error('Error tras onboarding:', err);
        }

        if (typeof showToast === 'function') showToast('¡Configuración guardada! Bienvenido/a 🎉', 'success');
    });
}
