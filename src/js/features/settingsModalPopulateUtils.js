// Settings Modal Populate Utils
// Extracted stats/info population logic from settingsPanel.
(function () {
    'use strict';

    function populateStats() {
        const el = (id) => document.getElementById(id);
        const isClinic = typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.canGenerateApps;
        let activeProfName = '';
        if (isClinic) {
            try {
                const cfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
                activeProfName = (cfg.activeProfessional && cfg.activeProfessional.nombre) || '';
            } catch (_) {}
        }

        try {
            let reports = (window._reportHistCache !== undefined ? window._reportHistCache : null) || JSON.parse(localStorage.getItem('report_history') || '[]');
            if (isClinic && activeProfName) {
                reports = reports.filter(function (r) { return !r.professionalName || r.professionalName === activeProfName; });
            }
            if (el('statTotalReports')) el('statTotalReports').textContent = reports.length;
        } catch (_) {
            if (el('statTotalReports')) el('statTotalReports').textContent = '0';
        }

        const txCount = parseInt(localStorage.getItem('transcription_count') || '0');
        if (el('statTotalTranscriptions')) el('statTotalTranscriptions').textContent = txCount;

        try {
            const patients = (window._registryCache !== undefined ? window._registryCache : null) || JSON.parse(localStorage.getItem('patient_registry') || '[]');
            if (el('statTotalPatients')) el('statTotalPatients').textContent = patients.length;
        } catch (_) {
            if (el('statTotalPatients')) el('statTotalPatients').textContent = '0';
        }

        try {
            const dict = (window._customDictCache !== undefined ? window._customDictCache : null) || JSON.parse(localStorage.getItem('custom_med_dict') || '[]');
            if (el('statDictEntries')) el('statDictEntries').textContent = dict.length;
        } catch (_) {
            if (el('statDictEntries')) el('statDictEntries').textContent = '0';
        }
    }

    function populateInfo() {
        const el = (id) => document.getElementById(id);
        const isAdmin = typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN';

        // K2: datos avanzados solo para admin.
        const deviceItem = el('settingsDeviceId')?.closest('.stg-info-item');
        const planItem = el('settingsAccountType')?.closest('.stg-info-item');
        if (deviceItem) deviceItem.style.display = isAdmin ? '' : 'none';
        if (planItem) planItem.style.display = isAdmin ? '' : 'none';

        const appVersionRaw = (typeof window !== 'undefined' && window.APP_VERSION)
            || localStorage.getItem('app_version')
            || '2.0';
        const appVersionText = String(appVersionRaw || '2.0').trim();
        const appVersionNoPrefix = appVersionText.replace(/^v/i, '') || '2.0';

        if (el('settingsAppVersion')) el('settingsAppVersion').textContent = appVersionText;
        if (el('settingsAboutVersion')) el('settingsAboutVersion').textContent = appVersionNoPrefix;

        const deviceId = (typeof window._lmDeviceCache !== 'undefined' && window._lmDeviceCache) || localStorage.getItem('device_id') || '—';
        if (el('settingsDeviceId')) {
            el('settingsDeviceId').textContent = deviceId.length > 16 ? deviceId.substring(0, 16) + '…' : deviceId;
        }

        if (el('settingsAccountType') && typeof CLIENT_CONFIG !== 'undefined') {
            el('settingsAccountType').textContent = CLIENT_CONFIG.plan || CLIENT_CONFIG.type || '—';
        }

        if (el('settingsStorageUsed')) {
            try {
                let total = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    total += (key.length + (localStorage.getItem(key) || '').length) * 2;
                }
                const kb = (total / 1024).toFixed(1);
                el('settingsStorageUsed').textContent = total > 1024 * 1024
                    ? (total / (1024 * 1024)).toFixed(1) + ' MB'
                    : kb + ' KB';
            } catch (_) {
                el('settingsStorageUsed').textContent = '—';
            }
        }
    }

    window.SettingsModalPopulateUtils = {
        populateStats,
        populateInfo
    };
})();
