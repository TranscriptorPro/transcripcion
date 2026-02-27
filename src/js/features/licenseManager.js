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

/* ── Estado interno ───────────────────────────────────────────────────────── */
let _lmValidated   = false;
let _lmLicenseData = null;
let _lmMetricsTimer = null;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Obtiene o genera el device_id (mismo que diagnostic.js) */
function _lmGetDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
        id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('device_id', id);
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
        const raw = localStorage.getItem(_LM_CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp > _LM_CACHE_TTL) {
            localStorage.removeItem(_LM_CACHE_KEY);
            return null;
        }
        return cached.data;
    } catch (e) {
        return null;
    }
}

/** Guarda licencia en cache */
function _lmSetCache(data) {
    localStorage.setItem(_LM_CACHE_KEY, JSON.stringify({
        data: data,
        timestamp: Date.now()
    }));
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
    let message = result.error || 'No se pudo verificar la licencia.';
    let showContact = true;

    switch (code) {
        case 'EXPIRED':
            title = '⏰ Licencia expirada';
            message = `Su ${result.plan === 'trial' ? 'período de prueba' : 'licencia'} ha vencido. Contacte al administrador para renovar.`;
            break;
        case 'BANNED':
            title = '🚫 Cuenta suspendida';
            message = 'Su cuenta ha sido suspendida. Contacte al administrador.';
            break;
        case 'INACTIVE':
            title = '⏸️ Cuenta desactivada';
            message = 'Su cuenta está desactivada. Contacte al administrador para reactivarla.';
            break;
        case 'DEVICE_LIMIT':
            title = '📱 Límite de dispositivos';
            message = `Ha alcanzado el máximo de ${result.devices_max} dispositivo(s) permitido(s). Contacte al administrador para liberar dispositivos.`;
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
        background: rgba(0,0,0,0.85); z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        font-family: -apple-system, 'Inter', sans-serif;
    `;

    overlay.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 2.5rem; max-width: 440px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.4);">
            <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: #0f172a;">${title}</h2>
            <p style="color: #475569; line-height: 1.6; margin-bottom: 1.5rem;">${message}</p>
            ${showContact ? `
                <button onclick="if(typeof window.openContactModal==='function'){document.getElementById('licenseBlockOverlay').remove();window.openContactModal();}else{window.location.href='mailto:soporte@transcriptorpro.com?subject=Problema+de+licencia';}" 
                    style="background: linear-gradient(135deg, #0f766e, #14b8a6); color: white; border: none; padding: 0.75rem 2rem; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                    Contactar soporte
                </button>
            ` : `
                <button onclick="window.location.reload();"
                    style="background: #0f766e; color: white; border: none; padding: 0.75rem 2rem; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer;">
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
        const pending = JSON.parse(localStorage.getItem(_LM_METRICS_KEY) || '[]');
        pending.push({
            type: type,
            palabras: (meta && meta.palabras) || 0,
            minutos:  (meta && meta.minutos) || 0,
            timestamp: new Date().toISOString()
        });
        // Limitar cola a 500 entradas
        if (pending.length > 500) pending.splice(0, pending.length - 500);
        localStorage.setItem(_LM_METRICS_KEY, JSON.stringify(pending));
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
        pending = JSON.parse(localStorage.getItem(_LM_METRICS_KEY) || '[]');
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
            localStorage.removeItem(_LM_METRICS_KEY);
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
        try { pending = JSON.parse(localStorage.getItem(_LM_METRICS_KEY) || '[]'); } catch (e) { return; }
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
