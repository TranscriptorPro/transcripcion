/**
 * diagnostic.js — Sistema de Diagnóstico Remoto
 * Recopila el estado del cliente (API key, config, entorno) y lo envía al
 * panel de administración via Google Apps Script / Sheets.
 *
 * API pública:
 *   window.buildDiagnosticReport()  → objeto con todos los campos
 *   window.sendManualDiagnostic()   → envía el reporte al Sheet
 *   window.checkDiagnosticPendingFlag(validateResponse) → auto-envío si el admin lo solicitó
 *   window.initDiagnostic()         → muestra/oculta el botón según CLIENT_CONFIG
 */

const _DIAG_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
let _diagDeviceCache = null;
(function _initDiagDeviceCache() {
    if (typeof appDB !== 'undefined') {
        appDB.get('device_id').then(function(v) { if (v) _diagDeviceCache = v; }).catch(function() {});
    }
})();

function _diagDeviceId() {
    if (_diagDeviceCache) return _diagDeviceCache;
    let id = localStorage.getItem('device_id') || null;
    if (!id) {
        id = 'DEV_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
        _diagDeviceCache = id;
        if (typeof appDB !== 'undefined') appDB.set('device_id', id);
        else localStorage.setItem('device_id', id);
    } else {
        _diagDeviceCache = id;
    }
    return id;
}

async function _safeJson(key, fallback) {
    try {
        const val = (typeof appDB !== 'undefined' ? await appDB.get(key) : null)
            ?? JSON.parse(localStorage.getItem(key) || 'null');
        return val ?? fallback;
    } catch (_) { return fallback; }
}

/* ── Core ─────────────────────────────────────────────────────────────────── */

/**
 * Construye el objeto de diagnóstico con todos los campos relevantes.
 * Nunca incluye el valor real de la API key, solo su presencia.
 * @returns {Object}
 */
window.buildDiagnosticReport = async function () {
    const profData   = await _safeJson('prof_data', {});
    const pendQueue  = await _safeJson('struct_pending_queue', []);
    const isPwa      = !!(window.matchMedia?.('(display-mode: standalone)')?.matches);
    const swActive   = !!(navigator.serviceWorker?.controller);

    const _get = async (key) => (typeof appDB !== 'undefined' ? await appDB.get(key) : null)
        ?? localStorage.getItem(key);

    return {
        timestamp:            new Date().toISOString(),
        // Identidad del profesional (sin datos sensibles)
        id:                   profData.matricula || profData.nombre || 'unknown',
        device_id:            _diagDeviceId(),
        nombre:               profData.nombre    || '',
        matricula:            profData.matricula || '',
        prof_data_complete:   !!(profData.nombre && profData.matricula),
        // Estado de la API key
        api_key_present:      !!(window.GROQ_API_KEY || await _get('groq_api_key')),
        api_key_last_status:  (await _get('api_key_last_status')) || 'unknown',
        api_key_last_check:   (await _get('api_key_last_check'))  || null,
        // Configuración PDF / firma
        has_logo:             !!(await _get('pdf_logo')),
        has_signature:        !!(await _get('pdf_signature')),
        // Cola de estructurado pendiente
        pending_queue_count:  Array.isArray(pendQueue) ? pendQueue.length : 0,
        last_struct_error:    (await _get('last_struct_error')) || null,
        // Modo y configuración de la app
        current_mode:         window.currentMode || 'normal',
        client_type:          (typeof CLIENT_CONFIG !== 'undefined') ? CLIENT_CONFIG.type   : 'unknown',
        client_status:        (typeof CLIENT_CONFIG !== 'undefined') ? CLIENT_CONFIG.status : 'unknown',
        // Entorno del navegador
        user_agent:           navigator.userAgent,
        online:               navigator.onLine,
        pwa_installed:        isPwa,
        sw_active:            swActive,
        // Meta
        last_diag_sent:       (await _get('last_diagnostic_sent')) || null
    };
};

/**
 * Envía el reporte al Google Sheets via Apps Script (POST).
 * @param {Object} report  Resultado de buildDiagnosticReport()
 * @returns {Promise<Object>}
 */
async function _sendDiagnosticToSheet(report) {
    const payload = {
        action:   'save_diagnostic',
        id:       report.id,
        deviceId: report.device_id,
        report:   report
    };
    const response = await fetch(_DIAG_SCRIPT_URL, {
        method:  'POST',
        // Apps Script requiere text/plain para evitar preflight CORS
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
}

/**
 * Llamar tras la validación de licencia con el servidor.
 * Si la respuesta incluye diagnostico_solicitado=true, envía el diagnóstico
 * automáticamente sin interrumpir al usuario.
 * @param {Object} validateResponse  Respuesta del endpoint validate de Apps Script
 */
window.checkDiagnosticPendingFlag = function (validateResponse) {
    if (!validateResponse) return;
    const flag = validateResponse.diagnostico_solicitado === true
        || String(validateResponse.Diagnostico_Pendiente).toLowerCase() === 'true';
    if (flag) {
        window.sendManualDiagnostic(true);
    }
};

/**
 * Envía el diagnóstico al soporte. Puede ser llamado por el usuario
 * (silent=false) o automáticamente (silent=true).
 * @param {boolean} [silent=false]  true → no muestra toast de "enviando"
 */
window.sendManualDiagnostic = async function (silent = false) {
    const toast = (msg, type) => {
        if (typeof showToast === 'function') showToast(msg, type);
    };

    try {
        if (!silent) toast('📡 Enviando diagnóstico al soporte…', 'info');
        const report = await window.buildDiagnosticReport();
        await _sendDiagnosticToSheet(report);
        toast('✅ Diagnóstico enviado al soporte', 'success');
        if (typeof appDB !== 'undefined') appDB.set('last_diagnostic_sent', new Date().toISOString());
        else localStorage.setItem('last_diagnostic_sent', new Date().toISOString());
    } catch (err) {
        console.warn('[diagnostic] Error al enviar diagnóstico:', err);
        if (!silent) toast('❌ No se pudo enviar el diagnóstico', 'error');
    }
};

/* ── Inicialización UI ────────────────────────────────────────────────────── */

/**
 * Muestra / oculta el botón #btnSendDiagnostic según el tipo de usuario.
 * Solo visible para usuarios NO-ADMIN (TRIAL, NORMAL, PRO).
 */
window.initDiagnostic = function () {
    const isAdmin = (typeof CLIENT_CONFIG === 'undefined' || CLIENT_CONFIG.type === 'ADMIN');
    const btn = document.getElementById('btnSendDiagnostic');
    if (!btn) return;
    if (isAdmin) { btn.style.display = 'none'; return; }
    btn.style.display = '';
    btn.addEventListener('click', () => window.sendManualDiagnostic(false));
};
