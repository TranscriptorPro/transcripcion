
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
    // Siempre establecer como Admin para esta app principal
    const adminProfData = {
        nombre: 'Administrador',
        matricula: 'ADMIN',
        workplace: 'Panel de Administración',
        specialties: ['Todas'],
        studies: []
    };
    localStorage.setItem('prof_data', JSON.stringify(adminProfData));
    localStorage.setItem('onboarding_date', new Date().toISOString());

    // Inicializar GROQ_API_KEY global desde localStorage
    window.GROQ_API_KEY = localStorage.getItem('groq_api_key') || '';

    // Initialize UI modules
    if (typeof initTheme === 'function') initTheme();
    if (typeof updateApiStatus === 'function') updateApiStatus(localStorage.getItem('groq_api_key'));
    if (typeof populateTemplateDropdown === 'function') populateTemplateDropdown();
    if (typeof initModals === 'function') initModals();
    if (typeof initShortcuts === 'function') initShortcuts();
    if (typeof initApiManagement === 'function') initApiManagement();
    if (typeof initWorkplaceManagement === 'function') initWorkplaceManagement();

    try {
        if (typeof applyProfessionalData === 'function') applyProfessionalData(adminProfData);
        if (typeof updatePersonalization === 'function') updatePersonalization(adminProfData);
        if (typeof initializeMode === 'function') initializeMode();
    } catch (e) {
        console.error("Error inicializando datos admin:", e);
    }

    // Listener para el botón de administración
    const btnAdminAccess = document.getElementById('btnAdminAccess');
    if (btnAdminAccess) {
        btnAdminAccess.addEventListener('click', () => {
            window.open('recursos/admin.html', '_blank');
        });
    }

    // Forzar la ocultación del modal de onboarding
    const onboardingOverlay = document.getElementById('onboardingOverlay');
    if (onboardingOverlay) onboardingOverlay.style.display = 'none';
}
