
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

    let _editingWorkplaceIndex = null;

    function _resetWorkplaceForm() {
        ['wpName', 'wpAddress', 'wpPhone', 'wpEmail', 'wpFooter', 'wpLogo'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'INPUT' && el.type === 'file') {
                el.value = '';
            } else {
                el.value = '';
            }
        });
        const title = document.getElementById('workplaceModalTitle');
        if (title) title.textContent = '🏥 Agregar Lugar de Trabajo';
        const saveBtn = document.getElementById('btnSaveWorkplace');
        if (saveBtn) saveBtn.textContent = '💾 Guardar lugar';
        _editingWorkplaceIndex = null;
    }

    function openWorkplaceModalForCreate() {
        _resetWorkplaceForm();
        document.getElementById('workplaceModalOverlay')?.classList.add('active');
    }

    function openWorkplaceModalForEdit(index) {
        const wpIndex = Number(index);
        const profile = workplaceProfiles[wpIndex];
        if (!profile) {
            if (typeof showToast === 'function') showToast('Seleccioná un lugar válido para editar', 'warning');
            return;
        }
        _editingWorkplaceIndex = wpIndex;
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        setVal('wpName', profile.name);
        setVal('wpAddress', profile.address);
        setVal('wpPhone', profile.phone);
        setVal('wpEmail', profile.email);
        setVal('wpFooter', profile.footer);
        const wpLogoInput = document.getElementById('wpLogo');
        if (wpLogoInput) wpLogoInput.value = '';

        const title = document.getElementById('workplaceModalTitle');
        if (title) title.textContent = '🏥 Editar Lugar de Trabajo';
        const saveBtn = document.getElementById('btnSaveWorkplace');
        if (saveBtn) saveBtn.textContent = '💾 Guardar cambios';
        document.getElementById('workplaceModalOverlay')?.classList.add('active');
    }

    window.openWorkplaceModalForCreate = openWorkplaceModalForCreate;
    window.openWorkplaceModalForEdit = openWorkplaceModalForEdit;
    window.resetWorkplaceModalForm = _resetWorkplaceForm;

    // ── dropdown de lugares ──────────────────────────────────────────────────
    function populateWorkplaceDropdown() {
        const sel   = document.getElementById('pdfWorkplace');
        if (!sel) return;
        const normName = (v) => (typeof window.normalizeFieldText === 'function')
            ? window.normalizeFieldText(String(v || ''), 'name')
            : String(v || '');
        const current = sel.value;
        sel.innerHTML = '<option value="">Seleccionar lugar...</option>';
        workplaceProfiles.forEach((p, i) => {
            const label = normName(p.name || `Lugar ${i + 1}`);
            const o = document.createElement('option'); o.value = i; o.textContent = label; sel.appendChild(o);
        });
        if (current !== '') sel.value = current;
    }
    // exponer globalmente para pdfPreview.js
    window.populateWorkplaceDropdown = populateWorkplaceDropdown;

    function loadWorkplaceProfile(index) {
        const profile = workplaceProfiles[index];
        if (!profile) return;
        const normName = (v) => (typeof window.normalizeFieldText === 'function')
            ? window.normalizeFieldText(String(v || ''), 'name')
            : String(v || '');
        const addr    = document.getElementById('pdfWorkplaceAddress');
        const phone   = document.getElementById('pdfWorkplacePhone');
        const email   = document.getElementById('pdfWorkplaceEmail');
        const footer  = document.getElementById('pdfFooterText');
        const logo    = document.getElementById('pdfLogoPreview');
        if (addr)   addr.value   = normName(profile.address || '');
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

        // Limpiar badge previo si existe
        var oldBadge = document.getElementById('activeProfBadge');
        if (oldBadge) oldBadge.remove();

        if (profs.length === 0) {
            group.style.display = 'none';
            sel.innerHTML = '<option value="">Seleccionar profesional...</option>';
            return;
        }

        // C5: 1 profesional → ocultar dropdown, mostrar badge con nombre
        if (profs.length === 1) {
            group.style.display = 'none';
            sel.innerHTML = '<option value="0">' + (profs[0].nombre || 'Profesional') + '</option>';
            sel.value = '0';
            var badge = document.createElement('span');
            badge.id = 'activeProfBadge';
            badge.textContent = '👤 ' + (profs[0].nombre || 'Profesional');
            badge.style.cssText = 'display:inline-block;padding:3px 10px;background:var(--primary-light,#e0f2fe);color:var(--primary,#0f766e);border-radius:12px;font-size:0.82rem;font-weight:600;margin-top:4px;';
            group.parentNode.insertBefore(badge, group.nextSibling);
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
        ['proNombre','proMatricula','proEspecialidades','proTelefono','proEmail',
         'proWhatsapp','proInstagram','proFacebook','proX','proYoutube'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const proSexoEl = document.getElementById('proSexo');
        if (proSexoEl) proSexoEl.value = '';
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
            const proSexoEl = document.getElementById('proSexo');
            if (proSexoEl) proSexoEl.value = p.sexo || '';
            const proWaEl = document.getElementById('proWhatsapp');
            if (proWaEl) proWaEl.value = p.whatsapp || '';
            const proIgEl = document.getElementById('proInstagram');
            if (proIgEl) proIgEl.value = p.instagram || '';
            const proFbEl = document.getElementById('proFacebook');
            if (proFbEl) proFbEl.value = p.facebook || '';
            const proXEl = document.getElementById('proX');
            if (proXEl) proXEl.value = p.x || '';
            const proYtEl = document.getElementById('proYoutube');
            if (proYtEl) proYtEl.value = p.youtube || '';
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
                sexo:          document.getElementById('proSexo')?.value                   || '',
                matricula:     document.getElementById('proMatricula')?.value?.trim()      || '',
                especialidades:document.getElementById('proEspecialidades')?.value?.trim() || '',
                telefono:      document.getElementById('proTelefono')?.value?.trim()       || '',
                email:         document.getElementById('proEmail')?.value?.trim()          || '',
                whatsapp:      document.getElementById('proWhatsapp')?.value?.trim()       || '',
                instagram:     document.getElementById('proInstagram')?.value?.trim()      || '',
                facebook:      document.getElementById('proFacebook')?.value?.trim()       || '',
                x:             document.getElementById('proX')?.value?.trim()              || '',
                youtube:       document.getElementById('proYoutube')?.value?.trim()        || '',
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
            const wpIndex = parseInt(e.target.value);
            loadWorkplaceProfile(wpIndex);

            // Sincronizar selección de lugar para preview/export aunque no cambie profesional.
            const cfg = getProfConfig();
            cfg.activeWorkplaceIndex = String(wpIndex);
            // Al cambiar de lugar, el profesional seleccionado deja de ser confiable hasta nueva selección.
            delete cfg.activeProfessionalIndex;
            setProfConfig(cfg);
        } else {
            // Si se deselecciona el lugar, ocultar el grupo de profesionales
            const group = document.getElementById('pdfProfessionalGroup');
            if (group) group.style.display = 'none';

            const cfg = getProfConfig();
            delete cfg.activeWorkplaceIndex;
            delete cfg.activeProfessionalIndex;
            setProfConfig(cfg);
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
        const normName = (v) => (typeof window.normalizeFieldText === 'function')
            ? window.normalizeFieldText(String(v || ''), 'name')
            : String(v || '');
        const name = normName(document.getElementById('wpName')?.value?.trim());
        if (!name) { showToast('Ingrese un nombre para el lugar', 'error'); return; }

        const logoInput = document.getElementById('wpLogo');
        const isEditing = _editingWorkplaceIndex !== null;
        const currentProfile = isEditing ? workplaceProfiles[_editingWorkplaceIndex] : null;
        const profile = {
            name,
            address:       normName(document.getElementById('wpAddress')?.value?.trim() || ''),
            phone:         document.getElementById('wpPhone')?.value?.trim()   || '',
            email:         document.getElementById('wpEmail')?.value?.trim()   || '',
            footer:        document.getElementById('wpFooter')?.value?.trim()  || '',
            logo:          currentProfile?.logo || null,
            professionals: Array.isArray(currentProfile?.professionals) ? currentProfile.professionals : [],
        };

        const save = (savedLogo) => {
            if (savedLogo !== undefined) profile.logo = savedLogo;
            let selectedIdx;
            if (isEditing) {
                workplaceProfiles[_editingWorkplaceIndex] = profile;
                selectedIdx = _editingWorkplaceIndex;
            } else {
                workplaceProfiles.push(profile);
                selectedIdx = workplaceProfiles.length - 1;
            }
            saveProfiles();
            populateWorkplaceDropdown();

            const wpSelect = document.getElementById('pdfWorkplace');
            if (wpSelect) {
                wpSelect.value = String(selectedIdx);
                wpSelect.dispatchEvent(new Event('change'));
            }

            document.getElementById('workplaceModalOverlay')?.classList.remove('active');
            _resetWorkplaceForm();
            showToast(isEditing ? 'Lugar actualizado ✓' : 'Lugar guardado ✓', 'success');
        };

        if (logoInput?.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (e) => { save(e.target.result); };
            reader.readAsDataURL(logoInput.files[0]);
        } else {
            save(profile.logo);
        }
    });

    populateWorkplaceDropdown();
}

// ---- Original initBusinessSuite updated ----
window.initBusinessSuite = async function () {
    // Guardia critica: la URL base oficial SIEMPRE debe abrir como ADMIN
    // (excepto links de fabrica con ?id=...)
    try {
        const host = String(window.location.hostname || '').toLowerCase();
        const path = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
        const params = new URLSearchParams(window.location.search);
        const setupIdFromUrl = params.get('id');
        let setupIdFromSession = '';
        try { setupIdFromSession = sessionStorage.getItem('pending_setup_id') || ''; } catch (_) {}
        const effectiveSetupId = String(window._PENDING_SETUP_ID || setupIdFromUrl || setupIdFromSession || '').trim();

        if (effectiveSetupId) {
            window._PENDING_SETUP_ID = effectiveSetupId;
            try { sessionStorage.setItem('pending_setup_id', effectiveSetupId); } catch (_) {}
            if (setupIdFromUrl) {
                try { history.replaceState({}, document.title, window.location.pathname); } catch (_) {}
            }
        }

        const isOfficialAdminBase = (
            host === 'transcriptorpro.github.io'
            && (path === '/transcripcion' || path === '/transcripcion/index.html')
        );

        if (isOfficialAdminBase && !effectiveSetupId && !window._PENDING_SETUP_ID) {
            let hasClientConfig = false;
            try {
                const storedCfgRaw = localStorage.getItem('client_config_stored');
                if (storedCfgRaw) {
                    const storedCfg = JSON.parse(storedCfgRaw);
                    if (storedCfg && storedCfg.type && storedCfg.type !== 'ADMIN') {
                        if (typeof window.CLIENT_CONFIG === 'object' && window.CLIENT_CONFIG) {
                            Object.assign(window.CLIENT_CONFIG, storedCfg);
                        }
                        hasClientConfig = true;
                    }
                }
            } catch (_) {}

            if (hasClientConfig) {
                _initClient();
                return;
            }

            try { localStorage.removeItem('client_config_stored'); } catch (_) {}
            try { sessionStorage.removeItem('pending_setup_id'); } catch (_) {}
            if (typeof window.CLIENT_CONFIG === 'object' && window.CLIENT_CONFIG) {
                window.CLIENT_CONFIG.type = 'ADMIN';
            }
            _initAdmin();
            return;
        }
    } catch (_) {}

    // ── Interceptar link de la fábrica (?id=MED001) ──────────────────────────
    if (window._PENDING_SETUP_ID) {
        // ── Protección: si ya era ADMIN, confirmar antes de sobreescribir ──
        if (window._ADMIN_WAS_ACTIVE) {
            const confirmMessage = 'Estás abriendo un link de usuario en tu sesión de ADMINISTRADOR.\n\nSi continúas, tu sesión admin se convertirá en la del usuario "' + window._PENDING_SETUP_ID + '".\n\n¿Querés continuar?';
            const confirmar = typeof window.showCustomConfirm === 'function'
                ? await window.showCustomConfirm('⚠️ Atención', confirmMessage)
                : (typeof window.confirm === 'function' ? window.confirm(confirmMessage) : true);
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

    const isAdmin = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN');

    if (isAdmin) {
        // Verificar que realmente hay config almacenada para confirmar que es ADMIN legítimo
        const storedConfig = localStorage.getItem('client_config_stored');
        if (!storedConfig && typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN') {
            // CLIENT_CONFIG es ADMIN por defecto (no hay config guardada) — es el admin legítimo
            _initAdmin();
        } else if (storedConfig) {
            try {
                const cfg = JSON.parse(storedConfig);
                if (cfg.type === 'ADMIN') _initAdmin();
                else _initClient();
            } catch (_) {
                _initClient(); // Config corrupta → modo cliente seguro
            }
        } else {
            _initAdmin();
        }
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
// ============ FACTORY SETUP WRAPPER (extraido) ============
// Compat tests (texto): _handleFactorySetup | crypto.randomUUID | localStorage.setItem('client_config_stored')
/* Compat tests planMap:
trial: { type: 'TRIAL', hasProMode: false, hasDashboard: false, canGenerateApps: false }
normal: { type: 'NORMAL', hasProMode: false, hasDashboard: false, canGenerateApps: false }
pro: { type: 'PRO', hasProMode: true, hasDashboard: true, canGenerateApps: false }
gift: { type: 'PRO', hasProMode: true, hasDashboard: true, canGenerateApps: false }
clinic: { type: 'PRO', hasProMode: true, hasDashboard: true, canGenerateApps: true }
enterprise: { type: 'PRO', hasProMode: true, hasDashboard: true, canGenerateApps: false }
*/
async function _handleFactorySetup(medicoId) {
    if (typeof window.handleFactorySetupCore === 'function') {
        return window.handleFactorySetupCore(medicoId);
    }
    console.error('[Factory] handleFactorySetupCore no disponible');
    if (typeof _showSetupError === 'function') {
        _showSetupError('No se pudo iniciar la configuración automática. Recargá la página.', 'MISSING_CORE');
    }
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
    window.GROQ_API_KEY = (typeof window.getResolvedGroqApiKey === 'function')
        ? window.getResolvedGroqApiKey()
        : (localStorage.getItem('groq_api_key') || '');

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

// ─── Onboarding de cliente: bienvenida espectacular multi-step + T&C ──────────

