// Settings Backup Utils
// Extracted from settingsPanel to keep backup/export logic modular.
(function () {
    'use strict';

    const EXPORT_KEYS = [
        'prof_data', 'workplace_profiles', 'pdf_config', 'report_history',
        'patient_registry', 'med_dictionary', 'settings_prefs', 'quick_profiles',
        'output_profiles', 'last_profile_type', 'theme'
    ];

    function exportBackup() {
        const backup = {};
        EXPORT_KEYS.forEach(key => {
            const val = localStorage.getItem(key);
            if (val) backup[key] = val;
        });

        backup._export_date = new Date().toISOString();
        backup._app_version = '2.0';

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcriptor-pro-backup-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);

        if (typeof window.showToast === 'function') {
            window.showToast('📤 Backup exportado', 'success');
        }
    }

    function importBackup(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data || typeof data !== 'object') throw new Error('Invalid');

                let count = 0;
                Object.entries(data).forEach(([key, value]) => {
                    if (key.startsWith('_')) return;
                    localStorage.setItem(key, value);
                    count++;
                });

                if (typeof window.showToast === 'function') {
                    window.showToast(`📥 Backup importado (${count} items). Recargando...`, 'success');
                }
                setTimeout(() => location.reload(), 1500);
            } catch (_) {
                if (typeof window.showToast === 'function') {
                    window.showToast('❌ Archivo inválido', 'error');
                }
            }
        };
        reader.readAsText(file);
    }

    window.SettingsBackupUtils = {
        exportBackup,
        importBackup
    };
})();
