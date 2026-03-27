// Settings Account Utils
// Encapsulates account data rendering in settings modal.
(function () {
    'use strict';

    const ADMIN_EDITOR_ID = 'settingsAdminAccountEditor';

    function isClinicAdminSession() {
        try {
            const isClinic = typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.canGenerateApps;
            if (!isClinic || typeof window.ClinicAuth === 'undefined' || typeof window.ClinicAuth.getActiveProfessional !== 'function') {
                return false;
            }
            const active = window.ClinicAuth.getActiveProfessional();
            if (!active) return false;
            if (active.isAdmin === true) return true;
            const role = String(active.role || active.tipo || active.userType || active.kind || '').toUpperCase();
            const username = String(active.usuario || active.username || '').toLowerCase();
            return role === 'ADMIN' || username === 'admin';
        } catch (_) {
            return false;
        }
    }

    function getClinicEditorContext() {
        try {
            const wpProfiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
            const pdfCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
            const wpIndex = Number(pdfCfg.activeWorkplaceIndex || 0);
            const profIndex = Number(pdfCfg.activeProfessionalIndex || 0);
            const wp = wpProfiles[wpIndex] || null;
            const prof = wp && Array.isArray(wp.professionals) ? (wp.professionals[profIndex] || null) : null;
            return { wpProfiles, pdfCfg, wpIndex, profIndex, wp, prof };
        } catch (_) {
            return { wpProfiles: [], pdfCfg: {}, wpIndex: 0, profIndex: 0, wp: null, prof: null };
        }
    }

    function populateAccountData(options) {
        const opts = options || {};
        const onProfileChanged = opts.onProfileChanged;

        const profData = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
        const el = (id) => document.getElementById(id);
        const isAdmin = typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN';
        const canEditClinicIdentity = !isAdmin && isClinicAdminSession();

        // Clones de clinica pueden tener selector de profesional, pero ADMIN no debe heredar ese comportamiento.
        const isClinic = !isAdmin && typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.canGenerateApps;
        if (isClinic) {
            populateClinicAccountSelector(el, profData, onProfileChanged);
        } else {
            removeClinicSelector();
            if (el('settingsProfName')) el('settingsProfName').textContent = profData.nombre || '—';
            if (el('settingsProfMatricula')) el('settingsProfMatricula').textContent = profData.matricula || '—';
            if (el('settingsProfEspecialidad')) el('settingsProfEspecialidad').textContent = profData.especialidad || '—';
        }

        renderAdminEditor({
            isAdmin,
            canEditClinicIdentity,
            profData,
            onProfileChanged
        });

        const planEl = el('settingsProfPlan');
        if (planEl && typeof CLIENT_CONFIG !== 'undefined') {
            const planNames = { ADMIN: 'Administrador', PRO: 'Profesional PRO', TRIAL: 'Prueba', NORMAL: 'Básico' };
            planEl.textContent = planNames[CLIENT_CONFIG.type] || CLIENT_CONFIG.type || '—';
            const planRow = planEl.closest('.stg-row');
            if (planRow) planRow.style.display = isAdmin ? '' : 'none';
        }

        const upgradeBtn = el('settingsUpgradePlan');
        if (upgradeBtn) upgradeBtn.style.display = isAdmin ? '' : 'none';
    }

    function removeClinicSelector() {
        const select = document.getElementById('settingsClinicProfSelect');
        if (select) select.remove();
    }

    function renderAdminEditor(context) {
        const isAdmin = !!(context && context.isAdmin);
        const canEditClinicIdentity = !!(context && context.canEditClinicIdentity);
        const profData = (context && context.profData) || {};
        const onProfileChanged = context && context.onProfileChanged;
        const editorMode = isAdmin ? 'admin' : (canEditClinicIdentity ? 'clinic-admin' : 'readonly');

        const card = document.querySelector('[data-stg="cuenta"] .stg-card, [data-stg="account"] .stg-card');
        if (!card) return;

        const existing = document.getElementById(ADMIN_EDITOR_ID);
        if (editorMode === 'readonly') {
            if (existing) existing.remove();
            return;
        }

        if (!existing) {
            const editor = document.createElement('div');
            editor.id = ADMIN_EDITOR_ID;
            editor.style.marginTop = '0.65rem';
            editor.style.paddingTop = '0.65rem';
            editor.style.borderTop = '1px dashed var(--border)';
            editor.innerHTML = [
                '<div class="stg-hint" id="settingsAccountEditorHint" style="margin-bottom:0.45rem;"></div>',
                '<div class="stg-opt-row"><span class="stg-opt-label">Nombre</span><input id="settingsAdminNameInput" class="stg-select" type="text" placeholder="Dr./Dra. Nombre" style="height:34px;"></div>',
                '<div class="stg-opt-row" style="margin-top:0.4rem;"><span class="stg-opt-label">Matrícula</span><input id="settingsAdminMatriculaInput" class="stg-select" type="text" placeholder="M.P. 12345" style="height:34px;"></div>',
                '<div class="stg-opt-row" style="margin-top:0.4rem;"><span class="stg-opt-label">Especialidad</span><input id="settingsAdminEspecialidadInput" class="stg-select" type="text" placeholder="Cardiología" style="height:34px;"></div>',
                '<button class="btn btn-primary btn-full stg-action-btn" id="settingsAdminSaveAccount" style="margin-top:0.5rem;">💾 Guardar mi cuenta</button>'
            ].join('');
            card.appendChild(editor);

            const saveBtn = document.getElementById('settingsAdminSaveAccount');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const nameInput = document.getElementById('settingsAdminNameInput');
                    const matInput = document.getElementById('settingsAdminMatriculaInput');
                    const espInput = document.getElementById('settingsAdminEspecialidadInput');

                    const nombre = String(nameInput?.value || '').trim();
                    const matricula = String(matInput?.value || '').trim();
                    const especialidad = String(espInput?.value || '').trim();

                    if (editorMode === 'clinic-admin') {
                        const ctx = getClinicEditorContext();
                        const prof = ctx.prof;
                        if (!prof || !ctx.wp) {
                            if (typeof showToast === 'function') showToast('No se encontró el profesional activo para editar', 'warning');
                            return;
                        }

                        const nextProf = {
                            ...prof,
                            nombre,
                            matricula,
                            especialidades: especialidad ? [especialidad] : []
                        };
                        ctx.wpProfiles[ctx.wpIndex].professionals[ctx.profIndex] = nextProf;
                        window._wpProfilesCache = ctx.wpProfiles;
                        if (typeof appDB !== 'undefined') appDB.set('workplace_profiles', ctx.wpProfiles);
                        localStorage.setItem('workplace_profiles', JSON.stringify(ctx.wpProfiles));

                        const nextCfg = { ...(ctx.pdfCfg || {}), activeProfessional: nextProf };
                        window._pdfConfigCache = nextCfg;
                        if (typeof appDB !== 'undefined') appDB.set('pdf_config', nextCfg);
                        localStorage.setItem('pdf_config', JSON.stringify(nextCfg));

                        if (typeof window.loadProfessionalProfile === 'function') {
                            window.loadProfessionalProfile(ctx.wpIndex, ctx.profIndex);
                        }
                        if (typeof showToast === 'function') {
                            showToast('✅ Datos del profesional activo actualizados', 'success');
                        }
                    } else {
                        const merged = {
                            ...(window._profDataCache || {}),
                            ...(profData || {}),
                            nombre,
                            matricula,
                            especialidad
                        };

                        window._profDataCache = merged;
                        if (typeof appDB !== 'undefined') appDB.set('prof_data', merged);
                        localStorage.setItem('prof_data', JSON.stringify(merged));

                        if (typeof applyProfessionalData === 'function') applyProfessionalData(merged);
                        if (typeof updatePersonalization === 'function') updatePersonalization(merged);

                        if (typeof showToast === 'function') {
                            showToast('✅ Datos de administrador actualizados', 'success');
                        }
                    }
                    if (typeof onProfileChanged === 'function') onProfileChanged();
                });
            }
        }

        const hint = document.getElementById('settingsAccountEditorHint');
        const nameInput = document.getElementById('settingsAdminNameInput');
        const matInput = document.getElementById('settingsAdminMatriculaInput');
        const espInput = document.getElementById('settingsAdminEspecialidadInput');
        const saveBtn = document.getElementById('settingsAdminSaveAccount');

        if (editorMode === 'clinic-admin') {
            const ctx = getClinicEditorContext();
            const activeProf = ctx.prof || {};
            if (hint) hint.textContent = 'Admin de clínica: podés editar la identidad del profesional activo. Los médicos no ven esta opción.';
            if (saveBtn) saveBtn.textContent = '💾 Guardar profesional activo';
            if (nameInput) nameInput.value = activeProf.nombre || '';
            if (matInput) matInput.value = activeProf.matricula || '';
            if (espInput) {
                const espRaw = activeProf.especialidades;
                espInput.value = Array.isArray(espRaw) ? (espRaw[0] || '') : (activeProf.especialidad || '');
            }
            return;
        }

        if (hint) hint.textContent = 'Solo ADMIN: estos datos son editables en esta app.';
        if (saveBtn) saveBtn.textContent = '💾 Guardar mi cuenta';
        if (nameInput) nameInput.value = profData.nombre || '';
        if (matInput) matInput.value = profData.matricula || '';
        if (espInput) espInput.value = profData.especialidad || '';
    }

    function populateClinicAccountSelector(el, profData, onProfileChanged) {
        let wpProfiles = [];
        try { wpProfiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]'); } catch (_) {}
        let pdfCfg = {};
        try { pdfCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}'); } catch (_) {}

        const isClinicAdmin = isClinicAdminSession();

        const wpIdx = pdfCfg.activeWorkplaceIndex || 0;
        const wp = wpProfiles[Number(wpIdx)];
        const profs = (wp && wp.professionals) ? wp.professionals : [];
        const activeProfIdx = pdfCfg.activeProfessionalIndex || 0;
        const activeProf = profs[activeProfIdx] || {};

        if (el('settingsProfName')) el('settingsProfName').textContent = activeProf.nombre || profData.nombre || '—';
        if (el('settingsProfMatricula')) el('settingsProfMatricula').textContent = activeProf.matricula || profData.matricula || '—';
        const espRaw = activeProf.especialidades || profData.especialidad || '';
        if (el('settingsProfEspecialidad')) {
            el('settingsProfEspecialidad').textContent = Array.isArray(espRaw)
                ? espRaw.filter(function (e) { return e && e !== 'Todas'; }).join(' / ')
                : (espRaw || '—');
        }

        if (!isClinicAdmin) {
            removeClinicSelector();
            return;
        }

        if (profs.length > 1) {
            const container = el('settingsProfName');
            if (container && !document.getElementById('settingsClinicProfSelect')) {
                const select = document.createElement('select');
                select.id = 'settingsClinicProfSelect';
                select.style.cssText = 'margin-left:8px;padding:2px 4px;font-size:0.85rem;border-radius:4px;border:1px solid var(--border-color);';
                profs.forEach(function (p, i) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = p.nombre || ('Profesional ' + (i + 1));
                    if (i === activeProfIdx) opt.selected = true;
                    select.appendChild(opt);
                });
                select.addEventListener('change', function () {
                    const idx = parseInt(select.value, 10);
                    if (typeof loadProfessionalProfile === 'function') {
                        loadProfessionalProfile(wpIdx, idx);
                    }
                    if (typeof onProfileChanged === 'function') onProfileChanged();
                });
                container.parentNode.appendChild(select);
            }
        }
    }

    window.SettingsAccountUtils = {
        populateAccountData
    };
})();
