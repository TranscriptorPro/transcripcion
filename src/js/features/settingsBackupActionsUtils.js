// Settings Backup Actions Utils
// Encapsulates backup/export/import wiring and clear-data action in settings.
(function () {
    'use strict';

    function initBackupSection() {
        const exportBtn = document.getElementById('settingsExportBackup');
        const importInput = document.getElementById('settingsImportBackup');
        const clearBtn = document.getElementById('settingsClearData');
        const backupUtils = window.SettingsBackupUtils || {};

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (typeof backupUtils.exportBackup === 'function') {
                    backupUtils.exportBackup();
                }
            });
        }

        if (importInput) {
            importInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (typeof backupUtils.importBackup === 'function') {
                    backupUtils.importBackup(file);
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                const ok1 = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('⚠️ Borrar datos', '¿Estás seguro? Esto borrará TODOS tus datos locales (historial, configuración, diccionario, etc.). Esta acción NO se puede deshacer.')
                    : false;
                if (!ok1) return;

                const ok2 = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('🔴 Última confirmación', 'Se borrarán todos los datos. ¿Continuar?')
                    : false;
                if (!ok2) return;

                const keepKeys = ['groq_api_key', 'prof_data', 'workplace_profiles', 'CLIENT_CONFIG', 'device_id', 'onboarding_accepted'];
                const saved = {};
                keepKeys.forEach(k => {
                    const v = localStorage.getItem(k);
                    if (v) saved[k] = v;
                });

                localStorage.clear();
                Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v));

                if (typeof showToast === 'function') showToast('🗑️ Datos locales eliminados. Recargando...', 'success');
                setTimeout(() => location.reload(), 1200);
            });
        }
    }

    window.SettingsBackupActionsUtils = {
        initBackupSection
    };
})();
