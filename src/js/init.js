/* ════════════════════════════════════════════════════
   App Initialization — DOMContentLoaded
   Extraído de index.html (líneas 2449-2492)
════════════════════════════════════════════════════ */

            document.addEventListener('DOMContentLoaded', () => {
                // License validation (no-op para ADMIN, activo en clones)
                if (typeof initLicenseManager === 'function') {
                    initLicenseManager();
                }

                // Initialize the app suite via Business module
                if (typeof initBusinessSuite === 'function') {
                    initBusinessSuite();
                }

                // Initial button visibility state
                if (typeof updateButtonsVisibility === 'function') {
                    updateButtonsVisibility('IDLE');
                }

                // Initial UI status â€” pass saved key so updateApiStatus doesn't reset the input
                if (typeof updateApiStatus === 'function') {
                    updateApiStatus(localStorage.getItem('groq_api_key') || window.GROQ_API_KEY);
                }

                // Medical dictionary modal
                if (typeof initMedDictModal === 'function') initMedDictModal();

                // Report history panel (Etapa 4)
                if (typeof initReportHistoryPanel === 'function') initReportHistoryPanel();

                // Backup reminder â€” cada 7 dÃ­as recordar exportar datos
                (function backupReminder() {
                    const BACKUP_KEY = 'last_backup_reminder';
                    const INTERVAL   = 7 * 24 * 60 * 60 * 1000; // 7 dÃ­as
                    const last = parseInt(localStorage.getItem(BACKUP_KEY) || '0', 10);
                    if (Date.now() - last > INTERVAL) {
                        setTimeout(function () {
                            if (typeof showToast === 'function') {
                                showToast('ðŸ’¾ Recordatorio: exporte sus datos periÃ³dicamente desde el panel de historial para tener un respaldo seguro.', 'info', 8000);
                            }
                            localStorage.setItem(BACKUP_KEY, String(Date.now()));
                        }, 15000); // Mostrar 15s despuÃ©s de cargar para no molestar al inicio
                    }
                })();
            });
