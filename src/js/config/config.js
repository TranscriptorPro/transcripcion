/* {{CONFIG_IDENTITY}} */

/**
 * RB-3: NOTA SOBRE LICENCIA POR NAVEGADOR
 * ────────────────────────────────────────
 * El campo `device_id` (generado en diagnostic.js) identifica una instalación
 * de navegador, NO un dispositivo físico. Esto significa que:
 *  - Chrome y Firefox en el mismo PC generan device_ids distintos.
 *  - El mismo Chrome en dos perfiles de usuario genera device_ids distintos.
 *  - Borrar localStorage regenera un nuevo device_id.
 *  - Sesiones privadas/incógnito NO persisten device_id.
 *
 * Para validar el máximo de dispositivos (maxDevices), se comparan device_ids
 * almacenados en el backend (Google Sheets). El admin puede revocar IDs
 * desde el panel de administración.
 */

window.CLIENT_CONFIG = {
    type: 'ADMIN',        // ADMIN, TRIAL, NORMAL, PRO
    status: 'active',
    specialties: ['ALL'], // ALL = todas las especialidades
    maxDevices: Infinity,
    trialDays: 0,
    hasProMode: true,
    hasDashboard: true,
    canGenerateApps: true,
    allowedTemplates: [] // [] = todas; ['key1','key2'] = solo esas
};

// URL backend por defecto (Apps Script productivo).
const DEFAULT_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const DEFAULT_EMAIL_SENDER_NAME = 'Transcriptor Pro | Soporte';

function _isValidBackendUrl(url) {
    return /^https?:\/\//i.test(String(url || '').trim());
}

function _readStoredClientConfig() {
    try {
        return JSON.parse(localStorage.getItem('client_config_stored') || '{}') || {};
    } catch (_) {
        return {};
    }
}

function _pickBestBackendUrl() {
    const fromRuntime = (window.CLIENT_CONFIG && window.CLIENT_CONFIG.backendUrl) || '';
    if (_isValidBackendUrl(fromRuntime)) return String(fromRuntime).trim();

    const fromStoredConfig = _readStoredClientConfig().backendUrl || '';
    if (_isValidBackendUrl(fromStoredConfig)) return String(fromStoredConfig).trim();

    const fromLegacyStorage = localStorage.getItem('backend_url') || '';
    if (_isValidBackendUrl(fromLegacyStorage)) return String(fromLegacyStorage).trim();

    return DEFAULT_BACKEND_URL;
}

function _persistBackendUrlEverywhere(url) {
    const safeUrl = String(url || '').trim();
    if (!_isValidBackendUrl(safeUrl)) return;

    if (window.CLIENT_CONFIG) window.CLIENT_CONFIG.backendUrl = safeUrl;

    try {
        const storedCfg = _readStoredClientConfig();
        storedCfg.backendUrl = safeUrl;
        localStorage.setItem('client_config_stored', JSON.stringify(storedCfg));
    } catch (_) {}

    try { localStorage.setItem('backend_url', safeUrl); } catch (_) {}

    if (typeof appDB !== 'undefined') {
        try {
            appDB.set('backend_url', safeUrl);
        } catch (_) {}
    }
}

window.getResolvedBackendUrl = function () {
    const url = _pickBestBackendUrl();
    _persistBackendUrlEverywhere(url);
    return url;
};

function _readStoredSenderName() {
    try {
        const fromCfg = _readStoredClientConfig().emailSenderName;
        if (fromCfg && String(fromCfg).trim()) return String(fromCfg).trim();
    } catch (_) {}

    try {
        const fromLs = localStorage.getItem('email_sender_name');
        if (fromLs && String(fromLs).trim()) return String(fromLs).trim();
    } catch (_) {}

    return '';
}

function _persistSenderNameEverywhere(name) {
    const safeName = String(name || '').trim();
    if (!safeName) return;

    if (window.CLIENT_CONFIG) window.CLIENT_CONFIG.emailSenderName = safeName;

    try {
        const storedCfg = _readStoredClientConfig();
        storedCfg.emailSenderName = safeName;
        localStorage.setItem('client_config_stored', JSON.stringify(storedCfg));
    } catch (_) {}

    try { localStorage.setItem('email_sender_name', safeName); } catch (_) {}

    if (typeof appDB !== 'undefined') {
        try { appDB.set('email_sender_name', safeName); } catch (_) {}
    }
}

window.getResolvedEmailSenderName = function () {
    const runtime = window.CLIENT_CONFIG && window.CLIENT_CONFIG.emailSenderName;
    const sender = String(runtime || _readStoredSenderName() || DEFAULT_EMAIL_SENDER_NAME).trim();
    _persistSenderNameEverywhere(sender);
    return sender;
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG DINÁMICA — carga desde localStorage o URL ?id= (fábrica de clones)
// ═══════════════════════════════════════════════════════════════════════════
(function _loadDynamicConfig() {
    try {
        const params = new URLSearchParams(window.location.search);
        const setupId = params.get('id');
        const host = String(window.location.hostname || '').toLowerCase();
        const path = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
        const isOfficialAdminBase = (host === 'transcriptorpro.github.io' && path === '/transcripcion');

        // 0) Escape hatch: ?admin → forzar modo ADMIN (borrar config de cliente)
        if (params.has('admin')) {
            localStorage.removeItem('client_config_stored');
            sessionStorage.removeItem('pending_setup_id');
            // También limpiar de IndexedDB si appDB existe
            if (typeof appDB !== 'undefined' && appDB.remove) {
                try { appDB.remove('client_config_stored'); } catch(_) {}
            }
            history.replaceState({}, document.title, window.location.pathname);
            // CLIENT_CONFIG ya es ADMIN por defecto — no hacer nada más
            return;
        }

        // 0.5) URL oficial del panel admin: SIEMPRE abrir como ADMIN
        // (salvo links de fabrica con ?id= que deben configurar clones)
        if (isOfficialAdminBase && !setupId) {
            localStorage.removeItem('client_config_stored');
            sessionStorage.removeItem('pending_setup_id');
            if (typeof appDB !== 'undefined' && appDB.remove) {
                try { appDB.remove('client_config_stored'); } catch(_) {}
            }
            return;
        }

        // 1) Detectar link de la fábrica: ?id=MED001 (tiene prioridad)
        if (setupId) {
            // ── Protección: si ya era ADMIN, no sobreescribir por accidente ──
            // Solo marcar como "admin activo" si EXISTE una config almacenada de tipo ADMIN.
            // Si stored es null (usuario nuevo), NO es admin — es un gift user legítimo.
            const storedForAdminFlag = localStorage.getItem('client_config_stored');
            const wasAdmin = storedForAdminFlag && (function() {
                try {
                    const parsed = JSON.parse(storedForAdminFlag);
                    return parsed.type === 'ADMIN' || !parsed.type;
                } catch(_) {
                    return true;
                }
            })();
            window._PENDING_SETUP_ID = setupId;
            if (wasAdmin) {
                window._ADMIN_WAS_ACTIVE = true; // flag para que business.js pregunte
            }
            try { sessionStorage.setItem('pending_setup_id', setupId); } catch(_) {}
            // Limpiar URL inmediatamente (sin recargar)
            history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        // 2) Si ya existe configuración de cliente guardada → usarla
        const stored = localStorage.getItem('client_config_stored');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.type && parsed.type !== 'ADMIN') {
                    Object.assign(window.CLIENT_CONFIG, parsed);
                    return;
                }
            } catch (_) { /* fallback a ADMIN */ }
        }

        // 3) Recuperar de sessionStorage si existe (retry tras recarga)
        try {
            const saved = sessionStorage.getItem('pending_setup_id');
            if (saved) {
                window._PENDING_SETUP_ID = saved;
                sessionStorage.removeItem('pending_setup_id');
            }
        } catch(_) {}
    } catch (_) { /* navegadores antiguos sin URLSearchParams */ }
})();

// Garantiza backend URL consistente desde el arranque (admin y cliente final).
(function _hydrateBackendUrlAtBoot() {
    try {
        window.getResolvedBackendUrl();
    } catch (_) {}
})();

(function _hydrateSenderNameAtBoot() {
    try {
        window.getResolvedEmailSenderName();
    } catch (_) {}
})();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// ============ RB-6: CONTEO LOCAL DE USO DE API ============
window.apiUsageTracker = {
    _KEY: 'api_usage_stats',
    _cache: null,
    _get() {
        if (this._cache !== null) return this._cache;
        try { return JSON.parse(localStorage.getItem(this._KEY)) || this._default(); }
        catch (_) { return this._default(); }
    },
    _default() {
        return { transcriptions: 0, structurings: 0, lastReset: new Date().toISOString(), history: [] };
    },
    _save(data) {
        this._cache = data;
        if (typeof appDB !== 'undefined') {
            appDB.set(this._KEY, data); // fire-and-forget
        } else {
            localStorage.setItem(this._KEY, JSON.stringify(data));
        }
    },
    _initCache() {
        if (typeof appDB !== 'undefined') {
            appDB.get(this._KEY).then((v) => { if (v) this._cache = v; }).catch(function() {});
        }
    },
    trackTranscription() {
        const d = this._get();
        d.transcriptions++;
        d.history.push({ type: 'transcription', ts: new Date().toISOString() });
        if (d.history.length > 200) d.history = d.history.slice(-200);
        this._save(d);
    },
    trackStructuring() {
        const d = this._get();
        d.structurings++;
        d.history.push({ type: 'structuring', ts: new Date().toISOString() });
        if (d.history.length > 200) d.history = d.history.slice(-200);
        this._save(d);
    },
    getStats() { return this._get(); },
    reset() { this._save(this._default()); }
};
window.apiUsageTracker._initCache();
