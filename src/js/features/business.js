
// ============ WORKPLACE PROFILES + PROFESIONALES ============
window.initWorkplaceManagement = function () {
    let workplaceProfiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');

    // ── helpers de persistencia ──────────────────────────────────────────────
    function saveProfiles() {
        localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));
    }

    function getProfConfig() {
        return JSON.parse(localStorage.getItem('pdf_config') || '{}');
    }

    function setProfConfig(cfg) {
        localStorage.setItem('pdf_config', JSON.stringify(cfg));
    }

    // ── dropdown de lugares ──────────────────────────────────────────────────
    function populateWorkplaceDropdown() {
        const sel   = document.getElementById('pdfWorkplace');
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">Seleccionar lugar...</option>';
        workplaceProfiles.forEach((p, i) => {
            const label = p.name || `Lugar ${i + 1}`;
            const o = document.createElement('option'); o.value = i; o.textContent = label; sel.appendChild(o);
        });
        if (current !== '') sel.value = current;
    }
    // exponer globalmente para pdfPreview.js
    window.populateWorkplaceDropdown = populateWorkplaceDropdown;

    function loadWorkplaceProfile(index) {
        const profile = workplaceProfiles[index];
        if (!profile) return;
        const addr    = document.getElementById('pdfWorkplaceAddress');
        const phone   = document.getElementById('pdfWorkplacePhone');
        const email   = document.getElementById('pdfWorkplaceEmail');
        const footer  = document.getElementById('pdfFooterText');
        const logo    = document.getElementById('pdfLogoPreview');
        if (addr)   addr.value   = profile.address || '';
        if (phone)  phone.value  = profile.phone   || '';
        if (email)  email.value  = profile.email   || '';
        if (footer) footer.value = profile.footer   || '';
        if (profile.logo && profile.logo.startsWith('data:image/')) {
            localStorage.setItem('pdf_logo', profile.logo);
            if (logo) logo.innerHTML = `<img src="${profile.logo}" alt="Logo">`;
        }
        // Indicador visual de logo cargado en el input file
        const logoUploadGroup = document.getElementById('logoUploadGroup');
        const logoLabel = logoUploadGroup?.querySelector('label');
        if (logoLabel) {
            if (profile.logo && profile.logo.startsWith('data:image/')) {
                logoLabel.innerHTML = '🖼️ Logo <span style="color:var(--primary);font-weight:600;font-size:0.8rem;">✅ cargado</span>';
            } else {
                logoLabel.textContent = '🖼️ Logo (opcional)';
            }
        }
        // Mostrar / ocultar selector de profesionales
        populateProfessionalsDropdown(index);
    }

    // ── dropdown de profesionales ────────────────────────────────────────────
    function populateProfessionalsDropdown(wpIndex) {
        const group = document.getElementById('pdfProfessionalGroup');
        const sel   = document.getElementById('pdfProfessional');
        if (!group || !sel) return;

        const profile = workplaceProfiles[wpIndex];
        const profs = (profile && profile.professionals) ? profile.professionals : [];

        if (profs.length === 0) {
            group.style.display = 'none';
            sel.innerHTML = '<option value="">Seleccionar profesional...</option>';
            return;
        }

        group.style.display = '';
        sel.innerHTML = '<option value="">— Sin selección —</option>';
        profs.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.nombre || `Profesional ${i + 1}`;
            sel.appendChild(opt);
        });

        // Restaurar selección previa si corresponde al mismo lugar
        const cfg = getProfConfig();
        if (String(cfg.activeWorkplaceIndex) === String(wpIndex) && cfg.activeProfessionalIndex !== undefined) {
            sel.value = String(cfg.activeProfessionalIndex);
        }
    }

    function loadProfessionalProfile(wpIndex, profIndex) {
        const prof = workplaceProfiles[wpIndex]?.professionals?.[profIndex];
        if (!prof) return;
        const cfg = getProfConfig();
        cfg.activeWorkplaceIndex    = String(wpIndex);
        cfg.activeProfessionalIndex = String(profIndex);
        cfg.activeProfessional      = prof;
        setProfConfig(cfg);

        // Sincronizar logo/firma del profesional a localStorage como fallback
        // para que pdfMaker siempre los encuentre aunque pdf_config se reconstruya
        try {
            if (prof.logo  && prof.logo.startsWith('data:'))  localStorage.setItem('pdf_logo', prof.logo);
            if (prof.firma && prof.firma.startsWith('data:')) localStorage.setItem('pdf_signature', prof.firma);
        } catch (_) { /* quota */ }

        // Actualizar previews si están visibles
        if (prof.logo && prof.logo.startsWith('data:')) {
            const lp = document.getElementById('pdfLogoPreview');
            if (lp) lp.innerHTML = `<img src="${prof.logo}" alt="Logo" style="max-height:80px;">`;
        }
        if (prof.firma && prof.firma.startsWith('data:')) {
            const sp = document.getElementById('pdfSignaturePreview');
            if (sp) sp.innerHTML = `<img src="${prof.firma}" alt="Firma" style="max-height:80px;">`;
        }

        if (typeof showToast === 'function') showToast(`🩺 ${prof.nombre || 'Profesional'} seleccionado`, 'success');
    }

    // ── modal de gestión de profesionales ───────────────────────────────────
    let _editingProfIndex = null;  // null = nuevo, número = editar
    let _currentWpIndex   = null;

    function openProfessionalModal(wpIndex) {
        _currentWpIndex   = wpIndex;
        _editingProfIndex = null;
        const prof = workplaceProfiles[wpIndex];
        const title = document.getElementById('professionalModalTitle');
        if (title) title.textContent = `🩺 Profesionales — ${prof?.name || 'Lugar ' + (wpIndex + 1)}`;
        renderProfessionalList(wpIndex);
        resetProfessionalForm();
        document.getElementById('professionalModalOverlay')?.classList.add('active');
    }

    function closeProfessionalModal() {
        document.getElementById('professionalModalOverlay')?.classList.remove('active');
        if (_currentWpIndex !== null) populateProfessionalsDropdown(_currentWpIndex);
    }

    function resetProfessionalForm() {
        ['proNombre','proMatricula','proEspecialidades','proTelefono','proEmail'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['proFirmaPreview','proLogoPreview'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        const sec = document.getElementById('professionalFormSection');
        if (sec) sec.style.display = 'none';
        const toggleBtn  = document.getElementById('btnToggleProfessionalForm');
        const saveBtn    = document.getElementById('btnSaveProfessional');
        const cancelBtn  = document.getElementById('btnCancelProfessional');
        const formTitle  = document.getElementById('professionalFormTitle');
        if (toggleBtn)  { toggleBtn.style.display = ''; toggleBtn.textContent = '➕ Agregar profesional'; }
        if (saveBtn)    saveBtn.style.display    = 'none';
        if (cancelBtn)  cancelBtn.style.display  = 'none';
        if (formTitle)  formTitle.textContent    = '➕ Agregar profesional';
        _editingProfIndex = null;
    }

    function renderProfessionalList(wpIndex) {
        const container = document.getElementById('professionalList');
        if (!container) return;
        const profs = workplaceProfiles[wpIndex]?.professionals || [];
        if (profs.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem;margin:0 0 0.5rem;">Aún no hay profesionales. Agrega el primero ↓</p>';
            return;
        }
        container.innerHTML = profs.map((p, i) => {
            const safeName = (p.nombre || '(sin nombre)').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            const safeMat  = p.matricula ? (' — ' + p.matricula.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')) : '';
            return `
            <div class="field-row" style="align-items:center;gap:0.5rem;padding:0.35rem 0;border-bottom:1px solid var(--border);">
                <span style="flex:1;font-size:0.9rem;"><strong>${safeName}</strong>${safeMat}</span>
                <button class="btn-sm" data-edit="${i}">✏️ Editar</button>
                <button class="btn-sm btn-danger-sm" data-del="${i}">🗑️</button>
            </div>
        `;
        }).join('');
    }

    function openProfessionalForm(wpIndex, editIndex) {
        const sec       = document.getElementById('professionalFormSection');
        const saveBtn   = document.getElementById('btnSaveProfessional');
        const cancelBtn = document.getElementById('btnCancelProfessional');
        const toggleBtn = document.getElementById('btnToggleProfessionalForm');
        const formTitle = document.getElementById('professionalFormTitle');

        if (sec)       sec.style.display       = '';
        if (saveBtn)   saveBtn.style.display   = '';
        if (cancelBtn) cancelBtn.style.display = '';
        if (toggleBtn) toggleBtn.style.display = 'none';

        if (editIndex !== undefined && editIndex !== null) {
            _editingProfIndex = editIndex;
            const p = workplaceProfiles[wpIndex].professionals[editIndex];
            if (formTitle) formTitle.textContent = '✏️ Editar profesional';
            document.getElementById('proNombre').value          = p.nombre          || '';
            document.getElementById('proMatricula').value       = p.matricula       || '';
            document.getElementById('proEspecialidades').value  = p.especialidades  || '';
            document.getElementById('proTelefono').value        = p.telefono        || '';
            document.getElementById('proEmail').value           = p.email           || '';
            const fp = document.getElementById('proFirmaPreview');
            if (fp) fp.innerHTML = p.firma  ? `<img src="${p.firma}"  style="max-height:50px;">` : '';
            const lp = document.getElementById('proLogoPreview');
            if (lp) lp.innerHTML = p.logo   ? `<img src="${p.logo}"   style="max-height:50px;">` : '';
        } else {
            _editingProfIndex = null;
            if (formTitle) formTitle.textContent = '➕ Agregar profesional';
        }
    }

    function saveProfessional(wpIndex) {
        const nombre = document.getElementById('proNombre')?.value?.trim();
        if (!nombre) { if (typeof showToast === 'function') showToast('El nombre es obligatorio', 'error'); return; }

        const buildAndSave = (firmaB64, logoB64) => {
            if (!workplaceProfiles[wpIndex].professionals) workplaceProfiles[wpIndex].professionals = [];
            const prof = {
                id:            `PRO_${Date.now()}`,
                nombre,
                matricula:     document.getElementById('proMatricula')?.value?.trim()      || '',
                especialidades:document.getElementById('proEspecialidades')?.value?.trim() || '',
                telefono:      document.getElementById('proTelefono')?.value?.trim()       || '',
                email:         document.getElementById('proEmail')?.value?.trim()          || '',
                firma:         firmaB64,
                logo:          logoB64,
            };
            if (_editingProfIndex !== null) {
                // Conservar id original
                prof.id = workplaceProfiles[wpIndex].professionals[_editingProfIndex].id || prof.id;
                workplaceProfiles[wpIndex].professionals[_editingProfIndex] = prof;
            } else {
                workplaceProfiles[wpIndex].professionals.push(prof);
            }
            saveProfiles();
            renderProfessionalList(wpIndex);
            resetProfessionalForm();
            if (typeof showToast === 'function') showToast('Profesional guardado ✓', 'success');
        };

        const existingFirma = (_editingProfIndex !== null)
            ? (workplaceProfiles[wpIndex].professionals[_editingProfIndex]?.firma || null) : null;
        const existingLogo  = (_editingProfIndex !== null)
            ? (workplaceProfiles[wpIndex].professionals[_editingProfIndex]?.logo  || null) : null;

        const firmaFile = document.getElementById('proFirmaUpload')?.files?.[0];
        const logoFile  = document.getElementById('proLogoUpload')?.files?.[0];

        // Leer archivos si los hay
        const readFile = (file) => new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = e => resolve(e.target.result);
            r.onerror = () => reject(new Error('Error al leer archivo'));
            r.readAsDataURL(file);
        });

        Promise.all([
            firmaFile ? readFile(firmaFile) : Promise.resolve(existingFirma),
            logoFile  ? readFile(logoFile)  : Promise.resolve(existingLogo),
        ]).then(([firmaB64, logoB64]) => buildAndSave(firmaB64, logoB64));
    }

    function deleteProfessional(wpIndex, profIndex) {
        const p = workplaceProfiles[wpIndex]?.professionals?.[profIndex];
        if (!p) return;
        if (!confirm(`¿Eliminar a ${p.nombre || 'este profesional'}?`)) return;
        workplaceProfiles[wpIndex].professionals.splice(profIndex, 1);
        // si era el activo, limpiar
        const cfg = getProfConfig();
        if (String(cfg.activeWorkplaceIndex) === String(wpIndex) &&
            String(cfg.activeProfessionalIndex) === String(profIndex)) {
            delete cfg.activeProfessional;
            delete cfg.activeProfessionalIndex;
            delete cfg.activeWorkplaceIndex;
            setProfConfig(cfg);
        }
        saveProfiles();
        renderProfessionalList(wpIndex);
        populateProfessionalsDropdown(wpIndex);
        if (typeof showToast === 'function') showToast('Profesional eliminado', 'info');
    }

    // ── eventos ──────────────────────────────────────────────────────────────

    document.getElementById('pdfWorkplace')?.addEventListener('change', (e) => {
        if (e.target.value !== '') {
            loadWorkplaceProfile(parseInt(e.target.value));
        } else {
            // Si se deselecciona el lugar, ocultar el grupo de profesionales
            const group = document.getElementById('pdfProfessionalGroup');
            if (group) group.style.display = 'none';
        }
    });

    document.getElementById('pdfProfessional')?.addEventListener('change', (e) => {
        const wpIdx  = parseInt(document.getElementById('pdfWorkplace')?.value);
        const proIdx = e.target.value;
        if (isNaN(wpIdx) || proIdx === '') {
            // Limpiar activo
            const cfg = getProfConfig();
            delete cfg.activeProfessional;
            delete cfg.activeProfessionalIndex;
            setProfConfig(cfg);
            return;
        }
        loadProfessionalProfile(wpIdx, parseInt(proIdx));
    });

    document.getElementById('btnManageProfessionals')?.addEventListener('click', () => {
        const wpIdx = parseInt(document.getElementById('pdfWorkplace')?.value);
        if (isNaN(wpIdx)) { if (typeof showToast === 'function') showToast('Seleccioná un lugar primero', 'warning'); return; }
        openProfessionalModal(wpIdx);
    });

    document.getElementById('btnCloseProfessionalModal')?.addEventListener('click', closeProfessionalModal);
    document.getElementById('btnCloseProfessionalModalBtn')?.addEventListener('click', closeProfessionalModal);
    document.getElementById('professionalModalOverlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeProfessionalModal();
    });

    document.getElementById('btnToggleProfessionalForm')?.addEventListener('click', () => {
        openProfessionalForm(_currentWpIndex, null);
    });

    document.getElementById('btnSaveProfessional')?.addEventListener('click', () => {
        if (_currentWpIndex === null) return;
        saveProfessional(_currentWpIndex);
    });

    document.getElementById('btnCancelProfessional')?.addEventListener('click', resetProfessionalForm);

    // Delegación en la lista de profesionales (editar / borrar)
    document.getElementById('professionalList')?.addEventListener('click', (e) => {
        const editIdx = e.target.dataset.edit;
        const delIdx  = e.target.dataset.del;
        if (editIdx !== undefined) openProfessionalForm(_currentWpIndex, parseInt(editIdx));
        if (delIdx  !== undefined) deleteProfessional(_currentWpIndex, parseInt(delIdx));
    });

    // Preview de firma / logo en el formulario
    document.getElementById('proFirmaUpload')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        const preview = document.getElementById('proFirmaPreview');
        if (!file || !preview) return;
        const r = new FileReader();
        r.onload = ev => { preview.innerHTML = `<img src="${ev.target.result}" style="max-height:50px;">`; };
        r.readAsDataURL(file);
    });
    document.getElementById('proLogoUpload')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        const preview = document.getElementById('proLogoPreview');
        if (!file || !preview) return;
        const r = new FileReader();
        r.onload = ev => { preview.innerHTML = `<img src="${ev.target.result}" style="max-height:50px;">`; };
        r.readAsDataURL(file);
    });

    // (quickWorkplaceSelector eliminado — reemplazado por quickProfileSelector en outputProfiles.js)

    document.getElementById('btnSaveWorkplace')?.addEventListener('click', () => {
        const name = document.getElementById('wpName')?.value?.trim();
        if (!name) { showToast('Ingrese un nombre para el lugar', 'error'); return; }

        const logoInput = document.getElementById('wpLogo');
        const profile = {
            name,
            address:       document.getElementById('wpAddress')?.value?.trim() || '',
            phone:         document.getElementById('wpPhone')?.value?.trim()   || '',
            email:         document.getElementById('wpEmail')?.value?.trim()   || '',
            footer:        document.getElementById('wpFooter')?.value?.trim()  || '',
            logo:          null,
            professionals: [],
        };

        const save = () => {
            workplaceProfiles.push(profile);
            saveProfiles();
            populateWorkplaceDropdown();
            document.getElementById('workplaceModalOverlay')?.classList.remove('active');
            showToast('Lugar guardado ✓', 'success');
        };

        if (logoInput?.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (e) => { profile.logo = e.target.result; save(); };
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

    // Cargar datos de prueba ANTES de inicializar módulos (para que los dropdowns se pueblen)
    _loadAdminTestData();

    _initCommonModules();

    try {
        if (typeof applyProfessionalData === 'function') applyProfessionalData(adminProfData);
        if (typeof updatePersonalization === 'function') updatePersonalization(adminProfData);
        if (typeof initializeMode === 'function') initializeMode();
    } catch (e) {
        console.error('Error inicializando datos admin:', e);
    }

    // Admin NO ve Session Assistant (es solo para clones/clientes)

    const btnAdminAccess = document.getElementById('btnAdminAccess');
    if (btnAdminAccess) {
        btnAdminAccess.addEventListener('click', () => window.open('recursos/admin.html', '_blank'));
    }

    // Mostrar botón de reseteo solo para admin e inicializar su lógica
    const btnResetApp = document.getElementById('btnResetApp');
    if (btnResetApp) {
        btnResetApp.style.display = '';
        _initResetApp();
    }

    const onboardingOverlay = document.getElementById('onboardingOverlay');
    if (onboardingOverlay) onboardingOverlay.style.display = 'none';
}

// ─── Datos de prueba para admin ──────────────────────────────────────────────
// REMOVIDO: los datos demo se extrajeron a documentacion/DATOS_DEMO.js
// La app ahora arranca limpia sin datos pre-cargados.
// Para cargar datos de prueba, usar la consola con el archivo de referencia.
function _loadAdminTestData() {
    // No-op: ya no se cargan datos ficticios automáticamente.
    // Ver documentacion/DATOS_DEMO.js para los datos originales.
    console.log('[Admin] Inicio limpio — sin datos de prueba pre-cargados');
}

// ─── Reset app (solo admin) ───────────────────────────────────────────────────
function _initResetApp() {
    const modal      = document.getElementById('resetAppModal');
    const btnOpen    = document.getElementById('btnResetApp');
    const btnClose   = document.getElementById('btnCloseResetModal');
    const btnCancel  = document.getElementById('btnCancelResetApp');
    const btnConfirm = document.getElementById('btnConfirmResetApp');
    if (!modal) return;

    const openModal  = () => modal.classList.add('active');
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
        // Borrar también todos los contadores de informe (report_counter_YYYY)
        Object.keys(localStorage)
            .filter(k => /^report_counter_/.test(k))
            .forEach(k => localStorage.removeItem(k));

        keysToRemove.forEach(k => localStorage.removeItem(k));

        closeModal();
        if (typeof showToast === 'function') showToast('✅ App reseteada. Recargando...', 'success');
        setTimeout(() => location.reload(), 1200);
    });
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

    // Session Assistant — se abre cada vez que carga la app
    _launchSessionAssistant();
}

// ─── Módulos comunes (admin + cliente) ───────────────────────────────────────
function _initCommonModules() {
    if (typeof initTheme === 'function') initTheme();
    if (typeof updateApiStatus === 'function') updateApiStatus(localStorage.getItem('groq_api_key'));
    if (typeof populateTemplateDropdown === 'function') populateTemplateDropdown();

    // Pedir permiso de notificaciones desktop (no-blocking)
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    if (typeof initModals === 'function') initModals();
    if (typeof initShortcuts === 'function') initShortcuts();
    if (typeof initApiManagement === 'function') initApiManagement();
    if (typeof initWorkplaceManagement === 'function') initWorkplaceManagement();
    if (typeof initOutputProfiles === 'function') initOutputProfiles();
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

            // Session Assistant — abrir tras onboarding
            _launchSessionAssistant();
        });
    }
}

// ─── Helper: inicializar y abrir Session Assistant ────────────────────────────
function _launchSessionAssistant() {
    if (typeof initSessionAssistant === 'function') initSessionAssistant();
    // Pequeño delay para que la UI se estabilice
    setTimeout(() => {
        if (typeof openSessionAssistant === 'function') openSessionAssistant();
    }, 350);
}
