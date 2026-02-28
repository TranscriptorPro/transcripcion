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

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG DINÁMICA — carga desde localStorage o URL ?id= (fábrica de clones)
// ═══════════════════════════════════════════════════════════════════════════
(function _loadDynamicConfig() {
    try {
        const params = new URLSearchParams(window.location.search);

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

        // 1) Si ya existe configuración de cliente guardada → usarla
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

        // 2) Detectar link de la fábrica: ?id=MED001
        const setupId = params.get('id');
        if (setupId) {
            // ── Protección: si ya era ADMIN, no sobreescribir por accidente ──
            const wasAdmin = !stored || (function() {
                try { return JSON.parse(stored).type === 'ADMIN' || !JSON.parse(stored).type; } catch(_) { return true; }
            })();
            if (wasAdmin) {
                // Marcar como pendiente pero NO activar automáticamente
                // El onboarding de business.js decidirá si procede
                window._PENDING_SETUP_ID = setupId;
                window._ADMIN_WAS_ACTIVE = true; // flag para que business.js pregunte
            } else {
                window._PENDING_SETUP_ID = setupId;
            }
            try { sessionStorage.setItem('pending_setup_id', setupId); } catch(_) {}
            // Limpiar URL inmediatamente (sin recargar)
            history.replaceState({}, document.title, window.location.pathname);
        } else {
            // Recuperar de sessionStorage si existe (retry tras recarga)
            try {
                const saved = sessionStorage.getItem('pending_setup_id');
                if (saved) {
                    window._PENDING_SETUP_ID = saved;
                    sessionStorage.removeItem('pending_setup_id');
                }
            } catch(_) {}
        }
    } catch (_) { /* navegadores antiguos sin URLSearchParams */ }
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
