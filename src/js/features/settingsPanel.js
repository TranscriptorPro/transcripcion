// ============ SETTINGS PANEL — Mega Configuration Modal ============
// Accordion-based settings for client users (and admin optionally).
// Integrates: API Key, profile data, workplace, editor prefs, tools,
// theme, stats, backup/restore, quick profiles, and app info.

(function () {
    'use strict';

    const SETTINGS_PREFS_KEY = 'settings_prefs';

    // ─── In-memory write-through caches ─────────────────────────────────
    let _settingsPrefsCache = null;
    // Init caches from appDB at module load
    if (typeof appDB !== 'undefined') {
        appDB.get(SETTINGS_PREFS_KEY).then(v => { if (v !== undefined) _settingsPrefsCache = v; });
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
        _applyPlanVisibility();
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
        const utils = window.SettingsModalShellUtils || {};
        if (typeof utils.initAccordions === 'function') {
            utils.initAccordions();
        }
    }

    // ─── Modal open/close ────────────────────────────────────────────
    function _initModalControls() {
        const utils = window.SettingsModalShellUtils || {};
        if (typeof utils.initModalControls === 'function') {
            utils.initModalControls({
                onOpen: () => {
                    populateSettingsModal();
                }
            });
        }
    }

    // ─── Plan-based visibility for accordion sections ────────────────
    function _applyPlanVisibility() {
        const utils = window.SettingsModalShellUtils || {};
        if (typeof utils.applyPlanVisibility === 'function') {
            utils.applyPlanVisibility();
        }
    }

    // ─── 1. Account data (read-only) ─────────────────────────────────
    function _populateAccountData() {
        const utils = window.SettingsAccountUtils || {};
        if (typeof utils.populateAccountData === 'function') {
            utils.populateAccountData({ onProfileChanged: () => populateSettingsModal() });
        }
    }

    // ─── 2. API Key ──────────────────────────────────────────────────
    function _initApiKeySection() {
        const utils = window.SettingsApiUtils || {};
        if (typeof utils.initApiKeySection === 'function') {
            utils.initApiKeySection();
        }
    }

    function _populateApiKeyStatus() {
        const utils = window.SettingsApiUtils || {};
        if (typeof utils.populateApiKeyStatus === 'function') {
            utils.populateApiKeyStatus();
        }
    }

    // ─── 3. Workplace ────────────────────────────────────────────────
    function _initWorkplaceSection() {
        const utils = window.SettingsWorkplaceUtils || {};
        if (typeof utils.initWorkplaceSection === 'function') {
            utils.initWorkplaceSection();
        }
    }

    function _populateWorkplace() {
        const utils = window.SettingsWorkplaceUtils || {};
        if (typeof utils.populateWorkplace === 'function') {
            utils.populateWorkplace();
        }
    }

    // ─── 4. Quick Profiles ───────────────────────────────────────────
    function _initQuickProfiles() {
        const utils = window.SettingsQuickProfilesUtils || {};
        if (typeof utils.initQuickProfiles === 'function') {
            utils.initQuickProfiles({ onProfilesChanged: () => _populateQuickProfiles() });
        }
    }

    function _populateQuickProfiles() {
        const utils = window.SettingsQuickProfilesUtils || {};
        if (typeof utils.populateQuickProfiles === 'function') {
            utils.populateQuickProfiles();
        }
    }

    // ─── 5. PDF Config link ──────────────────────────────────────────
    function _initPdfConfigLink() {
        const utils = window.SettingsWorkplaceUtils || {};
        if (typeof utils.initPdfConfigLink === 'function') {
            utils.initPdfConfigLink();
        }
    }

    // ─── 6. Editor preferences ───────────────────────────────────────
    function _initEditorPrefs() {
        const utils = window.SettingsEditorPrefsUtils || {};
        if (typeof utils.initEditorPrefs === 'function') {
            utils.initEditorPrefs({
                getPrefs: _getPrefs,
                savePrefs: _savePrefs
            });
        }
    }

    function _populateEditorPrefs() {
        const utils = window.SettingsEditorPrefsUtils || {};
        if (typeof utils.populateEditorPrefs === 'function') {
            utils.populateEditorPrefs(_getPrefs);
        }
    }

    function _applyEditorPrefs(prefs) {
        const utils = window.SettingsEditorPrefsUtils || {};
        if (typeof utils.applyEditorPrefs === 'function') {
            utils.applyEditorPrefs(prefs);
        }
    }

    // Restore draft on load if available
    window.restoreAutosaveDraft = function () {
        const utils = window.SettingsEditorPrefsUtils || {};
        if (typeof utils.restoreAutosaveDraft === 'function') {
            return utils.restoreAutosaveDraft();
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
        const utils = window.SettingsToolsLinksUtils || {};
        if (typeof utils.initToolsLinks === 'function') {
            utils.initToolsLinks({
                watchForClose: _watchForClose,
                repopulateAndOpenSettings: () => {
                    const overlay = document.getElementById('settingsModalOverlay');
                    if (overlay) {
                        populateSettingsModal();
                        overlay.classList.add('active');
                    }
                }
            });
        }
    }

    // ─── 8. Theme ────────────────────────────────────────────────────
    const DEFAULT_PRIMARY = '#0f766e';
    const _themeUtils = window.SettingsThemeUtils || {};
    const _hexToHSL = _themeUtils.hexToHSL || (() => ({ h: 174, s: 0.75, l: 0.3 }));
    const _hslToHex = _themeUtils.hslToHex || (() => DEFAULT_PRIMARY);
    const _generatePalette = _themeUtils.generatePalette || ((hex) => ({
        primary: hex,
        primaryLight: hex,
        primaryDark: hex,
        accent: hex
    }));

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
        const utils = window.SettingsModalPopulateUtils || {};
        if (typeof utils.populateStats === 'function') {
            utils.populateStats();
        }
    }

    // ─── 10. Backup / Restore ────────────────────────────────────────
    function _initBackupSection() {
        const exportBtn = document.getElementById('settingsExportBackup');
        const importInput = document.getElementById('settingsImportBackup');
        const clearBtn = document.getElementById('settingsClearData');
        const _backupUtils = window.SettingsBackupUtils || {};
        const _exportBackup = _backupUtils.exportBackup;
        const _importBackup = _backupUtils.importBackup;

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (typeof _exportBackup === 'function') {
                    _exportBackup();
                }
            });
        }
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (typeof _importBackup === 'function') {
                    _importBackup(file);
                }
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

    // ─── 10.5. Upgrade button ──────────────────────────────────────
    function _initUpgradeButton() {
        const utils = window.SettingsModalActionsUtils || {};
        if (typeof utils.initUpgradeButton === 'function') {
            utils.initUpgradeButton({
                watchForClose: _watchForClose,
                repopulateAndOpenSettings: () => {
                    const overlay = document.getElementById('settingsModalOverlay');
                    if (overlay) {
                        populateSettingsModal();
                        overlay.classList.add('active');
                    }
                }
            });
        }
    }

    // ─── 11. Info & Support ──────────────────────────────────────────
    function _initInfoSection() {
        const utils = window.SettingsModalActionsUtils || {};
        if (typeof utils.initInfoSection === 'function') {
            utils.initInfoSection({
                watchForClose: _watchForClose,
                repopulateAndOpenSettings: () => {
                    const overlay = document.getElementById('settingsModalOverlay');
                    if (overlay) {
                        populateSettingsModal();
                        overlay.classList.add('active');
                    }
                }
            });
        }
    }

    function _populateInfo() {
        const utils = window.SettingsModalPopulateUtils || {};
        if (typeof utils.populateInfo === 'function') {
            utils.populateInfo();
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
