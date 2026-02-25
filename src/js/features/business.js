
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

    _initCommonModules();

    try {
        if (typeof applyProfessionalData === 'function') applyProfessionalData(adminProfData);
        if (typeof updatePersonalization === 'function') updatePersonalization(adminProfData);
        if (typeof initializeMode === 'function') initializeMode();
    } catch (e) {
        console.error('Error inicializando datos admin:', e);
    }

    // Admin NO ve Session Assistant (es solo para clones/clientes)

    // Cargar datos de prueba si no hay workplaces configurados
    _loadAdminTestData();

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
// Base de datos simulada COMPLETA para testing.
// Se cargan SOLO si no hay workplaces configurados.
// Al resetear la app, se re-cargan automáticamente.
//
// ESTRUCTURA:
//   8 lugares de trabajo (3 clínicas + 5 consultorios personales)
//   20 profesionales de 10 especialidades distintas
//   20 perfiles de salida descriptivos (combinación lugar + médico + estudio)
//   15 pacientes ficticios con datos completos
//
// Los perfiles de salida tienen nombres descriptivos tipo:
//   "🫀 Eco-stress — Dr. Ruiz — Clínica del Sur"
//   "🫁 Espirometría — Dr. Gómez — Consultorio de la Costa"
// para que el admin pueda elegir rápido sin inventar datos.
function _loadAdminTestData() {
    const existing = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
    if (existing.length > 0) return; // ya hay datos, no sobreescribir

    // ══════════════════════════════════════════════════════════════════
    // ██ LUGARES DE TRABAJO + PROFESIONALES
    // ══════════════════════════════════════════════════════════════════
    const testWorkplaces = [

        // ───── 0: CLÍNICA GRANDE — Clínica del Sur (4 médicos) ──────
        {
            name: 'Clínica del Sur — Sede Lanús',
            address: 'Hipólito Yrigoyen 3850, Lanús, Buenos Aires',
            phone: '(011) 4241-5500',
            email: 'info@clinicadelsur.com.ar',
            footer: 'Clínica del Sur — Compromiso con tu salud desde 1998',
            logo: null,
            professionals: [
                { nombre: 'Dr. Alejandro Ruiz',   matricula: 'MP 22.510', especialidades: 'Cardiología, Ecocardiografía, Eco-stress, Holter',     telefono: '(011) 4241-5501', email: 'a.ruiz@clinicadelsur.com.ar',   firma: null, logo: null },
                { nombre: 'Dr. Fernando Suárez',   matricula: 'MP 28.190', especialidades: 'ORL, Laringoscopía, Nasofibroscopía, Audiometría',     telefono: '(011) 4241-5503', email: 'f.suarez@clinicadelsur.com.ar', firma: null, logo: null },
                { nombre: 'Dra. Mariana López',    matricula: 'MP 41.005', especialidades: 'Gastroenterología, Colonoscopía, Endoscopía alta',     telefono: '(011) 4241-5504', email: 'm.lopez@clinicadelsur.com.ar',  firma: null, logo: null },
                { nombre: 'Dr. Ignacio Ríos',      matricula: 'MP 33.415', especialidades: 'Neumonología, Espirometría, Pletismografía',           telefono: '(011) 4241-5505', email: 'i.rios@clinicadelsur.com.ar',   firma: null, logo: null }
            ]
        },

        // ───── 1: CLÍNICA MEDIANA — Centro Médico San Martín (4 médicos) ─
        {
            name: 'Centro Médico San Martín',
            address: 'Av. Rivadavia 4500, Piso 3, CABA',
            phone: '(011) 4902-3344',
            email: 'turnos@centrosanmartin.com.ar',
            footer: 'Centro Médico San Martín — Atención integral del paciente',
            logo: null,
            professionals: [
                { nombre: 'Dra. Lucía Fernández',  matricula: 'MN 52.310', especialidades: 'Gastroenterología, Endoscopía, Colonoscopía, CPRE',   telefono: '(011) 5555-0102', email: 'l.fernandez@centrosanmartin.com.ar', firma: null, logo: null },
                { nombre: 'Dr. Martín Álvarez',    matricula: 'MN 38.675', especialidades: 'Neumonología, Espirometría, Test de marcha',           telefono: '(011) 5555-0103', email: 'm.alvarez@centrosanmartin.com.ar',   firma: null, logo: null },
                { nombre: 'Dra. Carolina Paz',      matricula: 'MN 34.821', especialidades: 'Neurología, Electromiografía, Polisomnografía',       telefono: '(011) 5555-0104', email: 'c.paz@centrosanmartin.com.ar',       firma: null, logo: null },
                { nombre: 'Dra. Paula Iglesias',    matricula: 'MN 47.102', especialidades: 'Ginecología, Colposcopía, PAP',                       telefono: '(011) 5555-0105', email: 'p.iglesias@centrosanmartin.com.ar',  firma: null, logo: null }
            ]
        },

        // ───── 2: CLÍNICA GRANDE — Instituto de Diagnóstico del Litoral (4 médicos) ─
        {
            name: 'Instituto de Diagnóstico del Litoral',
            address: 'Bv. Oroño 1200, Rosario, Santa Fe',
            phone: '(0341) 449-6000',
            email: 'turnos@idlitoral.com.ar',
            footer: 'IDL — Diagnóstico por imágenes y estudios funcionales',
            logo: null,
            professionals: [
                { nombre: 'Dr. Gonzalo Peralta',     matricula: 'MP 8.215',  especialidades: 'Imágenes, Ecografía Abdominal, Eco Doppler',         telefono: '(0341) 449-6001', email: 'g.peralta@idlitoral.com.ar',    firma: null, logo: null },
                { nombre: 'Dra. Sofía Ramírez',      matricula: 'MP 12.740', especialidades: 'Cardiología, Eco-stress, Ecocardiograma, ECG',       telefono: '(0341) 449-6002', email: 's.ramirez@idlitoral.com.ar',    firma: null, logo: null },
                { nombre: 'Dr. Emilio Córdoba',       matricula: 'MP 7.603',  especialidades: 'Gastroenterología, Endoscopía, Broncoscopía',        telefono: '(0341) 449-6005', email: 'e.cordoba@idlitoral.com.ar',    firma: null, logo: null },
                { nombre: 'Dra. Natalia Vega',        matricula: 'MP 14.892', especialidades: 'Neurología, EEG, Potenciales evocados',               telefono: '(0341) 449-6004', email: 'n.vega@idlitoral.com.ar',       firma: null, logo: null }
            ]
        },

        // ───── 3: CONSULTORIO PERSONAL — Dr. Gómez (Neumólogo, 3 lugares) ─
        {
            name: 'Consultorio Dr. Gómez — Costa',
            address: 'Av. Colón 1500, Mar del Plata, Buenos Aires',
            phone: '(0223) 495-3210',
            email: 'gomez.neumo@gmail.com',
            footer: 'Dr. Ramiro Gómez — Neumonología',
            logo: null,
            professionals: [
                { nombre: 'Dr. Ramiro Gómez', matricula: 'MP 18.440', especialidades: 'Neumonología, Espirometría, Test de marcha, Pletismografía', telefono: '(0223) 495-3210', email: 'gomez.neumo@gmail.com', firma: null, logo: null }
            ]
        },
        {
            name: 'Consultorio Dr. Gómez — Miramar',
            address: 'Calle 21 Nº 854, Miramar, Buenos Aires',
            phone: '(02291) 43-2100',
            email: 'gomez.neumo@gmail.com',
            footer: 'Dr. Ramiro Gómez — Neumonología',
            logo: null,
            professionals: [
                { nombre: 'Dr. Ramiro Gómez', matricula: 'MP 18.440', especialidades: 'Neumonología, Espirometría, Test de marcha, Pletismografía', telefono: '(02291) 43-2100', email: 'gomez.neumo@gmail.com', firma: null, logo: null }
            ]
        },

        // ───── 5: CONSULTORIO PERSONAL — Dra. Méndez (Oftalmóloga, 2 lugares) ─
        {
            name: 'Consultorio Dra. Méndez — CABA',
            address: 'Juncal 1280, 2ºB, CABA',
            phone: '(011) 4815-7722',
            email: 'valeria@dramendez.com.ar',
            footer: 'Dra. Valeria Méndez — Oftalmología',
            logo: null,
            professionals: [
                { nombre: 'Dra. Valeria Méndez', matricula: 'MN 61.204', especialidades: 'Oftalmología, Campimetría, Topografía corneal, Fondo de ojo, OCT', telefono: '(011) 4815-7722', email: 'valeria@dramendez.com.ar', firma: null, logo: null }
            ]
        },
        {
            name: 'Consultorio Dra. Méndez — Pilar',
            address: 'Las Magnolias 350, Pilar, Buenos Aires',
            phone: '(0230) 445-1100',
            email: 'valeria@dramendez.com.ar',
            footer: 'Dra. Valeria Méndez — Oftalmología',
            logo: null,
            professionals: [
                { nombre: 'Dra. Valeria Méndez', matricula: 'MN 61.204', especialidades: 'Oftalmología, Campimetría, Topografía corneal, Fondo de ojo, OCT', telefono: '(0230) 445-1100', email: 'valeria@dramendez.com.ar', firma: null, logo: null }
            ]
        },

        // ───── 7: CONSULTORIO PERSONAL — Dr. Navarro (Cirujano, 2 lugares) ─
        {
            name: 'Consultorio Dr. Navarro — Rosario',
            address: 'Corrientes 2150, 5ºA, Rosario, Santa Fe',
            phone: '(0341) 421-8900',
            email: 'pablo@drnavarro.com.ar',
            footer: 'Dr. Pablo Navarro — Cirugía General',
            logo: null,
            professionals: [
                { nombre: 'Dr. Pablo Navarro', matricula: 'MP 15.330', especialidades: 'Cirugía General, Protocolo quirúrgico', telefono: '(0341) 421-8900', email: 'pablo@drnavarro.com.ar', firma: null, logo: null }
            ]
        },

        // ───── 8: CONSULTORIO PERSONAL — Dra. Herrera (Cardióloga, 2 lugares) ─
        {
            name: 'Consultorio Dra. Herrera — Belgrano',
            address: 'Av. Cabildo 2340, 8ºC, CABA',
            phone: '(011) 4788-9200',
            email: 'mherrera.cardio@gmail.com',
            footer: 'Dra. Marcela Herrera — Cardiología',
            logo: null,
            professionals: [
                { nombre: 'Dra. Marcela Herrera', matricula: 'MN 55.890', especialidades: 'Cardiología, Ecocardiograma, ECG, Eco-stress, Holter, MAPA, Cinecoronariografía', telefono: '(011) 4788-9200', email: 'mherrera.cardio@gmail.com', firma: null, logo: null }
            ]
        },
        {
            name: 'Consultorio Dra. Herrera — Quilmes',
            address: 'Mitre 550, Quilmes, Buenos Aires',
            phone: '(011) 4254-3300',
            email: 'mherrera.cardio@gmail.com',
            footer: 'Dra. Marcela Herrera — Cardiología',
            logo: null,
            professionals: [
                { nombre: 'Dra. Marcela Herrera', matricula: 'MN 55.890', especialidades: 'Cardiología, Ecocardiograma, ECG, Eco-stress, Holter, MAPA, Cinecoronariografía', telefono: '(011) 4254-3300', email: 'mherrera.cardio@gmail.com', firma: null, logo: null }
            ]
        },

        // ───── 10: CONSULTORIO PERSONAL — Dr. Campos (Gastro, 2 lugares) ─
        {
            name: 'Consultorio Dr. Campos — Córdoba',
            address: 'Av. Colón 680, Córdoba Capital',
            phone: '(0351) 423-7800',
            email: 'dcampos.gastro@gmail.com',
            footer: 'Dr. Diego Campos — Gastroenterología',
            logo: null,
            professionals: [
                { nombre: 'Dr. Diego Campos', matricula: 'MP 31.550', especialidades: 'Gastroenterología, Colonoscopía, Endoscopía alta, Broncoscopía', telefono: '(0351) 423-7800', email: 'dcampos.gastro@gmail.com', firma: null, logo: null }
            ]
        },
        {
            name: 'Consultorio Dr. Campos — Villa Carlos Paz',
            address: 'San Martín 120, Villa Carlos Paz, Córdoba',
            phone: '(03541) 42-6500',
            email: 'dcampos.gastro@gmail.com',
            footer: 'Dr. Diego Campos — Gastroenterología',
            logo: null,
            professionals: [
                { nombre: 'Dr. Diego Campos', matricula: 'MP 31.550', especialidades: 'Gastroenterología, Colonoscopía, Endoscopía alta, Broncoscopía', telefono: '(03541) 42-6500', email: 'dcampos.gastro@gmail.com', firma: null, logo: null }
            ]
        }
    ];

    localStorage.setItem('workplace_profiles', JSON.stringify(testWorkplaces));

    // ══════════════════════════════════════════════════════════════════
    // ██ PERFILES DE SALIDA — 20 combinaciones para testing rápido
    // ══════════════════════════════════════════════════════════════════
    // Cada nombre describe: EMOJI_ESTUDIO + Estudio — Doctor — Lugar
    // Al elegir un perfil → se cargan automáticamente lugar + médico + formato.
    // Después, el admin solo elige la plantilla que corresponda y prueba.
    const existingOutputProfiles = JSON.parse(localStorage.getItem('output_profiles') || '[]');
    if (existingOutputProfiles.length === 0) {
        const ts = Date.now();
        const std = { pageSize: 'a4', orientation: 'portrait', margins: 'normal', font: 'helvetica', fontSize: '11', lineSpacing: '1.5', showHeader: true, showFooter: true, showPageNum: true, showDate: true, showSignLine: true, showSignName: true, showSignMatricula: true };

        const testOutputProfiles = [
            // ── CLÍNICA DEL SUR (lugar 0) — 4 médicos × sus estudios ─────
            { id: 'tp_01', ...std, name: '🫀 Eco-stress — Dr. Ruiz — Clínica del Sur',           workplaceIndex: '0', professionalIndex: '0', footerText: 'Clínica del Sur', isDefault: true,  createdAt: ts,    lastUsed: ts },
            { id: 'tp_02', ...std, name: '🫀 Ecocardiograma — Dr. Ruiz — Clínica del Sur',       workplaceIndex: '0', professionalIndex: '0', footerText: 'Clínica del Sur', isDefault: false, createdAt: ts+1,  lastUsed: ts+1 },
            { id: 'tp_03', ...std, name: '👂 Laringoscopía — Dr. Suárez — Clínica del Sur',       workplaceIndex: '0', professionalIndex: '1', footerText: 'Clínica del Sur', isDefault: false, createdAt: ts+2,  lastUsed: ts+2, font: 'times', fontSize: '12' },
            { id: 'tp_04', ...std, name: '👂 Nasofibroscopía — Dr. Suárez — Clínica del Sur',     workplaceIndex: '0', professionalIndex: '1', footerText: 'Clínica del Sur', isDefault: false, createdAt: ts+3,  lastUsed: ts+3, font: 'times', fontSize: '12' },
            { id: 'tp_05', ...std, name: '🔭 Colonoscopía — Dra. López — Clínica del Sur',        workplaceIndex: '0', professionalIndex: '2', footerText: 'Clínica del Sur', isDefault: false, createdAt: ts+4,  lastUsed: ts+4, margins: 'compact', fontSize: '10' },
            { id: 'tp_06', ...std, name: '🫁 Espirometría — Dr. Ríos — Clínica del Sur',          workplaceIndex: '0', professionalIndex: '3', footerText: 'Clínica del Sur', isDefault: false, createdAt: ts+5,  lastUsed: ts+5 },

            // ── CENTRO SAN MARTÍN (lugar 1) — 4 médicos ─────────────────
            { id: 'tp_07', ...std, name: '🔭 Endoscopía alta — Dra. Fernández — San Martín',      workplaceIndex: '1', professionalIndex: '0', footerText: 'Centro Médico San Martín', isDefault: false, createdAt: ts+6,  lastUsed: ts+6 },
            { id: 'tp_08', ...std, name: '🫁 Test de marcha — Dr. Álvarez — San Martín',           workplaceIndex: '1', professionalIndex: '1', footerText: 'Centro Médico San Martín', isDefault: false, createdAt: ts+7,  lastUsed: ts+7 },
            { id: 'tp_09', ...std, name: '🧠 Electromiografía — Dra. Paz — San Martín',            workplaceIndex: '1', professionalIndex: '2', footerText: 'Centro Médico San Martín', isDefault: false, createdAt: ts+8,  lastUsed: ts+8 },
            { id: 'tp_10', ...std, name: '🌸 Colposcopía — Dra. Iglesias — San Martín',            workplaceIndex: '1', professionalIndex: '3', footerText: 'Centro Médico San Martín', isDefault: false, createdAt: ts+9,  lastUsed: ts+9 },

            // ── IDL ROSARIO (lugar 2) — 4 médicos ───────────────────────
            { id: 'tp_11', ...std, name: '🖼️ Eco Doppler — Dr. Peralta — IDL Rosario',             workplaceIndex: '2', professionalIndex: '0', footerText: 'IDL Rosario', isDefault: false, createdAt: ts+10, lastUsed: ts+10 },
            { id: 'tp_12', ...std, name: '🫀 Ecocardiograma — Dra. Ramírez — IDL Rosario',         workplaceIndex: '2', professionalIndex: '1', footerText: 'IDL Rosario', isDefault: false, createdAt: ts+11, lastUsed: ts+11 },
            { id: 'tp_13', ...std, name: '🔭 Broncoscopía — Dr. Córdoba — IDL Rosario',            workplaceIndex: '2', professionalIndex: '2', footerText: 'IDL Rosario', isDefault: false, createdAt: ts+12, lastUsed: ts+12 },

            // ── CONSULTORIOS PERSONALES — 1 médico, diferentes lugares ──
            { id: 'tp_14', ...std, name: '🫁 Espirometría — Dr. Gómez — Consultorio Costa',        workplaceIndex: '3', professionalIndex: '0', footerText: 'Dr. Ramiro Gómez — Neumonología', isDefault: false, createdAt: ts+13, lastUsed: ts+13 },
            { id: 'tp_15', ...std, name: '🫁 Pletismografía — Dr. Gómez — Consultorio Miramar',    workplaceIndex: '4', professionalIndex: '0', footerText: 'Dr. Ramiro Gómez — Neumonología', isDefault: false, createdAt: ts+14, lastUsed: ts+14 },
            { id: 'tp_16', ...std, name: '👁️ Campimetría — Dra. Méndez — CABA',                    workplaceIndex: '5', professionalIndex: '0', footerText: 'Dra. Valeria Méndez — Oftalmología', isDefault: false, createdAt: ts+15, lastUsed: ts+15 },
            { id: 'tp_17', ...std, name: '👁️ Topografía corneal — Dra. Méndez — Pilar',            workplaceIndex: '6', professionalIndex: '0', footerText: 'Dra. Valeria Méndez — Oftalmología', isDefault: false, createdAt: ts+16, lastUsed: ts+16 },
            { id: 'tp_18', ...std, name: '🔪 Protocolo quirúrgico — Dr. Navarro — Rosario',        workplaceIndex: '7', professionalIndex: '0', footerText: 'Dr. Pablo Navarro — Cirugía General', isDefault: false, createdAt: ts+17, lastUsed: ts+17 },
            { id: 'tp_19', ...std, name: '🫀 Cinecoronariografía — Dra. Herrera — Belgrano',       workplaceIndex: '8', professionalIndex: '0', footerText: 'Dra. Marcela Herrera — Cardiología', isDefault: false, createdAt: ts+18, lastUsed: ts+18 },
            { id: 'tp_20', ...std, name: '🔭 Colonoscopía — Dr. Campos — Córdoba',                 workplaceIndex: '10', professionalIndex: '0', footerText: 'Dr. Diego Campos — Gastroenterología', isDefault: false, createdAt: ts+19, lastUsed: ts+19 },
        ];
        localStorage.setItem('output_profiles', JSON.stringify(testOutputProfiles));
    }

    // ── PRE-CARGAR pdf_config con el primer perfil activo ────────────
    const existingCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
    if (!existingCfg.activeWorkplaceIndex) {
        existingCfg.activeWorkplaceIndex    = '0';
        existingCfg.activeProfessionalIndex = '0';
        existingCfg.activeProfessional      = testWorkplaces[0].professionals[0];
        localStorage.setItem('pdf_config', JSON.stringify(existingCfg));
    }

    // ══════════════════════════════════════════════════════════════════
    // ██ REGISTRO DE PACIENTES — 15 pacientes ficticios
    // ══════════════════════════════════════════════════════════════════
    const existingPatients = JSON.parse(localStorage.getItem('patient_registry') || '[]');
    if (existingPatients.length === 0) {
        const testPatients = [
            { id: 'p01', nombre: 'María Elena Rodríguez',   dni: '25.890.145', sexo: 'Femenino',  edad: '54', obraSocial: 'OSDE 310',           telefono: '(011) 4555-1201', email: 'me.rodriguez@email.com',   lastVisit: '2026-02-20', visits: 3 },
            { id: 'p02', nombre: 'Jorge Alberto Sánchez',    dni: '18.432.567', sexo: 'Masculino', edad: '68', obraSocial: 'PAMI',                telefono: '(011) 4555-1202', email: 'ja.sanchez@email.com',     lastVisit: '2026-02-18', visits: 7 },
            { id: 'p03', nombre: 'Ana Laura Martínez',       dni: '32.150.890', sexo: 'Femenino',  edad: '41', obraSocial: 'Swiss Medical',       telefono: '(011) 4555-1203', email: 'al.martinez@email.com',    lastVisit: '2026-02-22', visits: 1 },
            { id: 'p04', nombre: 'Carlos Eduardo Pérez',     dni: '20.765.432', sexo: 'Masculino', edad: '59', obraSocial: 'Galeno',              telefono: '(0341) 421-5504', email: 'ce.perez@email.com',       lastVisit: '2026-02-15', visits: 5 },
            { id: 'p05', nombre: 'Silvia Beatriz Gómez',     dni: '28.901.234', sexo: 'Femenino',  edad: '47', obraSocial: 'OSECAC',              telefono: '(011) 4555-1205', email: 'sb.gomez@email.com',       lastVisit: '2026-02-24', visits: 2 },
            { id: 'p06', nombre: 'Ricardo Daniel Moreno',    dni: '14.567.890', sexo: 'Masculino', edad: '73', obraSocial: 'IOMA',                telefono: '(011) 4241-6606', email: 'rd.moreno@email.com',      lastVisit: '2026-01-30', visits: 12 },
            { id: 'p07', nombre: 'Laura Cristina Díaz',      dni: '35.234.567', sexo: 'Femenino',  edad: '36', obraSocial: 'Medifé',              telefono: '(0341) 449-7707', email: 'lc.diaz@email.com',        lastVisit: '2026-02-10', visits: 4 },
            { id: 'p08', nombre: 'Héctor Raúl Fernández',    dni: '22.345.678', sexo: 'Masculino', edad: '62', obraSocial: 'Accord Salud',        telefono: '(011) 4555-1208', email: 'hr.fernandez@email.com',   lastVisit: '2026-02-21', visits: 2 },
            { id: 'p09', nombre: 'Graciela Marta Aguirre',   dni: '16.789.012', sexo: 'Femenino',  edad: '71', obraSocial: 'PAMI',                telefono: '(0223) 472-3344', email: 'gm.aguirre@email.com',     lastVisit: '2026-02-12', visits: 9 },
            { id: 'p10', nombre: 'Roberto Fabián Castro',    dni: '30.456.789', sexo: 'Masculino', edad: '44', obraSocial: 'OSDE 210',            telefono: '(0351) 481-5566', email: 'rf.castro@email.com',      lastVisit: '2026-02-19', visits: 1 },
            { id: 'p11', nombre: 'Claudia Susana Benítez',   dni: '27.123.456', sexo: 'Femenino',  edad: '52', obraSocial: 'Sancor Salud',        telefono: '(0341) 430-7788', email: 'cs.benitez@email.com',     lastVisit: '2026-02-23', visits: 6 },
            { id: 'p12', nombre: 'Omar Darío Villalba',      dni: '21.654.321', sexo: 'Masculino', edad: '65', obraSocial: 'IOMA',                telefono: '(0230) 442-1122', email: 'od.villalba@email.com',    lastVisit: '2026-01-28', visits: 3 },
            { id: 'p13', nombre: 'Verónica Soledad Ruiz',    dni: '33.987.654', sexo: 'Femenino',  edad: '38', obraSocial: 'Swiss Medical',       telefono: '(011) 4788-3344', email: 'vs.ruiz@email.com',        lastVisit: '2026-02-25', visits: 2 },
            { id: 'p14', nombre: 'Ernesto Julio Domínguez',  dni: '19.876.543', sexo: 'Masculino', edad: '70', obraSocial: 'Galeno',              telefono: '(02291) 45-6677', email: 'ej.dominguez@email.com',   lastVisit: '2026-02-14', visits: 8 },
            { id: 'p15', nombre: 'Alejandra Noemí Torres',   dni: '29.345.678', sexo: 'Femenino',  edad: '49', obraSocial: 'OSECAC',              telefono: '(011) 4254-8899', email: 'an.torres@email.com',      lastVisit: '2026-02-17', visits: 4 }
        ];
        localStorage.setItem('patient_registry', JSON.stringify(testPatients));
    }

    // ── prof_data del admin ──────────────────────────────────────────
    const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
    if (profData.nombre === 'Administrador') {
        profData.nombre       = 'Administrador (Dev)';
        profData.especialidad = 'Todas las especialidades';
        localStorage.setItem('prof_data', JSON.stringify(profData));
    }

    console.log('[Admin] Base de datos simulada cargada: 12 lugares, 20 profesionales, 20 perfiles de salida, 15 pacientes');
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
