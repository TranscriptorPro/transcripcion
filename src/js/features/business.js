
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
            const _esc = typeof escapeHtml === 'function' ? escapeHtml : (s => (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
            const safeName = _esc(p.nombre || '(sin nombre)');
            const safeMat  = p.matricula ? (' — ' + _esc(p.matricula)) : '';
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

        // ── Parsear datos enriquecidos del registro ANTES de usarlos ─────────
        let regDatos = {};
        try { regDatos = JSON.parse(doctor.Registro_Datos || '{}'); } catch(_) {}

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
            // regDatos.hasProMode puede venir del admin para override del plan
            hasProMode:       regDatos.hasProMode !== undefined ? !!regDatos.hasProMode : pc.hasProMode,
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

        // ── Cargar datos enriquecidos del registro ─────────────────────────────
        // (regDatos ya fue parseado arriba, antes de clientConfig)

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
                        footer:  wp.footer  || regDatos.footerText || '',
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
                                    footer:  ewp.footer  || regDatos.footerText || '',
                                    logo:    ewp.logo    || '',
                                    professionals: [buildProfessional()]
                                });
                            }
                        });
                    }

                    window._wpProfilesCache = workplaceProfiles;
                    if (typeof appDB !== 'undefined') appDB.set('workplace_profiles', workplaceProfiles);
                    localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));

                    // ── CLINIC mode: si vienen múltiples profesionales, poblar el primer workplace ──
                    // regDatos.profesionales (de Registro_Datos) o doctor.Profesionales (campo top-level)
                    let clinicProfs = [];
                    try {
                        clinicProfs = regDatos.profesionales || JSON.parse(doctor.Profesionales || '[]');
                    } catch(_) {}
                    if (Array.isArray(clinicProfs) && clinicProfs.length > 1) {
                        workplaceProfiles[0].professionals = clinicProfs.map(function(p) {
                            return {
                                nombre:         p.nombre        || '',
                                matricula:      p.matricula     || '',
                                especialidades: p.especialidad  || p.especialidades || '',
                                telefono:       p.telefono      || '',
                                email:          p.email         || '',
                                firma:          p.firma         || '',
                                logo:           p.logo          || ''
                            };
                        });
                        // Re-guardar con la lista completa de profesionales
                        window._wpProfilesCache = workplaceProfiles;
                        if (typeof appDB !== 'undefined') appDB.set('workplace_profiles', workplaceProfiles);
                        localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));
                    }

                    // Actualizar prof_data con workplace
                    profData.workplace = wp.name || '';
                    window._profDataCache = profData;
                    if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
                    localStorage.setItem('prof_data', JSON.stringify(profData));
                }
            } catch(_) {}
        }

        // Firma del profesional (base64) → guardar en la key que pdfMaker lee
        if (regDatos.firma) {
            try {
                if (typeof appDB !== 'undefined') appDB.set('pdf_signature', regDatos.firma);
                localStorage.setItem('pdf_signature', regDatos.firma);
            } catch(_) {}
        }

        // Logo profesional (base64) → guardar en la key que pdfMaker lee
        if (regDatos.proLogo) {
            try {
                if (typeof appDB !== 'undefined') appDB.set('pdf_logo', regDatos.proLogo);
                localStorage.setItem('pdf_logo', regDatos.proLogo);
            } catch(_) {}
        }

        // Tamaño del logo profesional en PDF
        if (regDatos.proLogoSize) {
            try {
                if (typeof appDB !== 'undefined') appDB.set('prof_logo_size_px', regDatos.proLogoSize);
                localStorage.setItem('prof_logo_size_px', String(regDatos.proLogoSize));
            } catch(_) {}
        }

        // Tamaño del logo institucional en PDF
        if (regDatos.instLogoSize) {
            try {
                if (typeof appDB !== 'undefined') appDB.set('inst_logo_size_px', regDatos.instLogoSize);
                localStorage.setItem('inst_logo_size_px', String(regDatos.instLogoSize));
            } catch(_) {}
        }

        // Header Color del PDF (solo afecta informes, NO el color de la app)
        if (regDatos.headerColor) {
            profData.headerColor = regDatos.headerColor;
            window._profDataCache = profData;
            if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
            localStorage.setItem('prof_data', JSON.stringify(profData));
            // NO aplicar como customPrimaryColor: el color de encabezado del informe
            // es independiente del color primario de la app
        }

        // Skin siempre arranca en 'default' en el primer uso — cada usuario parte
        // de la app original. Si después quiere cambiar a cyberpunk, etc., ese
        // cambio queda solo en SU dispositivo y no afecta a ningún otro clone.
        localStorage.setItem('app_skin', 'default');
        if (typeof appDB !== 'undefined') appDB.set('app_skin', 'default');
        if (window.ThemeManager && typeof window.ThemeManager.apply === 'function') {
            window.ThemeManager.apply('default', { save: false });
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

        // Footer text del PDF → guardar en pdf_config directamente
        if (regDatos.footerText) {
            try {
                const existingCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
                existingCfg.footerText = regDatos.footerText;
                if (typeof appDB !== 'undefined') appDB.set('pdf_config', existingCfg);
                localStorage.setItem('pdf_config', JSON.stringify(existingCfg));
                window._pdfConfigCache = existingCfg;
            } catch(_) {}
        }

        // API Key (si el admin la configuró en el Sheet o viene en Registro_Datos)
        const apiKey   = doctor.API_Key    || regDatos.apiKey   || '';
        const apiKeyB1 = doctor.API_Key_B1 || regDatos.apiKeyB1 || '';
        const apiKeyB2 = doctor.API_Key_B2 || regDatos.apiKeyB2 || '';
        if (apiKey) {
            if (typeof appDB !== 'undefined') appDB.set('groq_api_key', apiKey);
            localStorage.setItem('groq_api_key', apiKey);
        }
        if (apiKeyB1) {
            if (typeof appDB !== 'undefined') appDB.set('groq_api_key_b1', apiKeyB1);
            localStorage.setItem('groq_api_key_b1', apiKeyB1);
        }
        if (apiKeyB2) {
            if (typeof appDB !== 'undefined') appDB.set('groq_api_key_b2', apiKeyB2);
            localStorage.setItem('groq_api_key_b2', apiKeyB2);
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

    // PWA: ofrecer instalar la app en cada visita (si no está instalada todavía)
    if (!window.matchMedia('(display-mode: standalone)').matches) {
        _tryPwaInstall(3);
    }
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

    // K1: Si la API key ya fue precargada por el admin → ocultar el paso;
    // si NO hay key disponible → mostrar el paso para que el cliente la ingrese.
    const apiStep = document.getElementById('onboardingApiKeyStep');
    if (apiStep) {
        const hasKey = !!(localStorage.getItem('groq_api_key'));
        apiStep.style.display = hasKey ? 'none' : '';
    }

    // Crear partículas decorativas
    _createOnboardingParticles();

    overlay.classList.add('active');

    // ─── Step navigation ─────────────────────────────────
    function goToStep(step) {
        const prev = document.getElementById('onboardingStep' + currentStep);
        const next = document.getElementById('onboardingStep' + step);
        if (!prev || !next) return;

        // Ajustar ancho del modal para paso 3 (tiene vista previa side-by-side)
        const modal = document.querySelector('.onboarding-modal');
        if (modal) {
            modal.style.maxWidth = (step === 3) ? '720px' : '520px';
            modal.style.transition = 'max-width 0.3s ease';
        }

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

    // Botones next/back (4 pasos: Bienvenida, Datos, Config, T&C)
    const next1 = document.getElementById('onboardingNext1');
    const next2 = document.getElementById('onboardingNext2');
    const next3 = document.getElementById('onboardingNext3');
    const back2 = document.getElementById('onboardingBack2');
    const back3 = document.getElementById('onboardingBack3');
    const back4 = document.getElementById('onboardingBack4');

    if (next1) next1.addEventListener('click', () => goToStep(2));
    if (next2) next2.addEventListener('click', () => {
        _initOnbStep3();
        goToStep(3);
    });
    if (back2) back2.addEventListener('click', () => goToStep(1));
    if (back3) back3.addEventListener('click', () => goToStep(2));
    if (next3) next3.addEventListener('click', () => { _saveOnbConfig(); goToStep(4); });
    if (back4) back4.addEventListener('click', () => goToStep(3));

    // ── Config Asistida: helpers ──────────────────────────────────────
    const _isProUser = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.hasProMode) || ['ADMIN','PRO'].includes(CLIENT_CONFIG?.type);

    function _initOnbStep3() {
        const palette = document.getElementById('onbColorPalette');
        if (!palette || palette.children.length) return; // ya inicializado
        const presetColors = ['#1a56a0','#0f766e','#7c3aed','#dc2626','#c2410c','#0369a1','#1d4ed8','#374151'];
        const savedColor = (profData.headerColor || '#1a56a0').toLowerCase();
        presetColors.forEach(c => {
            const sw = document.createElement('div');
            sw.className = 'onb-color-swatch' + (c === savedColor ? ' selected' : '');
            sw.style.background = c;
            sw.dataset.color = c;
            sw.title = c;
            sw.addEventListener('click', () => {
                palette.querySelectorAll('.onb-color-swatch').forEach(s => s.classList.remove('selected'));
                sw.classList.add('selected');
                // Actualizar solo la mini vista previa del informe, NO el color de la app
                _updateOnbPreview();
            });
            palette.appendChild(sw);
        });
        // Seleccionar 1er color si ninguno coincide
        if (!palette.querySelector('.onb-color-swatch.selected')) palette.firstChild?.classList.add('selected');
        // Botones de margen
        document.querySelectorAll('.onb-margin-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.onb-margin-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                _updateOnbPreview();
            });
        });
        // PRO gate: Firma y QR solo para PRO
        const firmaToggle = document.getElementById('onbToggleFirma');
        const qrToggle = document.getElementById('onbToggleQR');
        const firmaBadge = document.getElementById('onbFirmaBadge');
        if (_isProUser) {
            if (firmaToggle) firmaToggle.checked = true;
            if (qrToggle) qrToggle.checked = true;
        } else {
            // Normal: deshabilitar firma y QR, mostrar badge PRO en firma
            if (firmaBadge) firmaBadge.style.display = '';
            if (firmaToggle) {
                firmaToggle.checked = false;
                firmaToggle.disabled = true;
                const firmaNote = firmaToggle.closest('.onb-config-card')?.querySelector('small');
                if (firmaNote) firmaNote.textContent = 'Solo disponible en plan PRO';
            }
            if (qrToggle) {
                qrToggle.disabled = true;
                const note = document.getElementById('onbQrNote');
                if (note) note.textContent = 'Solo disponible en plan PRO';
            }
        }
        // Listeners para actualizar vista previa en vivo
        ['onbToggleFirma','onbToggleLogoProf','onbToggleLogoInst','onbToggleQR'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => _updateOnbPreview());
        });
        // Inicializar vista previa
        _updateOnbPreview();
    }

    /** Actualiza la mini vista previa del informe en el paso 3 */
    function _updateOnbPreview() {
        const preview = document.getElementById('onbPdfPreview');
        if (!preview) return;
        const selectedColor = document.querySelector('#onbColorPalette .onb-color-swatch.selected')?.dataset.color || '#1a56a0';
        const showFirma   = document.getElementById('onbToggleFirma')?.checked ?? true;
        const showLogoPro = document.getElementById('onbToggleLogoProf')?.checked ?? true;
        const showLogoInst = document.getElementById('onbToggleLogoInst')?.checked ?? true;
        const showQR      = document.getElementById('onbToggleQR')?.checked ?? false;
        const activeMargin = document.querySelector('.onb-margin-btn.active')?.dataset.margin || 'normal';
        const marginPx = activeMargin === 'narrow' ? '8px' : activeMargin === 'wide' ? '22px' : '14px';
        const profName = profData.nombre || 'Dr. Juan Pérez';
        const profMat = profData.matricula || 'MP 12345';
        preview.innerHTML = `
            <div class="onb-prev-page" style="padding:${marginPx};">
                <!-- Institución -->
                <div class="onb-prev-inst" style="${showLogoInst ? '' : 'opacity:0.25;'}">
                    <div class="onb-prev-inst-logo" style="${showLogoInst ? '' : 'background:#ddd;'}">🏥</div>
                    <div class="onb-prev-inst-text">
                        <div style="font-weight:700;font-size:6px;color:#333;">Centro Médico</div>
                        <div style="font-size:4.5px;color:#888;">Av. Ejemplo 1234 • Tel: 0341-4567890</div>
                    </div>
                </div>
                <!-- Encabezado profesional -->
                <div class="onb-prev-header" style="border-color:${selectedColor};">
                    <div style="display:flex;align-items:center;gap:4px;">
                        ${showLogoPro ? '<div class="onb-prev-prof-logo">👨‍⚕️</div>' : ''}
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;font-size:5.5px;color:${selectedColor};">${profName}</div>
                            <div style="font-size:4.5px;color:#666;">${profMat}</div>
                        </div>
                        <div style="font-size:4px;color:#999;">01/03/2026</div>
                    </div>
                </div>
                <!-- Datos paciente -->
                <div class="onb-prev-patient">
                    <div class="onb-prev-field"><span class="onb-prev-lbl">Paciente</span> <span>María García</span></div>
                    <div class="onb-prev-field"><span class="onb-prev-lbl">DNI</span> <span>30.123.456</span></div>
                    <div class="onb-prev-field"><span class="onb-prev-lbl">Edad</span> <span>45 años</span></div>
                </div>
                <!-- Estudio -->
                <div style="margin:3px 0;padding:2px 0;border-bottom:1px solid #eee;">
                    <div style="display:flex;gap:6px;">
                        <span style="font-size:4.5px;color:${selectedColor};font-weight:700;">ESTUDIO:</span>
                        <span style="font-size:4.5px;color:#555;">Ecografía abdominal</span>
                    </div>
                </div>
                <!-- Contenido -->
                <div class="onb-prev-body">
                    <div style="font-size:5px;font-weight:700;color:${selectedColor};margin-bottom:2px;">HALLAZGOS</div>
                    <div class="onb-prev-line" style="width:100%;"></div>
                    <div class="onb-prev-line" style="width:90%;"></div>
                    <div class="onb-prev-line" style="width:95%;"></div>
                    <div class="onb-prev-line" style="width:70%;"></div>
                    <div style="font-size:5px;font-weight:700;color:${selectedColor};margin:4px 0 2px;">CONCLUSIÓN</div>
                    <div class="onb-prev-line" style="width:85%;"></div>
                    <div class="onb-prev-line" style="width:60%;"></div>
                </div>
                <!-- Firma -->
                <div class="onb-prev-firma" style="${showFirma ? '' : 'opacity:0.2;'}">
                    ${showFirma ? '<div style="font-size:10px;margin-bottom:1px;">✍️</div>' : ''}
                    <div style="width:40px;border-top:1px solid #666;margin:0 auto;"></div>
                    <div style="font-size:4.5px;color:#555;margin-top:1px;">${profName}</div>
                    <div style="font-size:4px;color:#888;">${profMat}</div>
                </div>
                <!-- QR -->
                ${showQR ? '<div class="onb-prev-qr"><div style="width:18px;height:18px;background:#f0f0f0;border:1px solid #ddd;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:9px;">📱</div><div style="font-size:3.5px;color:#aaa;">QR Verificación</div></div>' : ''}
            </div>
        `;
    }

    function _saveOnbConfig() {
        const selectedSwatch = document.querySelector('#onbColorPalette .onb-color-swatch.selected');
        if (selectedSwatch) {
            const color = selectedSwatch.dataset.color;
            profData.headerColor = color;
            window._profDataCache = profData;
            localStorage.setItem('prof_data', JSON.stringify(profData));
            if (typeof appDB !== 'undefined') appDB.set('prof_data', profData);
            // NO guardar como customPrimaryColor: el color de encabezado del informe
            // es independiente del color primario de la app
        }
        const pdfCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        pdfCfg.showSignImage = document.getElementById('onbToggleFirma')?.checked ?? true;
        pdfCfg.showHeader    = document.getElementById('onbToggleLogoInst')?.checked ?? true;
        pdfCfg.showLogoProfessional = document.getElementById('onbToggleLogoProf')?.checked ?? true;
        pdfCfg.showQR        = document.getElementById('onbToggleQR')?.checked ?? false;
        const activeMarginBtn = document.querySelector('.onb-margin-btn.active');
        if (activeMarginBtn) pdfCfg.margins = activeMarginBtn.dataset.margin;
        localStorage.setItem('pdf_config', JSON.stringify(pdfCfg));
        if (typeof appDB !== 'undefined') appDB.set('pdf_config', pdfCfg);
    }

    function _initOnbStep4() {
        const container = document.getElementById('onbWpCards');
        if (!container) return;
        container.innerHTML = '';
        const wps = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        if (wps.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);font-size:0.84rem;padding:1.2rem 0;">Sin lugares de trabajo precargados.<br><small>Podés agregar uno después en Configuración.</small></p>';
            return;
        }
        wps.forEach((wp, i) => {
            const card = document.createElement('label');
            card.className = 'onb-wp-card' + (i === 0 ? ' selected' : '');
            card.innerHTML = `<input type="radio" name="onbWp" value="${i}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--primary);flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.87rem;color:var(--text-primary)">${wp.name || 'Lugar ' + (i + 1)}</div>
                    ${wp.address ? `<div style="font-size:0.73rem;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${wp.address}</div>` : ''}
                </div>`;
            card.addEventListener('click', () => {
                container.querySelectorAll('.onb-wp-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
            container.appendChild(card);
        });
    }

    function _saveOnbWorkplace() {
        const selected = document.querySelector('input[name="onbWp"]:checked');
        if (!selected) return;
        const pdfCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        pdfCfg.activeWorkplaceIndex = parseInt(selected.value);
        localStorage.setItem('pdf_config', JSON.stringify(pdfCfg));
        if (typeof appDB !== 'undefined') appDB.set('pdf_config', pdfCfg);
    }

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
