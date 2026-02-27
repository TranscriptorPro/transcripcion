// ============ SETTINGS PANEL — Mega Configuration Modal ============
// Accordion-based settings for client users (and admin optionally).
// Integrates: API Key, profile data, workplace, editor prefs, tools,
// theme, stats, backup/restore, quick profiles, and app info.

(function () {
    'use strict';

    const SETTINGS_PREFS_KEY = 'settings_prefs';
    const QUICK_PROFILES_KEY = 'quick_profiles';

    // ─── Default preferences ─────────────────────────────────────────
    const DEFAULTS = {
        editorFontSize: 'medium',   // small | medium | large
        autosave: true,
        undoHistory: true,
    };

    function _getPrefs() {
        try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_PREFS_KEY) || '{}') }; }
        catch (_) { return { ...DEFAULTS }; }
    }
    function _savePrefs(prefs) {
        localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(prefs));
    }

    // ─── Init: call once after DOM ready ─────────────────────────────
    window.initSettingsPanel = function () {
        _initAccordions();
        _initApiKeySection();
        _initWorkplaceSection();
        _initQuickProfiles();
        _initPdfConfigLink();
        _initEditorPrefs();
        _initToolsLinks();
        _initThemeSection();
        _initStatsSection();
        _initBackupSection();
        _initInfoSection();
        _initModalControls();

        // Apply saved preferences on init
        _applyEditorPrefs(_getPrefs());
    };

    // ─── Populate: call every time modal opens ───────────────────────
    window.populateSettingsModal = function () {
        _populateAccountData();
        _populateApiKeyStatus();
        _populateWorkplace();
        _populateQuickProfiles();
        _populateStats();
        _populateInfo();
        _populateEditorPrefs();
        _populateThemeButtons();
    };

    // ─── Accordion toggle logic ──────────────────────────────────────
    function _initAccordions() {
        document.querySelectorAll('.stg-accordion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const acc = btn.closest('.stg-accordion');
                if (!acc) return;
                acc.classList.toggle('open');
            });
        });
    }

    // ─── Modal open/close ────────────────────────────────────────────
    function _initModalControls() {
        const overlay = document.getElementById('settingsModalOverlay');
        const closeBtn = document.getElementById('closeSettings');
        const btnSettings = document.getElementById('btnSettings');

        if (btnSettings) {
            btnSettings.addEventListener('click', () => {
                if (overlay) {
                    populateSettingsModal();
                    overlay.style.display = 'grid';
                }
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (overlay) overlay.style.display = 'none';
            });
        }
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.style.display = 'none';
            });
        }
    }

    // ─── 1. Account data (read-only) ─────────────────────────────────
    function _populateAccountData() {
        const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
        const el = (id) => document.getElementById(id);

        if (el('settingsProfName')) el('settingsProfName').textContent = profData.nombre || '—';
        if (el('settingsProfMatricula')) el('settingsProfMatricula').textContent = profData.matricula || '—';
        if (el('settingsProfEspecialidad')) el('settingsProfEspecialidad').textContent = profData.especialidad || '—';

        const planEl = el('settingsProfPlan');
        if (planEl && typeof CLIENT_CONFIG !== 'undefined') {
            const planNames = { ADMIN: 'Administrador', PRO: 'Profesional PRO', TRIAL: 'Prueba', NORMAL: 'Básico' };
            planEl.textContent = planNames[CLIENT_CONFIG.type] || CLIENT_CONFIG.type || '—';
        }
    }

    // ─── 2. API Key ──────────────────────────────────────────────────
    function _initApiKeySection() {
        const saveBtn = document.getElementById('settingsSaveApiKey');
        const testBtn = document.getElementById('settingsTestApiKey');
        const input = document.getElementById('settingsApiKeyInput');

        if (saveBtn && input) {
            saveBtn.addEventListener('click', () => {
                const key = input.value.trim();
                if (!key) {
                    if (typeof showToast === 'function') showToast('Ingresá una API key válida', 'error');
                    return;
                }
                localStorage.setItem('groq_api_key', key);
                window.GROQ_API_KEY = key;
                if (typeof updateApiStatus === 'function') updateApiStatus(key);
                _setApiDot(true);
                _populateApiKeyStatus();
                if (typeof showToast === 'function') showToast('✅ API Key guardada', 'success');
            });
        }

        if (testBtn && input) {
            testBtn.addEventListener('click', async () => {
                const key = input.value.trim() || localStorage.getItem('groq_api_key');
                if (!key) {
                    if (typeof showToast === 'function') showToast('Ingresá una API key primero', 'error');
                    return;
                }
                const resultEl = document.getElementById('settingsApiTestResult');
                if (resultEl) {
                    resultEl.style.display = 'block';
                    resultEl.innerHTML = '<span style="color: var(--text-secondary);">⏳ Probando conexión...</span>';
                }
                try {
                    const resp = await fetch('https://api.groq.com/openai/v1/models', {
                        headers: { 'Authorization': 'Bearer ' + key }
                    });
                    if (resp.ok) {
                        if (resultEl) resultEl.innerHTML = '<span style="color: #22c55e; font-weight: 600;">✅ Conexión exitosa</span>';
                        _setApiDot(true);
                        if (typeof showToast === 'function') showToast('✅ Conexión con Groq OK', 'success');
                    } else {
                        if (resultEl) resultEl.innerHTML = '<span style="color: #ef4444; font-weight: 600;">❌ Key inválida o expirada</span>';
                        _setApiDot(false);
                    }
                } catch (err) {
                    if (resultEl) resultEl.innerHTML = '<span style="color: #ef4444;">❌ Error de red</span>';
                    _setApiDot(false);
                }
            });
        }
    }

    function _populateApiKeyStatus() {
        const key = localStorage.getItem('groq_api_key') || '';
        const input = document.getElementById('settingsApiKeyInput');
        if (input && key) input.value = key;

        const statusEl = document.getElementById('settingsApiStatus');
        if (statusEl) {
            if (key) {
                statusEl.className = 'api-status connected';
                statusEl.innerHTML = '<span>✅ Configurada</span>';
            } else {
                statusEl.className = 'api-status disconnected';
                statusEl.innerHTML = '<span>❌ No configurada</span>';
            }
        }
        _setApiDot(!!key);
    }

    function _setApiDot(ok) {
        const dot = document.getElementById('settingsApiDot');
        if (!dot) return;
        dot.className = 'stg-status ' + (ok ? 'ok' : 'fail');
    }

    // ─── 3. Workplace ────────────────────────────────────────────────
    function _initWorkplaceSection() {
        const btn = document.getElementById('settingsChangeWorkplace');
        if (btn) {
            btn.addEventListener('click', () => {
                // Close settings, open Session Assistant
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.style.display = 'none';
                if (typeof openSessionAssistant === 'function') openSessionAssistant();
            });
        }
    }

    function _populateWorkplace() {
        const el = document.getElementById('settingsCurrentWorkplace');
        if (!el) return;
        const wpName = localStorage.getItem('current_workplace_name');
        el.textContent = wpName || 'No seleccionado';
    }

    // ─── 4. Quick Profiles ───────────────────────────────────────────
    function _getQuickProfiles() {
        try { return JSON.parse(localStorage.getItem(QUICK_PROFILES_KEY) || '[]'); }
        catch (_) { return []; }
    }
    function _saveQuickProfiles(arr) {
        localStorage.setItem(QUICK_PROFILES_KEY, JSON.stringify(arr));
    }

    function _initQuickProfiles() {
        const saveBtn = document.getElementById('settingsSaveProfile');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const wpName = localStorage.getItem('current_workplace_name') || 'Sin lugar';
                const template = window.selectedTemplate || 'generico';
                const mode = window.currentMode || 'pro';
                const profileName = wpName + ' — ' + mode.toUpperCase();

                const profiles = _getQuickProfiles();
                profiles.push({
                    id: 'qp_' + Date.now(),
                    name: profileName,
                    workplace: wpName,
                    template: template,
                    mode: mode,
                    created: new Date().toISOString()
                });
                _saveQuickProfiles(profiles);
                _populateQuickProfiles();
                if (typeof showToast === 'function') showToast('⚡ Perfil guardado: ' + profileName, 'success');
            });
        }
    }

    function _populateQuickProfiles() {
        const container = document.getElementById('settingsQuickProfiles');
        if (!container) return;

        const profiles = _getQuickProfiles();
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

        // Click to load profile
        container.querySelectorAll('.stg-profile-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('stg-profile-del')) return;
                const id = item.dataset.profileId;
                const profile = profiles.find(p => p.id === id);
                if (!profile) return;
                _loadQuickProfile(profile);
            });
        });

        // Delete buttons
        container.querySelectorAll('.stg-profile-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.del;
                const remaining = profiles.filter(p => p.id !== id);
                _saveQuickProfiles(remaining);
                _populateQuickProfiles();
                if (typeof showToast === 'function') showToast('Perfil eliminado', 'success');
            });
        });
    }

    function _loadQuickProfile(profile) {
        if (profile.mode && typeof setMode === 'function') {
            setMode(profile.mode, true);
            localStorage.setItem('last_profile_type', profile.mode);
        }
        if (profile.template) {
            window.selectedTemplate = profile.template;
            const sel = document.getElementById('templateSelect');
            if (sel) sel.value = profile.template;
        }
        const overlay = document.getElementById('settingsModalOverlay');
        if (overlay) overlay.style.display = 'none';
        if (typeof showToast === 'function') showToast('⚡ Perfil cargado: ' + profile.name, 'success');
    }

    // ─── 5. PDF Config link ──────────────────────────────────────────
    function _initPdfConfigLink() {
        const btn = document.getElementById('settingsOpenPdfConfig');
        if (btn) {
            btn.addEventListener('click', () => {
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.style.display = 'none';
                const pdfOverlay = document.getElementById('pdfModalOverlay');
                if (pdfOverlay) pdfOverlay.classList.add('active');
            });
        }
    }

    // ─── 6. Editor preferences ───────────────────────────────────────
    function _initEditorPrefs() {
        const fontSize = document.getElementById('settingsEditorFontSize');
        const autosave = document.getElementById('settingsAutosave');
        const undoHistory = document.getElementById('settingsUndoHistory');

        if (fontSize) {
            fontSize.addEventListener('change', () => {
                const prefs = _getPrefs();
                prefs.editorFontSize = fontSize.value;
                _savePrefs(prefs);
                _applyEditorPrefs(prefs);
                if (typeof showToast === 'function') showToast('Tamaño de texto actualizado', 'success');
            });
        }
        if (autosave) {
            autosave.addEventListener('change', () => {
                const prefs = _getPrefs();
                prefs.autosave = autosave.checked;
                _savePrefs(prefs);
                _applyEditorPrefs(prefs);
            });
        }
        if (undoHistory) {
            undoHistory.addEventListener('change', () => {
                const prefs = _getPrefs();
                prefs.undoHistory = undoHistory.checked;
                _savePrefs(prefs);
            });
        }
    }

    function _populateEditorPrefs() {
        const prefs = _getPrefs();
        const fontSize = document.getElementById('settingsEditorFontSize');
        const autosave = document.getElementById('settingsAutosave');
        const undoHistory = document.getElementById('settingsUndoHistory');
        if (fontSize) fontSize.value = prefs.editorFontSize;
        if (autosave) autosave.checked = prefs.autosave;
        if (undoHistory) undoHistory.checked = prefs.undoHistory;
    }

    function _applyEditorPrefs(prefs) {
        // Font size
        const editor = document.getElementById('mainEditor') || document.getElementById('editor');
        if (editor) {
            const sizes = { small: '0.82rem', medium: '0.95rem', large: '1.1rem' };
            editor.style.fontSize = sizes[prefs.editorFontSize] || sizes.medium;
        }

        // Autosave
        if (prefs.autosave) {
            _startAutosave();
        } else {
            _stopAutosave();
        }
    }

    // ─── Autosave logic ──────────────────────────────────────────────
    let _autosaveTimer = null;
    function _startAutosave() {
        if (_autosaveTimer) return;
        _autosaveTimer = setInterval(() => {
            const editor = document.getElementById('mainEditor') || document.getElementById('editor');
            if (editor && editor.innerHTML && editor.innerHTML.length > 10) {
                localStorage.setItem('autosave_draft', editor.innerHTML);
                localStorage.setItem('autosave_ts', Date.now().toString());
            }
        }, 30000); // every 30s
    }
    function _stopAutosave() {
        if (_autosaveTimer) {
            clearInterval(_autosaveTimer);
            _autosaveTimer = null;
        }
    }

    // Restore draft on load if available
    window.restoreAutosaveDraft = function () {
        const draft = localStorage.getItem('autosave_draft');
        const ts = localStorage.getItem('autosave_ts');
        if (!draft || !ts) return false;

        const age = Date.now() - parseInt(ts);
        if (age > 24 * 60 * 60 * 1000) return false; // older than 24h, skip

        const editor = document.getElementById('mainEditor') || document.getElementById('editor');
        if (editor && (!editor.innerHTML || editor.innerHTML.length < 20)) {
            editor.innerHTML = draft;
            if (typeof showToast === 'function') {
                showToast('📝 Borrador restaurado automáticamente', 'info');
            }
            return true;
        }
        return false;
    };

    // ─── 7. Tools links ──────────────────────────────────────────────
    function _initToolsLinks() {
        const historyBtn = document.getElementById('settingsOpenHistory');
        const dictBtn = document.getElementById('settingsOpenDictionary');
        const shortcutsBtn = document.getElementById('settingsOpenShortcuts');
        const overlay = document.getElementById('settingsModalOverlay');

        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                if (overlay) overlay.style.display = 'none';
                const histOverlay = document.getElementById('reportHistoryOverlay');
                if (histOverlay) histOverlay.classList.add('active');
            });
        }
        if (dictBtn) {
            dictBtn.addEventListener('click', () => {
                if (overlay) overlay.style.display = 'none';
                if (typeof window.openMedDictModal === 'function') {
                    window.openMedDictModal();
                } else {
                    const dictModal = document.getElementById('medDictModal');
                    if (dictModal) dictModal.classList.add('active');
                }
            });
        }
        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', () => {
                if (overlay) overlay.style.display = 'none';
                // Open help modal which includes shortcuts
                const helpEl = document.getElementById('helpBtn');
                if (helpEl) helpEl.click();
            });
        }
    }

    // ─── 8. Theme ────────────────────────────────────────────────────
    function _initThemeSection() {
        const lightBtn = document.getElementById('settingsThemeLight');
        const darkBtn = document.getElementById('settingsThemeDark');

        if (lightBtn) {
            lightBtn.addEventListener('click', () => {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                _populateThemeButtons();
            });
        }
        if (darkBtn) {
            darkBtn.addEventListener('click', () => {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                _populateThemeButtons();
            });
        }
    }

    function _populateThemeButtons() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const lightBtn = document.getElementById('settingsThemeLight');
        const darkBtn = document.getElementById('settingsThemeDark');
        if (lightBtn) lightBtn.classList.toggle('active', current === 'light');
        if (darkBtn) darkBtn.classList.toggle('active', current === 'dark');
    }

    // ─── 9. Stats ────────────────────────────────────────────────────
    function _populateStats() {
        const el = (id) => document.getElementById(id);

        // Reports
        try {
            const reports = JSON.parse(localStorage.getItem('report_history') || '[]');
            if (el('statTotalReports')) el('statTotalReports').textContent = reports.length;
        } catch (_) {
            if (el('statTotalReports')) el('statTotalReports').textContent = '0';
        }

        // Transcriptions count
        const txCount = parseInt(localStorage.getItem('transcription_count') || '0');
        if (el('statTotalTranscriptions')) el('statTotalTranscriptions').textContent = txCount;

        // Patients
        try {
            const patients = JSON.parse(localStorage.getItem('patient_registry') || '[]');
            if (el('statTotalPatients')) el('statTotalPatients').textContent = patients.length;
        } catch (_) {
            if (el('statTotalPatients')) el('statTotalPatients').textContent = '0';
        }

        // Dictionary entries
        try {
            const dict = JSON.parse(localStorage.getItem('med_dictionary') || '[]');
            if (el('statDictEntries')) el('statDictEntries').textContent = dict.length;
        } catch (_) {
            if (el('statDictEntries')) el('statDictEntries').textContent = '0';
        }
    }

    // ─── 10. Backup / Restore ────────────────────────────────────────
    function _initBackupSection() {
        const exportBtn = document.getElementById('settingsExportBackup');
        const importInput = document.getElementById('settingsImportBackup');
        const clearBtn = document.getElementById('settingsClearData');

        if (exportBtn) {
            exportBtn.addEventListener('click', _exportBackup);
        }
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                _importBackup(file);
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (!confirm('⚠️ ¿Estás seguro? Esto borrará TODOS tus datos locales (historial, configuración, diccionario, etc.). Esta acción NO se puede deshacer.')) return;
                if (!confirm('🔴 Última confirmación: se borrarán todos los datos. ¿Continuar?')) return;

                // Keep only essential keys
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

    function _exportBackup() {
        const backup = {};
        const exportKeys = [
            'prof_data', 'workplace_profiles', 'pdf_config', 'report_history',
            'patient_registry', 'med_dictionary', 'settings_prefs', 'quick_profiles',
            'output_profiles', 'last_profile_type', 'theme'
        ];

        exportKeys.forEach(key => {
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

        if (typeof showToast === 'function') showToast('📤 Backup exportado', 'success');
    }

    function _importBackup(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data || typeof data !== 'object') throw new Error('Invalid');

                let count = 0;
                Object.entries(data).forEach(([key, value]) => {
                    if (key.startsWith('_')) return; // skip meta
                    localStorage.setItem(key, value);
                    count++;
                });

                if (typeof showToast === 'function') showToast(`📥 Backup importado (${count} items). Recargando...`, 'success');
                setTimeout(() => location.reload(), 1500);
            } catch (err) {
                if (typeof showToast === 'function') showToast('❌ Archivo inválido', 'error');
            }
        };
        reader.readAsText(file);
    }

    // ─── 11. Info & Support ──────────────────────────────────────────
    function _initInfoSection() {
        const contactBtn = document.getElementById('settingsContactSupport');
        if (contactBtn) {
            contactBtn.addEventListener('click', () => {
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.style.display = 'none';
                // Use existing contact button
                const btnContacto = document.getElementById('btnContacto');
                if (btnContacto) btnContacto.click();
            });
        }
    }

    function _populateInfo() {
        const el = (id) => document.getElementById(id);
        if (el('settingsAppVersion')) el('settingsAppVersion').textContent = '2.0';

        const deviceId = localStorage.getItem('device_id') || '—';
        if (el('settingsDeviceId')) el('settingsDeviceId').textContent = deviceId.length > 16 ? deviceId.substring(0, 16) + '…' : deviceId;

        if (el('settingsAccountType') && typeof CLIENT_CONFIG !== 'undefined') {
            el('settingsAccountType').textContent = CLIENT_CONFIG.plan || CLIENT_CONFIG.type || '—';
        }
    }

    // ─── Transcription counter (increment on each transcription) ────
    window.incrementTranscriptionCount = function () {
        const current = parseInt(localStorage.getItem('transcription_count') || '0');
        localStorage.setItem('transcription_count', (current + 1).toString());
    };

})();
