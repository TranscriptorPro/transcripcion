// Settings Quick Profiles Utils
// Encapsulates quick profile storage and interactions in settings modal.
(function () {
    'use strict';

    const QUICK_PROFILES_KEY = 'quick_profiles';
    let quickProfilesCache = null;

    if (typeof appDB !== 'undefined') {
        appDB.get(QUICK_PROFILES_KEY).then(v => { if (v !== undefined) quickProfilesCache = v; });
    }

    function getQuickProfiles() {
        if (quickProfilesCache !== null) return quickProfilesCache;
        try { return JSON.parse(localStorage.getItem(QUICK_PROFILES_KEY) || '[]'); }
        catch (_) { return []; }
    }

    function saveQuickProfiles(arr) {
        quickProfilesCache = arr;
        if (typeof appDB !== 'undefined') appDB.set(QUICK_PROFILES_KEY, arr);
        localStorage.setItem(QUICK_PROFILES_KEY, JSON.stringify(arr));
    }

    function initQuickProfiles(options) {
        const opts = options || {};
        const onProfilesChanged = opts.onProfilesChanged;

        const saveBtn = document.getElementById('settingsSaveProfile');
        if (!saveBtn) return;

        saveBtn.addEventListener('click', () => {
            const wpName = localStorage.getItem('current_workplace_name') || 'Sin lugar';
            const template = window.selectedTemplate || 'generico';
            const mode = window.currentMode || 'pro';
            const profileName = wpName + ' — ' + mode.toUpperCase();

            const profiles = getQuickProfiles();
            profiles.push({
                id: 'qp_' + Date.now(),
                name: profileName,
                workplace: wpName,
                template: template,
                mode: mode,
                created: new Date().toISOString()
            });
            saveQuickProfiles(profiles);
            if (typeof onProfilesChanged === 'function') onProfilesChanged();
            if (typeof showToast === 'function') showToast('⚡ Perfil guardado: ' + profileName, 'success');
        });
    }

    function populateQuickProfiles() {
        const container = document.getElementById('settingsQuickProfiles');
        if (!container) return;

        const profiles = getQuickProfiles();
        if (profiles.length === 0) {
            container.innerHTML = '<p class="stg-hint" style="text-align:center; opacity:0.6;">No hay perfiles guardados aún</p>';
            return;
        }

        container.innerHTML = profiles.map(p => `
            <div class="stg-profile-item" data-profile-id="${p.id}">
                <span class="stg-profile-name">⚡ ${p.name}</span>
                <span class="stg-profile-meta">${p.mode.toUpperCase()}</span>
                <button class="stg-profile-del" data-del="${p.id}" title="Eliminar perfil">✕</button>
            </div>
        `).join('');

        container.querySelectorAll('.stg-profile-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('stg-profile-del')) return;
                const id = item.dataset.profileId;
                const profile = profiles.find(p => p.id === id);
                if (!profile) return;
                loadQuickProfile(profile);
            });
        });

        container.querySelectorAll('.stg-profile-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.del;
                const remaining = profiles.filter(p => p.id !== id);
                saveQuickProfiles(remaining);
                populateQuickProfiles();
                if (typeof showToast === 'function') showToast('Perfil eliminado', 'success');
            });
        });
    }

    function loadQuickProfile(profile) {
        if (profile.mode && typeof setMode === 'function') {
            setMode(profile.mode, true);
            window._lastProfileTypeCache = profile.mode;
            if (typeof appDB !== 'undefined') appDB.set('last_profile_type', profile.mode);
            localStorage.setItem('last_profile_type', profile.mode);
        }

        if (profile.template) {
            window.selectedTemplate = profile.template;
            const sel = document.getElementById('templateSelect');
            if (sel) sel.value = profile.template;
        }

        const overlay = document.getElementById('settingsModalOverlay');
        if (overlay) overlay.classList.remove('active');
        if (typeof showToast === 'function') showToast('⚡ Perfil cargado: ' + profile.name, 'success');
    }

    window.SettingsQuickProfilesUtils = {
        initQuickProfiles,
        populateQuickProfiles
    };
})();
