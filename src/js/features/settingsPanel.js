// ============ SETTINGS PANEL — Mega Configuration Modal ============
// Accordion-based settings for client users (and admin optionally).
// Integrates: API Key, profile data, workplace, editor prefs, tools,
// theme, stats, backup/restore, quick profiles, and app info.

(function () {
    'use strict';

    const SETTINGS_PREFS_KEY = 'settings_prefs';
    const QUICK_PROFILES_KEY = 'quick_profiles';

    // ─── In-memory write-through caches ─────────────────────────────────
    let _settingsPrefsCache = null;
    let _quickProfilesCache = null;
    // Init caches from appDB at module load
    if (typeof appDB !== 'undefined') {
        appDB.get(SETTINGS_PREFS_KEY).then(v => { if (v !== undefined) _settingsPrefsCache = v; });
        appDB.get(QUICK_PROFILES_KEY).then(v => { if (v !== undefined) _quickProfilesCache = v; });
    }

    // ─── Default preferences ─────────────────────────────────────────
    const DEFAULTS = {
        editorFontSize: 'medium',   // small | medium | large
        autosave: true,
        undoHistory: true,
    };

    function _getPrefs() {
        try {
            if (_settingsPrefsCache !== null) return { ...DEFAULTS, ..._settingsPrefsCache };
            return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_PREFS_KEY) || '{}') };
        } catch (_) { return { ...DEFAULTS }; }
    }
    function _savePrefs(prefs) {
        _settingsPrefsCache = prefs;
        if (typeof appDB !== 'undefined') appDB.set(SETTINGS_PREFS_KEY, prefs);
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
        // Stats section has no interactive init — only populate
        _initBackupSection();
        _initInfoSection();
        _initUpgradeButton();
        _initModalControls();

        // Init pricing cart if available
        if (typeof window.initPricingCart === 'function') window.initPricingCart();

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
        // Inyectar galería de skins si ThemeManager está disponible
        if (window.ThemeManager && typeof window.ThemeManager.injectSelectorUI === 'function') {
            window.ThemeManager.injectSelectorUI();
        }
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

        const openModal = () => {
            if (overlay) {
                // A1: Colapsar todos los acordeones al reabrir
                document.querySelectorAll('.stg-accordion').forEach(a => a.classList.remove('open'));
                populateSettingsModal();
                overlay.classList.add('active');
            }
        };
        const closeModal = () => {
            if (overlay) overlay.classList.remove('active');
        };

        if (btnSettings) {
            btnSettings.addEventListener('click', openModal);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeModal();
            });
        }
    }

    // ─── 1. Account data (read-only) ─────────────────────────────────
    function _populateAccountData() {
        const profData = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
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
                if (typeof appDB !== 'undefined') appDB.set('groq_api_key', key);
                window.GROQ_API_KEY = key;
                if (typeof updateApiStatus === 'function') updateApiStatus(key);
                _setApiDot(true);
                _populateApiKeyStatus();
                if (typeof showToast === 'function') showToast('✅ API Key guardada', 'success');
            });
        }

        if (testBtn && input) {
            testBtn.addEventListener('click', async () => {
                const key = input.value.trim() || window.GROQ_API_KEY || localStorage.getItem('groq_api_key');
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
        const key = window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
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
                if (overlay) overlay.classList.remove('active');
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
        if (_quickProfilesCache !== null) return _quickProfilesCache;
        try { return JSON.parse(localStorage.getItem(QUICK_PROFILES_KEY) || '[]'); }
        catch (_) { return []; }
    }
    function _saveQuickProfiles(arr) {
        _quickProfilesCache = arr;
        if (typeof appDB !== 'undefined') appDB.set(QUICK_PROFILES_KEY, arr);
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

    // ─── 5. PDF Config link ──────────────────────────────────────────
    function _initPdfConfigLink() {
        const btn = document.getElementById('settingsOpenPdfConfig');
        if (btn) {
            btn.addEventListener('click', () => {
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.classList.remove('active');
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
                if (typeof appDB !== 'undefined') appDB.set('autosave_draft', editor.innerHTML);
                localStorage.setItem('autosave_draft', editor.innerHTML);
                const _ts = Date.now().toString();
                if (typeof appDB !== 'undefined') appDB.set('autosave_ts', _ts);
                localStorage.setItem('autosave_ts', _ts);
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
    // A2: Helper — observa cuándo un modal pierde .active y ejecuta callback
    function _watchForClose(element, callback) {
        const obs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.attributeName === 'class' && !element.classList.contains('active')) {
                    obs.disconnect();
                    callback();
                    break;
                }
            }
        });
        obs.observe(element, { attributes: true, attributeFilter: ['class'] });
    }

    function _initToolsLinks() {
        const historyBtn = document.getElementById('settingsOpenHistory');
        const dictBtn = document.getElementById('settingsOpenDictionary');
        const shortcutsBtn = document.getElementById('settingsOpenShortcuts');
        const overlay = document.getElementById('settingsModalOverlay');

        // A2: Función para reabrir settings al cerrar sub-modal
        const reopenSettings = () => {
            if (overlay) {
                populateSettingsModal();
                overlay.classList.add('active');
            }
        };

        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                if (overlay) overlay.classList.remove('active');
                const histOverlay = document.getElementById('reportHistoryOverlay');
                if (histOverlay) {
                    histOverlay.classList.add('active');
                    _watchForClose(histOverlay, reopenSettings);
                }
            });
        }
        if (dictBtn) {
            dictBtn.addEventListener('click', () => {
                if (overlay) overlay.classList.remove('active');
                // A3: Abrir diccionario sin validar editor, directo a tab "dictionary"
                if (typeof window.openMedDictModal === 'function') {
                    window.openMedDictModal({ skipEditorCheck: true, defaultTab: 'dictionary' });
                } else {
                    const dictModal = document.getElementById('medDictModal');
                    if (dictModal) dictModal.classList.add('active');
                }
                const dictModal = document.getElementById('medDictModal');
                if (dictModal) _watchForClose(dictModal, reopenSettings);
            });
        }
        if (shortcutsBtn) {
            shortcutsBtn.addEventListener('click', () => {
                if (overlay) overlay.classList.remove('active');
                // A4: Abrir help modal directamente en tab "Atajos"
                const helpModal = document.getElementById('helpModal');
                if (helpModal) {
                    document.querySelectorAll('.help-tab').forEach(t => {
                        t.classList.toggle('active', t.dataset.helpTab === 'shortcuts');
                    });
                    document.querySelectorAll('.help-tab-content').forEach(p => p.classList.remove('active'));
                    const panel = document.querySelector('[data-help-panel="shortcuts"]');
                    if (panel) panel.classList.add('active');
                    helpModal.classList.add('active');
                    _watchForClose(helpModal, reopenSettings);
                }
            });
        }
    }

    // ─── 8. Theme ────────────────────────────────────────────────────
    const DEFAULT_PRIMARY = '#0f766e';

    // Convierte hex a HSL { h, s, l } (h en grados, s y l en 0-1)
    function _hexToHSL(hex) {
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s, l };
    }

    function _hslToHex(h, s, l) {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        let r, g, b2;
        if (s === 0) { r = g = b2 = l; }
        else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h / 360 + 1/3);
            g = hue2rgb(p, q, h / 360);
            b2 = hue2rgb(p, q, h / 360 - 1/3);
        }
        const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b2)}`;
    }

    // Genera paleta a partir de un hex: primary, primary-light, primary-dark, accent
    function _generatePalette(hex) {
        const { h, s, l } = _hexToHSL(hex);
        return {
            primary:      hex,
            primaryLight: _hslToHex(h, Math.min(s * 1.2, 1), Math.min(l + 0.15, 0.85)),
            primaryDark:  _hslToHex(h, s, Math.max(l - 0.08, 0.1)),
            accent:       _hslToHex((h + 45) % 360, 0.85, 0.55)
        };
    }

    function _applyCustomColor(hex) {
        const p = _generatePalette(hex);
        const root = document.documentElement;
        root.style.setProperty('--primary', p.primary);
        root.style.setProperty('--primary-light', p.primaryLight);
        root.style.setProperty('--primary-dark', p.primaryDark);
        root.style.setProperty('--accent', p.accent);

        // Actualizar swatches de preview
        const preview = document.getElementById('settingsColorPreview');
        if (preview) {
            preview.style.display = '';
            const sd = document.getElementById('swatchDark');
            const sp = document.getElementById('swatchPrimary');
            const sl = document.getElementById('swatchLight');
            const sa = document.getElementById('swatchAccent');
            if (sd) sd.style.background = p.primaryDark;
            if (sp) sp.style.background = p.primary;
            if (sl) sl.style.background = p.primaryLight;
            if (sa) sa.style.background = p.accent;
        }
    }

    function _resetCustomColor() {
        const root = document.documentElement;
        root.style.removeProperty('--primary');
        root.style.removeProperty('--primary-light');
        root.style.removeProperty('--primary-dark');
        root.style.removeProperty('--accent');
        if (typeof appDB !== 'undefined') appDB.remove('customPrimaryColor');
        localStorage.removeItem('customPrimaryColor');
        const picker = document.getElementById('settingsColorPicker');
        const hexLabel = document.getElementById('settingsColorHex');
        const preview = document.getElementById('settingsColorPreview');
        if (picker) picker.value = DEFAULT_PRIMARY;
        if (hexLabel) hexLabel.textContent = DEFAULT_PRIMARY;
        if (preview) preview.style.display = 'none';
        if (typeof showToast === 'function') showToast('Color restaurado', 'success');
    }

    function _initThemeSection() {
        const lightBtn = document.getElementById('settingsThemeLight');
        const darkBtn = document.getElementById('settingsThemeDark');
        const colorPicker = document.getElementById('settingsColorPicker'); // input hidden
        const colorReset = document.getElementById('settingsColorReset');
        const hexLabel = document.getElementById('settingsColorHex');
        const colorTrigger = document.getElementById('settingsColorTrigger');
        const colorCircle = document.getElementById('settingsColorCircle');
        const colorPanel = document.getElementById('settingsColorPanel');
        const hueSlider = document.getElementById('settingsHueSlider');
        const satSlider = document.getElementById('settingsSatSlider');
        const hexInput = document.getElementById('settingsHexInput');
        const presets = document.getElementById('settingsColorPresets');

        // Persisted saturation for slider-based picking
        let _currentSat = 75; // 10-100 range

        if (lightBtn) {
            lightBtn.addEventListener('click', () => {
                document.documentElement.setAttribute('data-theme', 'light');
                if (typeof appDB !== 'undefined') appDB.set('theme', 'light');
                localStorage.setItem('theme', 'light');
                _populateThemeButtons();
            });
        }
        if (darkBtn) {
            darkBtn.addEventListener('click', () => {
                document.documentElement.setAttribute('data-theme', 'dark');
                if (typeof appDB !== 'undefined') appDB.set('theme', 'dark');
                localStorage.setItem('theme', 'dark');
                _populateThemeButtons();
            });
        }

        // ── Helpers for saturation slider gradient ──
        function _updateSatSliderGradient(hue) {
            if (!satSlider) return;
            // Show gradient from desaturated (pastel) to fully saturated
            satSlider.style.background = `linear-gradient(to right, hsl(${hue},10%,70%), hsl(${hue},50%,50%), hsl(${hue},100%,40%))`;
        }

        // ── Custom color picker ──────────────────────────────────────────
        function _setColor(hex, save) {
            if (colorPicker) colorPicker.value = hex;
            if (hexLabel) hexLabel.textContent = hex;
            if (hexInput) hexInput.value = hex.replace('#', '');
            if (colorCircle) colorCircle.style.background = hex;
            _applyCustomColor(hex);
            // Update hue slider to match
            const hsl = _hexToHSL(hex);
            if (hueSlider) {
                hueSlider.value = Math.round(hsl.h);
            }
            // Update sat slider to match
            _currentSat = Math.round(hsl.s * 100);
            if (satSlider) {
                satSlider.value = Math.max(10, _currentSat);
            }
            // Update sat slider gradient for current hue
            _updateSatSliderGradient(hsl.h);
            // Mark active preset
            if (presets) {
                presets.querySelectorAll('.stg-preset').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.color === hex);
                });
            }
            // Show swatches
            const preview = document.getElementById('settingsColorPreview');
            if (preview) preview.style.display = '';
            if (colorPanel) colorPanel.style.display = '';
            if (save) {
                if (typeof appDB !== 'undefined') appDB.set('customPrimaryColor', hex);
                localStorage.setItem('customPrimaryColor', hex);
            }
        }

        // Toggle panel on trigger click
        if (colorTrigger) {
            colorTrigger.addEventListener('click', () => {
                const visible = colorPanel && colorPanel.style.display !== 'none';
                if (colorPanel) colorPanel.style.display = visible ? 'none' : '';
                colorTrigger.classList.toggle('active', !visible);
            });
        }

        // Hue slider
        if (hueSlider) {
            hueSlider.addEventListener('input', () => {
                const h = parseInt(hueSlider.value);
                const s = _currentSat / 100;
                const l = s > 0.6 ? 0.35 + (1 - s) * 0.25 : 0.5 + (0.6 - s) * 0.3;
                const hex = _hslToHex(h, s, l);
                _setColor(hex, false);
            });
            hueSlider.addEventListener('change', () => {
                const h = parseInt(hueSlider.value);
                const s = _currentSat / 100;
                const l = s > 0.6 ? 0.35 + (1 - s) * 0.25 : 0.5 + (0.6 - s) * 0.3;
                const hex = _hslToHex(h, s, l);
                _setColor(hex, true);
            });
        }

        // Saturation slider
        if (satSlider) {
            satSlider.addEventListener('input', () => {
                const s = parseInt(satSlider.value) / 100;
                _currentSat = parseInt(satSlider.value);
                const h = hueSlider ? parseInt(hueSlider.value) : 174;
                const l = s > 0.6 ? 0.35 + (1 - s) * 0.25 : 0.5 + (0.6 - s) * 0.3;
                const hex = _hslToHex(h, s, l);
                _setColor(hex, false);
            });
            satSlider.addEventListener('change', () => {
                const s = parseInt(satSlider.value) / 100;
                _currentSat = parseInt(satSlider.value);
                const h = hueSlider ? parseInt(hueSlider.value) : 174;
                const l = s > 0.6 ? 0.35 + (1 - s) * 0.25 : 0.5 + (0.6 - s) * 0.3;
                const hex = _hslToHex(h, s, l);
                _setColor(hex, true);
            });
        }

        // Presets
        if (presets) {
            presets.addEventListener('click', (e) => {
                const btn = e.target.closest('.stg-preset');
                if (!btn || !btn.dataset.color) return;
                _setColor(btn.dataset.color, true);
            });
        }

        // Hex input
        if (hexInput) {
            hexInput.addEventListener('input', () => {
                let v = hexInput.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                hexInput.value = v;
                if (v.length === 6) {
                    _setColor('#' + v, false);
                }
            });
            hexInput.addEventListener('change', () => {
                let v = hexInput.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                if (v.length === 6) {
                    _setColor('#' + v, true);
                }
            });
        }

        // Also keep hidden input in sync (for any code that reads it)
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                _setColor(e.target.value, false);
            });
            colorPicker.addEventListener('change', (e) => {
                _setColor(e.target.value, true);
            });
        }

        if (colorReset) {
            colorReset.addEventListener('click', () => {
                _resetCustomColor();
                if (colorCircle) colorCircle.style.background = DEFAULT_PRIMARY;
                if (hexInput) hexInput.value = DEFAULT_PRIMARY.replace('#', '');
                if (hueSlider) {
                    const { h } = _hexToHSL(DEFAULT_PRIMARY);
                    hueSlider.value = Math.round(h);
                    _updateSatSliderGradient(h);
                }
                if (satSlider) satSlider.value = 75;
                _currentSat = 75;
                if (presets) presets.querySelectorAll('.stg-preset').forEach(b => b.classList.remove('active'));
                if (colorPanel) colorPanel.style.display = 'none';
                if (colorTrigger) colorTrigger.classList.remove('active');
            });
        }

        // Aplicar color guardado al iniciar
        const saved = localStorage.getItem('customPrimaryColor');
        if (saved) {
            _setColor(saved, false);
            // Keep panel closed on init
            if (colorPanel) colorPanel.style.display = 'none';
            if (colorTrigger) colorTrigger.classList.remove('active');
        } else {
            // Even without saved color, initialize sliders and swatches with defaults
            if (hueSlider) {
                const { h } = _hexToHSL(DEFAULT_PRIMARY);
                _updateSatSliderGradient(h);
            }
            _applyCustomColor(DEFAULT_PRIMARY);
        }
    }

    function _populateThemeButtons() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const lightBtn = document.getElementById('settingsThemeLight');
        const darkBtn = document.getElementById('settingsThemeDark');
        if (lightBtn) lightBtn.classList.toggle('active', current === 'light');
        if (darkBtn) darkBtn.classList.toggle('active', current === 'dark');

        // Sincronizar color picker con valor guardado
        const saved = localStorage.getItem('customPrimaryColor');
        const picker = document.getElementById('settingsColorPicker');
        const hexLabel = document.getElementById('settingsColorHex');
        if (saved) {
            if (picker) picker.value = saved;
            if (hexLabel) hexLabel.textContent = saved;
        } else {
            if (picker) picker.value = DEFAULT_PRIMARY;
            if (hexLabel) hexLabel.textContent = DEFAULT_PRIMARY;
        }
    }

    // ─── 9. Stats ────────────────────────────────────────────────────
    function _populateStats() {
        const el = (id) => document.getElementById(id);

        // Reports
        try {
            const reports = (window._reportHistCache !== undefined ? window._reportHistCache : null) || JSON.parse(localStorage.getItem('report_history') || '[]');
            if (el('statTotalReports')) el('statTotalReports').textContent = reports.length;
        } catch (_) {
            if (el('statTotalReports')) el('statTotalReports').textContent = '0';
        }

        // Transcriptions count
        const txCount = parseInt(localStorage.getItem('transcription_count') || '0');
        if (el('statTotalTranscriptions')) el('statTotalTranscriptions').textContent = txCount;

        // Patients
        try {
            const patients = (window._registryCache !== undefined ? window._registryCache : null) || JSON.parse(localStorage.getItem('patient_registry') || '[]');
            if (el('statTotalPatients')) el('statTotalPatients').textContent = patients.length;
        } catch (_) {
            if (el('statTotalPatients')) el('statTotalPatients').textContent = '0';
        }

        // Dictionary entries
        try {
            const dict = (window._customDictCache !== undefined ? window._customDictCache : null) || JSON.parse(localStorage.getItem('custom_med_dict') || '[]');
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
            clearBtn.addEventListener('click', async () => {
                const ok1 = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('⚠️ Borrar datos', '¿Estás seguro? Esto borrará TODOS tus datos locales (historial, configuración, diccionario, etc.). Esta acción NO se puede deshacer.')
                    : confirm('⚠️ ¿Estás seguro? Esto borrará TODOS tus datos locales?');
                if (!ok1) return;
                const ok2 = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('🔴 Última confirmación', 'Se borrarán todos los datos. ¿Continuar?')
                    : confirm('🔴 Última confirmación: se borrarán todos los datos. ¿Continuar?');
                if (!ok2) return;

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

    // ─── 10.5. Upgrade button ──────────────────────────────────────
    function _initUpgradeButton() {
        const btn = document.getElementById('settingsUpgradePlan');
        if (btn) {
            btn.addEventListener('click', () => {
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.classList.remove('active');
                if (typeof window.openPricingCart === 'function') {
                    window.openPricingCart();
                    const pricingOverlay = document.getElementById('pricingModalOverlay');
                    if (pricingOverlay) {
                        _watchForClose(pricingOverlay, () => {
                            if (overlay) { populateSettingsModal(); overlay.classList.add('active'); }
                        });
                    }
                }
            });
        }
    }

    // ─── 11. Info & Support ──────────────────────────────────────────
    function _initInfoSection() {
        const contactBtn = document.getElementById('settingsContactSupport');
        if (contactBtn) {
            contactBtn.addEventListener('click', () => {
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.classList.remove('active');
                const btnContacto = document.getElementById('btnContacto');
                if (btnContacto) btnContacto.click();
            });
        }
        // Botón abrir centro de ayuda desde Info
        const helpBtn = document.getElementById('settingsOpenHelp');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                const overlay = document.getElementById('settingsModalOverlay');
                if (overlay) overlay.classList.remove('active');
                const helpModal = document.getElementById('helpModal');
                if (helpModal) {
                    // Reset a tab guía rápida
                    document.querySelectorAll('.help-tab').forEach(t => {
                        t.classList.toggle('active', t.dataset.helpTab === 'guide');
                    });
                    document.querySelectorAll('.help-tab-content').forEach(p => p.classList.remove('active'));
                    const panel = document.querySelector('[data-help-panel="guide"]');
                    if (panel) panel.classList.add('active');
                    helpModal.classList.add('active');
                    _watchForClose(helpModal, () => {
                        if (overlay) { populateSettingsModal(); overlay.classList.add('active'); }
                    });
                }
            });
        }
    }

    function _populateInfo() {
        const el = (id) => document.getElementById(id);
        if (el('settingsAppVersion')) el('settingsAppVersion').textContent = '2.0';
        if (el('settingsAboutVersion')) el('settingsAboutVersion').textContent = '2.0';

        const deviceId = (typeof window._lmDeviceCache !== 'undefined' && window._lmDeviceCache) || localStorage.getItem('device_id') || '—';
        if (el('settingsDeviceId')) el('settingsDeviceId').textContent = deviceId.length > 16 ? deviceId.substring(0, 16) + '…' : deviceId;

        if (el('settingsAccountType') && typeof CLIENT_CONFIG !== 'undefined') {
            el('settingsAccountType').textContent = CLIENT_CONFIG.plan || CLIENT_CONFIG.type || '—';
        }

        // Calcular uso de localStorage
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

    // ─── Transcription counter (increment on each transcription) ────
    window.incrementTranscriptionCount = function () {
        const current = parseInt(localStorage.getItem('transcription_count') || '0');
        const next = (current + 1).toString();
        if (typeof appDB !== 'undefined') appDB.set('transcription_count', next);
        localStorage.setItem('transcription_count', next);
    };

})();
