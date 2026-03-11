/**
 * licenseManager.js — Validación de licencia y métricas para apps clonadas
 * ═══════════════════════════════════════════════════════════════════════════
 * Este módulo se activa SOLO cuando CLIENT_CONFIG.type !== 'ADMIN'.
 * En la app nodriza (ADMIN), todas las funciones son passthrough/no-op.
 *
 * Flujo:
 *   1. Al cargar la app → validateLicense() llama al backend
 *   2. Si la licencia es válida → permite el uso normal
 *   3. Si expirada/bloqueada → muestra overlay y bloquea funcionalidad
 *   4. Métricas de uso se envían al backend periódicamente
 *
 * Dependencias: config.js (CLIENT_CONFIG), diagnostic.js (device_id), toast.js
 */

/* ── Constantes ───────────────────────────────────────────────────────────── */
const _LM_SCRIPT_URL = (function () {
    // Toma la URL del backend de la configuración o de diagnostic.js
    if (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.backendUrl) {
        return CLIENT_CONFIG.backendUrl;
    }
    // Fallback: misma URL que usa diagnostic.js
    return 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
})();

const _LM_CACHE_KEY      = 'license_cache';
const _LM_CACHE_TTL      = 4 * 60 * 60 * 1000; // 4 horas — revalidar cada 4h
const _LM_METRICS_KEY    = 'pending_metrics';
const _LM_METRICS_INTERVAL = 15 * 60 * 1000; // Enviar métricas cada 15 min
const _LM_PAYMENT_REMINDER_KEY = 'payment_due_reminder_last_ts';

/* ── Estado interno ───────────────────────────────────────────────────────── */
let _lmValidated   = false;
let _lmLicenseData = null;
let _lmMetricsTimer = null;

let _lmDeviceCache  = null;    // device_id en memoria
let _lmCacheCache   = null;    // license_cache en memoria
let _lmMetricsCache = null;    // pending_metrics en memoria
(function _initLmCaches() {
    if (typeof appDB !== 'undefined') {
        appDB.get('device_id').then(function(v) { if (v) _lmDeviceCache = v; }).catch(function() {});
        appDB.get(_LM_CACHE_KEY).then(function(v) { if (v) _lmCacheCache = v; }).catch(function() {});
        appDB.get(_LM_METRICS_KEY).then(function(v) { _lmMetricsCache = v || []; }).catch(function() {});
    }
})();

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Obtiene o genera el device_id (mismo que diagnostic.js) */
function _lmGetDeviceId() {
    if (_lmDeviceCache) return _lmDeviceCache;
    let id = localStorage.getItem('device_id') || null;
    if (!id) {
        id = 'dev_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random().toString(36).slice(2, 10));
        _lmDeviceCache = id;
        if (typeof appDB !== 'undefined') appDB.set('device_id', id);
        else localStorage.setItem('device_id', id);
    } else {
        _lmDeviceCache = id;
    }
    return id;
}

/** Obtiene el ID del médico configurado en la app clonada */
function _lmGetMedicoId() {
    if (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.medicoId) {
        return CLIENT_CONFIG.medicoId;
    }
    return localStorage.getItem('medico_id') || '';
}

/** Lee licencia cachedada */
function _lmGetCache() {
    try {
        const cached = _lmCacheCache || JSON.parse(localStorage.getItem(_LM_CACHE_KEY) || 'null');
        if (!cached) return null;
        if (!Number.isFinite(Number(cached.timestamp))) {
            _lmCacheCache = null;
            localStorage.removeItem(_LM_CACHE_KEY);
            if (typeof appDB !== 'undefined') appDB.remove(_LM_CACHE_KEY);
            return null;
        }
        if (Date.now() - cached.timestamp > _LM_CACHE_TTL) {
            _lmCacheCache = null;
            localStorage.removeItem(_LM_CACHE_KEY);
            if (typeof appDB !== 'undefined') appDB.remove(_LM_CACHE_KEY);
            return null;
        }
        const cacheUtils = window.LicenseCacheUtils || {};
        if (typeof cacheUtils.isExpiredByDate === 'function' && cacheUtils.isExpiredByDate(cached.data)) {
            _lmCacheCache = null;
            localStorage.removeItem(_LM_CACHE_KEY);
            if (typeof appDB !== 'undefined') appDB.remove(_LM_CACHE_KEY);
            return null;
        }
        return cached.data;
    } catch (e) {
        return null;
    }
}

/** Guarda licencia en cache */
function _lmSetCache(data) {
    const entry = { data: data, timestamp: Date.now() };
    _lmCacheCache = entry;
    // Persist in localStorage for deterministic offline fallback across reloads.
    localStorage.setItem(_LM_CACHE_KEY, JSON.stringify(entry));
    // Mirror into appDB as best-effort.
    if (typeof appDB !== 'undefined') {
        try { appDB.set(_LM_CACHE_KEY, entry); } catch (_) { /* mirror best-effort */ }
    }
}

/* ── Validación de Licencia ───────────────────────────────────────────────── */

/**
 * Valida la licencia contra el backend.
 * @returns {Promise<Object>} Datos del doctor o error
 */
async function _lmCallValidate() {
    const medicoId = _lmGetMedicoId();
    const deviceId = _lmGetDeviceId();

    if (!medicoId) {
        return { error: 'No hay ID de médico configurado', code: 'NO_ID' };
    }

    const url = `${_LM_SCRIPT_URL}?action=validate&id=${encodeURIComponent(medicoId)}&deviceId=${encodeURIComponent(deviceId)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
    } catch (err) {
        console.warn('[licenseManager] Error de conexión:', err);
        // Si no hay conexión, usar cache si existe
        const cached = _lmGetCache();
        if (cached) {
            // Validar si la licencia cacheada ya expiró por fecha
            if (cached.fecha_vencimiento) {
                const expDate = new Date(cached.fecha_vencimiento);
                if (!isNaN(expDate) && expDate < new Date()) {
                    console.warn('[licenseManager] Cache offline: licencia vencida por fecha');
                    return { error: 'Licencia expirada (offline)', code: 'EXPIRED', plan: cached.plan || 'unknown' };
                }
            }
            const cacheUtils = window.LicenseCacheUtils || {};
            if (typeof cacheUtils.isExpiredByDate === 'function' && cacheUtils.isExpiredByDate(cached)) {
                console.warn('[licenseManager] Cache offline: licencia vencida por fecha');
                return { error: 'Licencia expirada (offline)', code: 'EXPIRED', plan: cached.plan || 'unknown' };
            }
            console.info('[licenseManager] Usando cache offline');
            return cached;
        }
        return { error: 'Sin conexión al servidor de licencias', code: 'OFFLINE' };
    }
}

/**
 * Ejecuta la validación y aplica las restricciones.
 * Llamar al cargar la app.
 */
window.validateLicense = async function () {
    // ADMIN → bypass total
    if (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN') {
        _lmValidated = true;
        console.info('[licenseManager] Modo ADMIN — sin validación de licencia');
        return { validated: true, type: 'ADMIN' };
    }

    const result = await _lmCallValidate();

    if (result.error) {
        // Degradación trial→normal: si es trial expirado, no bloquear sino degradar
        if (result.code === 'EXPIRED' && result.plan === 'trial') {
            _lmValidated = true;
            _lmLicenseData = result;
            // Degradar CLIENT_CONFIG a NORMAL
            if (typeof CLIENT_CONFIG !== 'undefined') {
                CLIENT_CONFIG.type = 'NORMAL';
                CLIENT_CONFIG.hasProMode = false;
                CLIENT_CONFIG.maxDevices = 1;
                // Persistir la degradación
                try {
                    const stored = localStorage.getItem('client_config_stored');
                    if (stored) {
                        const cfg = JSON.parse(stored);
                        cfg.type = 'NORMAL';
                        cfg.hasProMode = false;
                        cfg.maxDevices = 1;
                        localStorage.setItem('client_config_stored', JSON.stringify(cfg));
                    }
                } catch(_) {}
            }
            // Notificar al usuario
            if (typeof showToast === 'function') {
                showToast('⏰ Tu período de prueba finalizó. Ahora usás el plan Normal. Contactá al administrador para actualizar.', 'warning', 8000);
            }
            console.info('[licenseManager] Trial expirado → degradado a NORMAL');
            return result;
        }
        _lmValidated = false;
        _lmLicenseData = result;
        _lmShowBlockedUI(result);
        return result;
    }

    // Validación exitosa
    _lmValidated = true;
    _lmLicenseData = result;
    _lmSetCache(result);

    // Verificar diagnóstico pendiente
    if (typeof window.checkDiagnosticPendingFlag === 'function') {
        window.checkDiagnosticPendingFlag(result);
    }

    // Advertencia de días restantes
    if (result.days_remaining !== null && result.days_remaining <= 7 && result.days_remaining > 0) {
        _lmShowTrialWarning(result.days_remaining);
    }

    _lmMaybeShowPaymentReminder(result);

    // Aviso de compra aplicada (one-shot)
    if (result.purchase_message) {
        if (typeof showToast === 'function') {
            showToast(String(result.purchase_message), 'success', 7000);
        }
        try {
            const ackPayload = {
                action: 'purchase_ack_message',
                medicoId: _lmGetMedicoId()
            };
            fetch(_LM_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(ackPayload)
            }).catch(function() {});
        } catch (_) {}
    }

    // Iniciar envío periódico de métricas
    _lmStartMetricsSync();

    return result;
};

/**
 * Verifica si la licencia está validada (para chequeos rápidos).
 * @returns {boolean}
 */
window.isLicenseValid = function () {
    if (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN') return true;
    return _lmValidated;
};

/**
 * Obtiene los datos de la licencia actual.
 * @returns {Object|null}
 */
window.getLicenseData = function () {
    return _lmLicenseData;
};

/* ── UI de Bloqueo ────────────────────────────────────────────────────────── */

function _lmShowBlockedUI(result) {
    const code = result.code || 'UNKNOWN';
    let title = '⚠️ Licencia no válida';
    const _esc = typeof escapeHtml === 'function' ? escapeHtml : (s => (s||"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"));
    let message = _esc(result.error || 'No se pudo verificar la licencia.');
    let showContact = true;
    let _contactMotivo = '';

    switch (code) {
        case 'EXPIRED':
            title = '⏰ Licencia expirada';
            message = `Su ${result.plan === 'trial' ? 'período de prueba' : 'licencia'} ha vencido. Contacte al administrador para renovar.`;
            _contactMotivo = 'Licencia expirada o cuenta bloqueada';
            break;
        case 'BANNED':
            title = '🚫 Cuenta suspendida';
            message = 'Su cuenta ha sido suspendida. Contacte al administrador.';
            _contactMotivo = 'Licencia expirada o cuenta bloqueada';
            break;
        case 'INACTIVE':
            title = '⏸️ Cuenta desactivada';
            message = 'Su cuenta está desactivada. Contacte al administrador para reactivarla.';
            _contactMotivo = 'Licencia expirada o cuenta bloqueada';
            break;
        case 'DEVICE_LIMIT':
            title = '📱 Límite de dispositivos';
            message = `Ha alcanzado el máximo de ${result.devices_max} dispositivo(s) permitido(s). Contacte al administrador para liberar dispositivos.`;
            _contactMotivo = 'Límite de dispositivos alcanzado';
            break;
        case 'NOT_FOUND':
            title = '❓ Usuario no encontrado';
            message = 'El ID del médico no está registrado en el sistema.';
            break;
        case 'OFFLINE':
            title = '📡 Sin conexión';
            message = 'No se pudo conectar al servidor de licencias. Verifique su conexión a internet.';
            showContact = false;
            break;
    }

    // Crear overlay de bloqueo
    const overlay = document.createElement('div');
    overlay.id = 'licenseBlockOverlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.82); z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        font-family: inherit;
    `;

    overlay.innerHTML = `
        <div style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; max-width: 440px; width: 90%; text-align: center; box-shadow: var(--shadow);">
            <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text-primary);">${title}</h2>
            <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">${message}</p>
            ${showContact ? `
                <button onclick="if(typeof window.openContactModal==='function'){document.getElementById('licenseBlockOverlay').remove();window.openContactModal('${_contactMotivo}');}else{window.location.href='mailto:soporte@transcriptorpro.com?subject=Problema+de+licencia';}" 
                    style="background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: white; border: none; padding: 0.75rem 2rem; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                    Contactar soporte
                </button>
            ` : `
                <button onclick="window.location.reload();"
                    style="background: var(--primary); color: white; border: none; padding: 0.75rem 2rem; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                    Reintentar
                </button>
            `}
        </div>
    `;

    document.body.appendChild(overlay);
}

function _lmShowTrialWarning(daysRemaining) {
    const msg = daysRemaining === 1
        ? '⏰ Su período de prueba vence mañana'
        : `⏰ Le quedan ${daysRemaining} días de prueba`;

    if (typeof showToast === 'function') {
        showToast(msg, 'warning');
    }
}

function _lmMaybeShowPaymentReminder(result) {
    try {
        const daysRemaining = Number(result && result.days_remaining);
        if (!Number.isFinite(daysRemaining) || daysRemaining > 1) return;

        const plan = String((result && result.Plan) || (result && result.plan) || '').toLowerCase();
        if (plan === 'trial') return;

        const now = Date.now();
        const last = Number(localStorage.getItem(_LM_PAYMENT_REMINDER_KEY) || 0);
        // Limitar a 1 aviso cada 18h para que no sea intrusivo.
        if (last && (now - last) < (18 * 60 * 60 * 1000)) return;

        if (typeof showToast === 'function') {
            showToast('⏰ Recordatorio: tu vencimiento de pago es dentro de 24 horas. Revisalo en Configuración → Gestión de pagos.', 'info', 6500);
        }
        localStorage.setItem(_LM_PAYMENT_REMINDER_KEY, String(now));
    } catch (_) {}
}

/* ── Métricas de Uso ──────────────────────────────────────────────────────── */

/**
 * Registra una transcripción/estructurado en la cola de métricas pendientes.
 * Compatible con apiUsageTracker (RB-6) — agrega el envío al backend.
 * @param {'transcription'|'structuring'} type
 * @param {Object} [meta] - Metadata adicional { palabras, minutos }
 */
window.trackUsageMetric = function (type, meta) {
    // ADMIN → solo el tracker local (no enviar al backend)
    if (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN') {
        if (type === 'transcription' && window.apiUsageTracker) window.apiUsageTracker.trackTranscription();
        if (type === 'structuring'  && window.apiUsageTracker) window.apiUsageTracker.trackStructuring();
        return;
    }

    // También actualizar el tracker local
    if (type === 'transcription' && window.apiUsageTracker) window.apiUsageTracker.trackTranscription();
    if (type === 'structuring'  && window.apiUsageTracker) window.apiUsageTracker.trackStructuring();

    // Agregar a cola de pendientes para envío al backend
    try {
        if (_lmMetricsCache === null) {
            _lmMetricsCache = JSON.parse(localStorage.getItem(_LM_METRICS_KEY) || '[]');
        }
        _lmMetricsCache.push({
            type: type,
            palabras: (meta && meta.palabras) || 0,
            minutos:  (meta && meta.minutos) || 0,
            timestamp: new Date().toISOString()
        });
        // Limitar cola a 500 entradas
        if (_lmMetricsCache.length > 500) _lmMetricsCache.splice(0, _lmMetricsCache.length - 500);
        if (typeof appDB !== 'undefined') appDB.set(_LM_METRICS_KEY, _lmMetricsCache);
        else localStorage.setItem(_LM_METRICS_KEY, JSON.stringify(_lmMetricsCache));
    } catch (e) {
        console.warn('[licenseManager] Error guardando métrica:', e);
    }
};

/** Envía métricas pendientes al backend */
async function _lmFlushMetrics() {
    const medicoId = _lmGetMedicoId();
    const deviceId = _lmGetDeviceId();
    if (!medicoId) return;

    let pending;
    try {
        pending = _lmMetricsCache !== null
            ? _lmMetricsCache
            : JSON.parse(localStorage.getItem(_LM_METRICS_KEY) || '[]');
    } catch (e) {
        return;
    }

    if (pending.length === 0) return;

    // Agrupar métricas
    const totalPalabras = pending.reduce((s, m) => s + (m.palabras || 0), 0);
    const totalMinutos  = pending.reduce((s, m) => s + (m.minutos || 0), 0);
    const count         = pending.filter(m => m.type === 'transcription').length;

    try {
        const response = await fetch(_LM_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'update_usage',
                id: medicoId,
                deviceId: deviceId,
                palabras: totalPalabras,
                minutos: totalMinutos
            })
        });

        if (response.ok) {
            // Limpiar cola después de envío exitoso
            _lmMetricsCache = [];
            if (typeof appDB !== 'undefined') appDB.remove(_LM_METRICS_KEY);
            else localStorage.removeItem(_LM_METRICS_KEY);
            console.info(`[licenseManager] Métricas enviadas: ${count} transcripciones, ${totalPalabras} palabras`);
        }
    } catch (err) {
        console.warn('[licenseManager] Error enviando métricas (se reintentará):', err);
    }
}

/** Inicia el timer de envío periódico de métricas */
function _lmStartMetricsSync() {
    if (_lmMetricsTimer) return;

    // Enviar métricas pendientes al iniciar
    setTimeout(() => _lmFlushMetrics(), 5000);

    // Timer periódico
    _lmMetricsTimer = setInterval(() => _lmFlushMetrics(), _LM_METRICS_INTERVAL);

    // Enviar al cerrar/unload la página
    window.addEventListener('beforeunload', () => {
        // Intentar enviar con sendBeacon
        const medicoId = _lmGetMedicoId();
        const deviceId = _lmGetDeviceId();
        let pending;
        try { pending = _lmMetricsCache !== null ? _lmMetricsCache : JSON.parse(localStorage.getItem(_LM_METRICS_KEY) || '[]'); } catch (e) { return; }
        if (pending.length === 0 || !medicoId) return;

        const totalPalabras = pending.reduce((s, m) => s + (m.palabras || 0), 0);
        const totalMinutos  = pending.reduce((s, m) => s + (m.minutos || 0), 0);

        navigator.sendBeacon(_LM_SCRIPT_URL, JSON.stringify({
            action: 'update_usage',
            id: medicoId,
            deviceId: deviceId,
            palabras: totalPalabras,
            minutos: totalMinutos
        }));
    });
}

/* ── Protección anti-tamper ────────────────────────────────────────────────── */

/**
 * Guarda el tipo original de CLIENT_CONFIG al inicio para detectar cambios.
 * Si alguien cambia type a 'ADMIN' en runtime → re-bloquear.
 */
const _lmOriginalType = (function () {
    try {
        return (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type) ? CLIENT_CONFIG.type : 'UNKNOWN';
    } catch (e) { return 'UNKNOWN'; }
})();

/**
 * Comprobación periódica de integridad:
 * 1. Si type cambió de no-ADMIN a ADMIN → rebloquear
 * 2. Si overlay de bloqueo fue removido sin validación → re-mostrar
 * 3. Si _lmValidated cambió a true sin pasar por el flujo → recalibrar
 */
function _lmTamperGuard() {
    // Solo aplica a usuarios no-ADMIN
    if (_lmOriginalType === 'ADMIN') return;

    setInterval(function () {
        // 1. Detectar cambio de tipo a ADMIN
        try {
            if (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN' && _lmOriginalType !== 'ADMIN') {
                console.error('[licenseManager] Intento de escalación detectado');
                CLIENT_CONFIG.type = _lmOriginalType;
                _lmValidated = false;
                _lmShowBlockedUI({ error: 'Sesión no autorizada', code: 'TAMPER' });
            }
        } catch (e) { /* noop */ }

        // 2. Si no está validado y el overlay fue removido → re-mostrarlo
        if (!_lmValidated && _lmLicenseData && _lmLicenseData.error) {
            const overlay = document.getElementById('licenseBlockOverlay');
            if (!overlay) {
                _lmShowBlockedUI(_lmLicenseData);
            }
        }
    }, 8000 + Math.random() * 4000); // Intervalo variable para dificultar predicción
}

/** Proteger funciones críticas contra sobre-escritura */
function _lmSealFunctions() {
    try {
        Object.defineProperty(window, 'isLicenseValid', {
            configurable: false,
            writable: false
        });
        Object.defineProperty(window, 'validateLicense', {
            configurable: false,
            writable: false
        });
    } catch (e) { /* entorno sin soporte → no bloquear */ }
}

/* ── Inicialización ───────────────────────────────────────────────────────── */

/**
 * Inicializa el License Manager.
 * Llamar después de que config.js esté cargado.
 */
window.initLicenseManager = function () {
    // ADMIN → no hacer nada
    if (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN') {
        console.info('[licenseManager] Modo ADMIN — license manager desactivado');
        return;
    }

    // Sellar funciones críticas
    _lmSealFunctions();

    // Iniciar guardia anti-tamper
    _lmTamperGuard();

    // Validar licencia al cargar
    window.validateLicense().then(result => {
        if (result.validated || !result.error) {
            console.info('[licenseManager] Licencia validada correctamente');
        } else {
            console.warn('[licenseManager] Problema de licencia:', result.error);
        }
    }).catch(err => {
        console.error('[licenseManager] Error fatal en validación:', err);
    });
};
