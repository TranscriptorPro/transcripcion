// Settings Account Utils
// Encapsulates account data rendering in settings modal.
(function () {
    'use strict';

    function populateAccountData(options) {
        const opts = options || {};
        const onProfileChanged = opts.onProfileChanged;

        const profData = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
        const el = (id) => document.getElementById(id);

        const isClinic = typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.canGenerateApps;
        if (isClinic) {
            populateClinicAccountSelector(el, profData, onProfileChanged);
        } else {
            if (el('settingsProfName')) el('settingsProfName').textContent = profData.nombre || '—';
            if (el('settingsProfMatricula')) el('settingsProfMatricula').textContent = profData.matricula || '—';
            if (el('settingsProfEspecialidad')) el('settingsProfEspecialidad').textContent = profData.especialidad || '—';
        }

        const planEl = el('settingsProfPlan');
        if (planEl && typeof CLIENT_CONFIG !== 'undefined') {
            const planNames = { ADMIN: 'Administrador', PRO: 'Profesional PRO', TRIAL: 'Prueba', NORMAL: 'Básico' };
            planEl.textContent = planNames[CLIENT_CONFIG.type] || CLIENT_CONFIG.type || '—';
        }
    }

    function populateClinicAccountSelector(el, profData, onProfileChanged) {
        let wpProfiles = [];
        try { wpProfiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]'); } catch (_) {}
        let pdfCfg = {};
        try { pdfCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}'); } catch (_) {}

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
