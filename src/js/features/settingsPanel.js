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
        inlineParagraphReview: true,
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
    function _watchForClose(element, callback) {
        const watchUtils = window.SettingsModalWatchUtils || {};
        if (typeof watchUtils.watchForClose === 'function') {
            watchUtils.watchForClose(element, callback);
        }
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

    function _initThemeSection() {
        const utils = window.SettingsThemeSectionUtils || {};
        if (typeof utils.initThemeSection === 'function') {
            utils.initThemeSection({ defaultPrimary: DEFAULT_PRIMARY });
        }
    }

    function _populateThemeButtons() {
        const utils = window.SettingsThemeSectionUtils || {};
        if (typeof utils.populateThemeButtons === 'function') {
            utils.populateThemeButtons({ defaultPrimary: DEFAULT_PRIMARY });
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
        const utils = window.SettingsBackupActionsUtils || {};
        if (typeof utils.initBackupSection === 'function') {
            utils.initBackupSection();
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
