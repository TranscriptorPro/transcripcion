
// ============ WORKPLACE PROFILES + PROFESIONALES ============
window.initWorkplaceManagement = function () {
    let workplaceProfiles = (window._wpProfilesCache !== undefined ? window._wpProfilesCache : null) || JSON.parse(localStorage.getItem('workplace_profiles') || '[]');

    // ── helpers de persistencia ──────────────────────────────────────────────
    function saveProfiles() {
        window._wpProfilesCache = workplaceProfiles;
        if (typeof appDB !== 'undefined') appDB.set('workplace_profiles', workplaceProfiles);
        localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));
    }

    function getProfConfig() {
        return window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
    }

    function setProfConfig(cfg) {
        window._pdfConfigCache = cfg;
        if (typeof appDB !== 'undefined') appDB.set('pdf_config', cfg);
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
            if (typeof appDB !== 'undefined') appDB.set('pdf_logo', profile.logo);
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
            if (prof.logo  && prof.logo.startsWith('data:'))  { if (typeof appDB !== 'undefined') appDB.set('pdf_logo', prof.logo); localStorage.setItem('pdf_logo', prof.logo); }
            if (prof.firma && prof.firma.startsWith('data:')) { if (typeof appDB !== 'undefined') appDB.set('pdf_signature', prof.firma); localStorage.setItem('pdf_signature', prof.firma); }
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

    async function deleteProfessional(wpIndex, profIndex) {
        const p = workplaceProfiles[wpIndex]?.professionals?.[profIndex];
        if (!p) return;
        const ok = await window.showCustomConfirm('🗑️ Eliminar profesional', `¿Eliminar a ${p.nombre || 'este profesional'}?`);
        if (!ok) return;
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
window.initBusinessSuite = async function () {
    // ── Interceptar link de la fábrica (?id=MED001) ──────────────────────────
    if (window._PENDING_SETUP_ID) {
        // ── Protección: si ya era ADMIN, confirmar antes de sobreescribir ──
        if (window._ADMIN_WAS_ACTIVE) {
            const confirmar = typeof window.showCustomConfirm === 'function'
                ? await window.showCustomConfirm(
                    '⚠️ Atención',
                    'Estás abriendo un link de usuario en tu sesión de ADMINISTRADOR.\n\nSi continúas, tu sesión admin se convertirá en la del usuario "' + window._PENDING_SETUP_ID + '".\n\n¿Querés continuar?'
                )
                : confirm('⚠️ ATENCIÓN: ¿Querés convertir tu sesión admin en la del usuario "' + window._PENDING_SETUP_ID + '"?');
            if (!confirmar) {
                // Limpiar y seguir como admin
                delete window._PENDING_SETUP_ID;
                delete window._ADMIN_WAS_ACTIVE;
                sessionStorage.removeItem('pending_setup_id');
                _initAdmin();
                return;
            }
            delete window._ADMIN_WAS_ACTIVE;
        }
        _handleFactorySetup(window._PENDING_SETUP_ID);
        return; // la inicialización se completa dentro del handler async
    }

    const isAdmin = (typeof CLIENT_CONFIG === 'undefined' || CLIENT_CONFIG.type === 'ADMIN');

    if (isAdmin) {
        _initAdmin();
    } else {
        _initClient();
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FÁBRICA DE CLONES — Setup desde link ?id=MED001
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Flujo de primer uso desde link de la fábrica:
 * 1. Muestra pantalla de carga
 * 2. Genera device_id
 * 3. Llama al backend (validate) con el ID del médico
 * 4. Mapea el plan al CLIENT_CONFIG
 * 5. Guarda config + prof_data + API key en localStorage
 * 6. Pasa al flujo de cliente normal (onboarding + T&C)
 */
async function _handleFactorySetup(medicoId) {
    console.info('[Factory] Configurando app para médico:', medicoId);

    // Mostrar overlay de carga
    _showSetupLoadingOverlay();

    try {
        // Generar device_id si no existe
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
            if (typeof appDB !== 'undefined') appDB.set('device_id', deviceId);
            localStorage.setItem('device_id', deviceId);
        }

        // Llamar al backend
        const backendUrl = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
        const url = `${backendUrl}?action=validate&id=${encodeURIComponent(medicoId)}&deviceId=${encodeURIComponent(deviceId)}`;

        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const doctor = await resp.json();

        if (doctor.error) {
            _showSetupError(doctor.error, doctor.code);
            return;
        }

        // ── Mapear plan → CLIENT_CONFIG ──────────────────────────────────────
        const plan = String(doctor.Plan || 'trial').toLowerCase();
        const planMap = {
            trial:      { type: 'TRIAL',  hasProMode: false, hasDashboard: false, canGenerateApps: false },
            normal:     { type: 'NORMAL', hasProMode: false, hasDashboard: false, canGenerateApps: false },
            pro:        { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false },
            gift:       { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false },
            clinic:     { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: true  },
            enterprise: { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false }
        };
        const pc = planMap[plan] || planMap.trial;

        // Parsear specialties
        let specialties = ['ALL'];
        try {
            const spec = String(doctor.Especialidad || 'ALL');
            specialties = spec === 'ALL' ? ['ALL'] : spec.split(',').map(s => s.trim());
        } catch (_) {}

        // Parsear allowedTemplates
        let allowedTemplates = [];
        try {
            const tpl = String(doctor.Allowed_Templates || '');
            if (tpl && tpl !== 'ALL' && tpl !== '') {
                allowedTemplates = JSON.parse(tpl);
            }
        } catch (_) {}

        const clientConfig = {
            medicoId:         medicoId,
            type:             pc.type,
            status:           String(doctor.Estado || 'active'),
            specialties:      specialties,
            maxDevices:       Number(doctor.Devices_Max) || 2,
            trialDays:        plan === 'trial' ? 7 : 0,
            hasProMode:       pc.hasProMode,
            hasDashboard:     pc.hasDashboard,
            canGenerateApps:  pc.canGenerateApps,
            allowedTemplates: allowedTemplates,
            backendUrl:       backendUrl
        };

        // ── Guardar en localStorage ──────────────────────────────────────────
        if (typeof appDB !== 'undefined') appDB.set('client_config_stored', clientConfig);
        localStorage.setItem('client_config_stored', JSON.stringify(clientConfig));
        Object.assign(window.CLIENT_CONFIG, clientConfig);

        // prof_data (nombre, matrícula, especialidad)
        const profData = {
            nombre:       doctor.Nombre      || 'Profesional',
            matricula:    doctor.Matricula    || '',
            workplace:    '',
            specialties:  specialties,
            estudios:     [],
            especialidad: doctor.Especialidad || '',
        };
        window._profDataCache = profData;
        if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
        localStorage.setItem('prof_data', JSON.stringify(profData));

        // ── Cargar datos enriquecidos del registro (si existen) ──────────────
        let regDatos = {};
        try { regDatos = JSON.parse(doctor.Registro_Datos || '{}'); } catch(_) {}

        // Workplace profiles (si el registro incluía datos de lugar de trabajo)
        if (regDatos.workplace) {
            try {
                const wp = typeof regDatos.workplace === 'string' ? JSON.parse(regDatos.workplace) : regDatos.workplace;
                if (wp && wp.name) {
                    // Construir perfil del profesional para cada lugar
                    const buildProfessional = () => ({
                        nombre:          doctor.Nombre    || '',
                        matricula:       doctor.Matricula || '',
                        especialidades:  doctor.Especialidad || '',
                        telefono:        doctor.Telefono  || '',
                        email:           doctor.Email     || '',
                        firma:           regDatos.firma   || '',
                        logo:            regDatos.proLogo || ''
                    });

                    const workplaceProfiles = [{
                        name:    wp.name    || '',
                        address: wp.address || '',
                        phone:   wp.phone   || '',
                        email:   wp.email   || '',
                        footer:  regDatos.footerText || '',
                        logo:    wp.logo    || '',
                        professionals: [buildProfessional()]
                    }];

                    // Agregar workplaces extras (si existen)
                    let extras = regDatos.extraWorkplaces || [];
                    if (typeof extras === 'string') {
                        try { extras = JSON.parse(extras); } catch(_) { extras = []; }
                    }
                    if (Array.isArray(extras)) {
                        extras.forEach(ewp => {
                            if (ewp && ewp.name) {
                                workplaceProfiles.push({
                                    name:    ewp.name    || '',
                                    address: ewp.address || '',
                                    phone:   ewp.phone   || '',
                                    email:   ewp.email   || '',
                                    footer:  regDatos.footerText || '',
                                    logo:    ewp.logo    || '',
                                    professionals: [buildProfessional()]
                                });
                            }
                        });
                    }

                    window._wpProfilesCache = workplaceProfiles;
                    if (typeof appDB !== 'undefined') appDB.set('workplace_profiles', workplaceProfiles);
                    localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));

                    // Actualizar prof_data con workplace
                    profData.workplace = wp.name || '';
                    window._profDataCache = profData;
                    if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
                    localStorage.setItem('prof_data', JSON.stringify(profData));
                }
            } catch(_) {}
        }

        // Firma del profesional (base64)
        if (regDatos.firma) {
            try {
                const existingConfig = getProfConfig();
                existingConfig.signature = regDatos.firma;
                setProfConfig(existingConfig);
            } catch(_) {}
        }

        // Logo profesional (base64)
        if (regDatos.proLogo) {
            try {
                const existingConfig = getProfConfig();
                existingConfig.professionalLogo = regDatos.proLogo;
                setProfConfig(existingConfig);
            } catch(_) {}
        }

        // Header Color del PDF
        if (regDatos.headerColor) {
            profData.headerColor = regDatos.headerColor;
            window._profDataCache = profData;
            if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
            localStorage.setItem('prof_data', JSON.stringify(profData));
        }

        // Estudios seleccionados
        if (regDatos.estudios) {
            try {
                const estudios = typeof regDatos.estudios === 'string' ? JSON.parse(regDatos.estudios) : regDatos.estudios;
                if (Array.isArray(estudios) && estudios.length > 0) {
                    profData.estudios = estudios;
                    window._profDataCache = profData;
                    if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
                    localStorage.setItem('prof_data', JSON.stringify(profData));
                }
            } catch(_) {}
        }

        // Footer text del PDF
        if (regDatos.footerText) {
            try {
                const existingConfig = getProfConfig();
                existingConfig.footerText = regDatos.footerText;
                setProfConfig(existingConfig);
            } catch(_) {}
        }

        // API Key (si el admin la configuró en el Sheet o viene en Registro_Datos)
        const apiKey = doctor.API_Key || regDatos.apiKey || '';
        if (apiKey) {
            if (typeof appDB !== 'undefined') appDB.set('groq_api_key', apiKey);
            localStorage.setItem('groq_api_key', apiKey);
        }

        // Guardar ID del médico
        if (typeof appDB !== 'undefined') appDB.set('medico_id', medicoId);
        localStorage.setItem('medico_id', medicoId);

        // Limpiar la marca de setup pendiente
        delete window._PENDING_SETUP_ID;

        console.info('[Factory] Setup completado para', doctor.Nombre || medicoId, '— Plan:', plan);

        // ── Continuar con flujo de cliente (onboarding) ──────────────────────
        _hideSetupLoadingOverlay();
        _initClient(); // mostrará el onboarding con T&C

    } catch (err) {
        console.error('[Factory] Error en setup:', err);
        _showSetupError('Error: ' + (err.message || err) + '. Recargá la página para reintentar.', 'NETWORK');
    }
}

/** Overlay de carga durante el setup */
function _showSetupLoadingOverlay() {
    let overlay = document.getElementById('factorySetupOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'factorySetupOverlay';
        overlay.innerHTML = `
            <div style="background:white;border-radius:16px;padding:40px 32px;text-align:center;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.3);">
                <div style="font-size:48px;margin-bottom:16px;">⚙️</div>
                <h2 style="margin:0 0 8px;color:#1a56a0;font-size:1.3rem;">Configurando tu app...</h2>
                <p style="color:#666;font-size:.9rem;margin:0 0 20px;">Conectando con el servidor y preparando tu espacio de trabajo</p>
                <div style="width:48px;height:48px;border:4px solid #e5e7eb;border-top-color:#1a56a0;border-radius:50%;animation:factorySpinner 1s linear infinite;margin:0 auto;"></div>
            </div>
        `;
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);';
        // Agregar animación CSS
        const style = document.createElement('style');
        style.textContent = '@keyframes factorySpinner{to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function _hideSetupLoadingOverlay() {
    const overlay = document.getElementById('factorySetupOverlay');
    if (overlay) overlay.remove();
}

/** Pantalla de error en el setup */
function _showSetupError(message, code) {
    _hideSetupLoadingOverlay();
    let overlay = document.getElementById('factoryErrorOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'factoryErrorOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);';
        document.body.appendChild(overlay);
    }

    const codeLabels = {
        NOT_FOUND: 'El enlace no corresponde a ningún usuario registrado.',
        BANNED: 'Esta cuenta ha sido suspendida. Contactá al administrador.',
        INACTIVE: 'Esta cuenta está desactivada. Contactá al administrador.',
        EXPIRED: 'La licencia ha expirado. Contactá al administrador para renovar.',
        DEVICE_LIMIT: 'Se alcanzó el límite de dispositivos. Contactá al administrador.',
        NETWORK: message
    };

    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;padding:40px 32px;text-align:center;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.3);">
            <div style="font-size:48px;margin-bottom:16px;">❌</div>
            <h2 style="margin:0 0 8px;color:#dc2626;font-size:1.2rem;">No se pudo configurar la app</h2>
            <p style="color:#666;font-size:.9rem;margin:0 0 20px;">${codeLabels[code] || message}</p>
            <button onclick="location.reload()" style="background:#1a56a0;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:.9rem;">Reintentar</button>
        </div>
    `;
    overlay.style.display = 'flex';
}

// ─── Flujo ADMIN ─────────────────────────────────────────────────────────────
function _initAdmin() {
    // Preservar personalizaciones del admin (nombre, institución, color) ya guardadas
    const existing = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
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
    window._profDataCache = adminProfData;
    if (typeof appDB !== 'undefined') appDB.set('prof_data', adminProfData);
    localStorage.setItem('prof_data', JSON.stringify(adminProfData));
    if (typeof appDB !== 'undefined') appDB.set('onboarding_date', new Date().toISOString());
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

    // Admin también ve ⚙️ Settings (además de su panel lateral)
    _showSettingsGear();

    const onboardingOverlay = document.getElementById('onboardingOverlay');
    if (onboardingOverlay) onboardingOverlay.classList.remove('active');
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
        if (typeof appDB !== 'undefined') {
            Object.keys(localStorage)
                .filter(k => /^report_counter_/.test(k))
                .forEach(k => { appDB.remove(k); localStorage.removeItem(k); });
            keysToRemove.forEach(k => appDB.remove(k));
            // Limpiar caches de ventana
            window._pdfConfigCache = null; window._profDataCache = null; window._wpProfilesCache = null;
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

// ─── Flujo CLIENTE (NORMAL / PRO / TRIAL) ────────────────────────────────────
function _initClient() {
    // K2: ocultar panel de API Key y botón admin para clientes
    const apiKeyCard = document.getElementById('adminApiKeyCard');
    if (apiKeyCard) apiKeyCard.style.display = 'none';
    const btnAdminAccess = document.getElementById('btnAdminAccess');
    if (btnAdminAccess) btnAdminAccess.style.display = 'none';

    // K1: el criterio de primer uso es la aceptación de T&C, NO la ausencia de datos.
    // Los datos (nombre, matrícula, API key) los precarga el admin antes de entregar la app.
    const accepted = localStorage.getItem('onboarding_accepted');
    if (!accepted) {
        _showClientOnboarding();
        return; // los módulos se inicializan dentro del handler de aceptación
    }

    // Ya aceptó T&C: inicializar con los datos precargados por el admin
    const profData = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
    window.GROQ_API_KEY = window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
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

    // Session Assistant — se abre cada vez que carga la app
    _launchSessionAssistant();
}

// ─── Módulos comunes (admin + cliente) ───────────────────────────────────────
function _initCommonModules() {
    // SIEMPRE cargar API Key desde localStorage (puede haber sido guardada por factory setup)
    const storedKey = localStorage.getItem('groq_api_key') || '';
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
    if (typeof initPatientRegistryPanel === 'function') initPatientRegistryPanel();
}

// ─── Onboarding de cliente: bienvenida espectacular multi-step + T&C ──────────
function _showClientOnboarding() {
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;

    const profData = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
    let currentStep = 1;

    // Rellenar datos precargados
    const displayNombre = document.getElementById('onboardingDisplayNombre');
    const displayMatricula = document.getElementById('onboardingDisplayMatricula');
    if (displayNombre) displayNombre.textContent = profData.nombre || '(no configurado)';
    if (displayMatricula) displayMatricula.textContent = profData.matricula || '(no configurado)';

    // K1: Mostrar campo API Key solo si NO hay key precargada por admin
    const apiStep = document.getElementById('onboardingApiKeyStep');
    const hasPreloadedKey = !!localStorage.getItem('groq_api_key');
    if (apiStep) apiStep.style.display = hasPreloadedKey ? 'none' : '';

    // Crear partículas decorativas
    _createOnboardingParticles();

    overlay.classList.add('active');

    // ─── Step navigation ─────────────────────────────────
    function goToStep(step) {
        const prev = document.getElementById('onboardingStep' + currentStep);
        const next = document.getElementById('onboardingStep' + step);
        if (!prev || !next) return;

        prev.style.animation = 'onboardingSlideOut 0.25s ease-in forwards';
        setTimeout(() => {
            prev.classList.remove('active');
            prev.style.animation = '';
            next.classList.add('active');
            currentStep = step;
            _updateOnboardingDots(step);
        }, 250);
    }

    function _updateOnboardingDots(step) {
        document.querySelectorAll('.onboarding-dot').forEach(d => {
            d.classList.toggle('active', parseInt(d.dataset.step) === step);
        });
    }

    // Botones next/back
    const next1 = document.getElementById('onboardingNext1');
    const next2 = document.getElementById('onboardingNext2');
    const back2 = document.getElementById('onboardingBack2');
    const back3 = document.getElementById('onboardingBack3');

    if (next1) next1.addEventListener('click', () => goToStep(2));
    if (next2) next2.addEventListener('click', () => {
        // K1: validar API Key si el campo está visible (no precargada)
        if (apiStep && apiStep.style.display !== 'none') {
            const keyInput = document.getElementById('onboardingApiKey');
            const keyVal = keyInput ? keyInput.value.trim() : '';
            if (keyVal && !keyVal.startsWith('gsk_')) {
                if (typeof showToast === 'function') showToast('❌ La API Key debe empezar con gsk_', 'error');
                return;
            }
            // Guardar inmediatamente si fue ingresada
            if (keyVal) {
                if (typeof appDB !== 'undefined') appDB.set('groq_api_key', keyVal);
                localStorage.setItem('groq_api_key', keyVal);
                window.GROQ_API_KEY = keyVal;
            }
        }
        goToStep(3);
    });
    if (back2) back2.addEventListener('click', () => goToStep(1));
    if (back3) back3.addEventListener('click', () => goToStep(2));

    // T&C → habilitar botón de activación
    const acceptTerms = document.getElementById('acceptTerms');
    const submitBtn = document.getElementById('btnSubmitOnboarding');
    if (acceptTerms && submitBtn) {
        acceptTerms.addEventListener('change', () => {
            submitBtn.disabled = !acceptTerms.checked;
        });
    }

    // Aceptación final
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (!acceptTerms?.checked) return;

            if (typeof appDB !== 'undefined') appDB.set('onboarding_accepted', 'true');
            localStorage.setItem('onboarding_accepted', 'true');

            // Confetti burst 🎉
            _launchConfetti();

            setTimeout(() => {
                overlay.classList.remove('active');

                // K1: guardar API Key ingresada en onboarding (si la hay)
                const onbKey = document.getElementById('onboardingApiKey');
                if (onbKey && onbKey.value.trim() && onbKey.value.trim().startsWith('gsk_')) {
                    if (typeof appDB !== 'undefined') appDB.set('groq_api_key', onbKey.value.trim());
                    localStorage.setItem('groq_api_key', onbKey.value.trim());
                }

                // Cargar API Key desde localStorage
                window.GROQ_API_KEY = window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
                console.info('[Onboarding] API Key loaded:', window.GROQ_API_KEY ? 'gsk_...' + window.GROQ_API_KEY.slice(-4) : 'NONE');
                _initCommonModules();

                try {
                    if (typeof applyProfessionalData === 'function') applyProfessionalData(profData);
                    if (typeof updatePersonalization === 'function') updatePersonalization(profData);
                    if (typeof initializeMode === 'function') initializeMode();
                } catch (err) {
                    console.error('Error tras onboarding cliente:', err);
                }

                // Mostrar configuración gear
                _showSettingsGear();

                const saludo = profData.nombre ? `¡Bienvenido/a, ${profData.nombre}! 🎉` : '¡Bienvenido/a! 🎉';
                if (typeof showToast === 'function') showToast(saludo, 'success');

                // PWA: ofrecer instalar la app automáticamente tras el onboarding
                _tryPwaInstall(3);

                _launchSessionAssistant();
            }, 800);
        });
    }
}

// ─── Partículas decorativas para onboarding ──────────────────────────────────
function _createOnboardingParticles() {
    const container = document.getElementById('onboardingParticles');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#14b8a6', '#0f766e', '#f59e0b', '#6366f1', '#ec4899'];
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('span');
        p.className = 'onboarding-particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = 60 + Math.random() * 40 + '%';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDelay = Math.random() * 4 + 's';
        p.style.animationDuration = 3 + Math.random() * 3 + 's';
        p.style.width = 4 + Math.random() * 6 + 'px';
        p.style.height = p.style.width;
        container.appendChild(p);
    }
}

// ─── Confetti burst al activar la app ────────────────────────────────────────
function _launchConfetti() {
    const colors = ['#14b8a6', '#0f766e', '#f59e0b', '#6366f1', '#ec4899', '#22c55e', '#ef4444'];
    for (let i = 0; i < 50; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = '-10px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = Math.random() * 0.5 + 's';
        el.style.animationDuration = 2 + Math.random() * 2 + 's';
        el.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }
}

// ─── Settings Gear — mostrar botón e inicializar panel ──────────────────────
function _showSettingsGear() {
    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) btnSettings.style.display = '';
    if (typeof initSettingsPanel === 'function') initSettingsPanel();
}

// ─── PWA Install: intentar mostrar prompt con reintentos ───────────────────
function _tryPwaInstall(maxRetries) {
    let attempt = 0;
    const interval = setInterval(() => {
        attempt++;
        if (window._pwaInstallPrompt) {
            clearInterval(interval);
            _showPwaInstallBanner();
            return;
        }
        if (attempt >= maxRetries) {
            clearInterval(interval);
            // No hay prompt disponible — escuchar si llega después
            window.addEventListener('beforeinstallprompt', () => {
                if (!sessionStorage.getItem('pwa_banner_dismissed')) {
                    _showPwaInstallBanner();
                }
            }, { once: true });
            // Mostrar instrucción manual como fallback
            _showManualInstallHint();
        }
    }, 2000);
}

function _showPwaInstallBanner() {
    // Mostrar banner llamativo de instalación
    let banner = document.getElementById('pwaInstallBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pwaInstallBanner';
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9998;background:linear-gradient(135deg,#1a56a0,#2563eb);color:white;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 -4px 20px rgba(0,0,0,.3);animation:slideUp .4s ease-out;';
        banner.innerHTML = `
            <div style="flex:1;">
                <strong>📱 Instalá la app en tu dispositivo</strong>
                <p style="margin:2px 0 0;font-size:.82rem;opacity:.85;">Accedé más rápido desde tu escritorio o pantalla de inicio</p>
            </div>
            <button id="pwaInstallBannerBtn" style="background:white;color:#1a56a0;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;white-space:nowrap;font-size:.9rem;">Instalar</button>
            <button id="pwaInstallBannerClose" style="background:transparent;border:none;color:white;font-size:1.3rem;cursor:pointer;padding:4px 8px;opacity:.7;">✕</button>
        `;
        // Agregar animación
        const style = document.createElement('style');
        style.textContent = '@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}';
        document.head.appendChild(style);
        document.body.appendChild(banner);

        document.getElementById('pwaInstallBannerBtn').addEventListener('click', () => {
            if (window._pwaInstallPrompt) {
                window._pwaInstallPrompt.prompt();
                window._pwaInstallPrompt.userChoice.then(choice => {
                    console.info('[PWA] Install from banner:', choice.outcome);
                    window._pwaInstallPrompt = null;
                    banner.remove();
                    const btnInstall = document.getElementById('btnInstallPwa');
                    if (btnInstall) btnInstall.style.display = 'none';
                    if (choice.outcome === 'accepted' && typeof showToast === 'function') {
                        showToast('✅ ¡App instalada! La encontrarás en tu escritorio.', 'success');
                    }
                });
            }
        });

        document.getElementById('pwaInstallBannerClose').addEventListener('click', () => {
            banner.remove();
            sessionStorage.setItem('pwa_banner_dismissed', 'true');
        });
    }
}

function _showManualInstallHint() {
    // No mostrar si ya fue descartado o ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('pwa_banner_dismissed')) return;

    // Detectar navegador para instrucciones específicas
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    let msg = '📱 Podés instalar esta app: ';
    if (isChrome || isEdge) {
        msg += 'clicá el ícono ⬇️ en la barra de direcciones del navegador.';
    } else if (isSafari) {
        msg += 'tocá el botón Compartir → "Agregar a pantalla de inicio".';
    } else {
        msg += 'usá el menú del navegador → "Instalar app" o "Agregar a pantalla de inicio".';
    }

    if (typeof showToast === 'function') {
        showToast(msg, 'info', 8000);
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
