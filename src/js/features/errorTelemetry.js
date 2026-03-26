/**
 * errorTelemetry.js — Telemetría mínima de errores críticos del cliente
 *
 * Captura errores JS no manejados (onerror + unhandledrejection),
 * los batchea en memoria y los envía periódicamente al backend GAS.
 * Diseñado para NO interferir con la UX ni generar tráfico excesivo.
 *
 * API pública:
 *   window.initErrorTelemetry()              → activa la captura
 *   window.getErrorTelemetryBuffer()          → devuelve buffer actual (debug)
 *   window.flushErrorTelemetry()              → fuerza envío inmediato
 */

(function () {
    'use strict';

    const _BACKEND_URL = (typeof DEFAULT_BACKEND_URL !== 'undefined')
        ? DEFAULT_BACKEND_URL
        : 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';

    // ── Configuración ────────────────────────────────────────────────────
    const MAX_BUFFER      = 20;   // máximo errores en buffer antes de auto-flush
    const FLUSH_INTERVAL  = 60000; // flush cada 60s si hay errores
    const MAX_PER_SESSION = 50;   // límite absoluto por sesión (evitar flood)
    const DEDUP_WINDOW_MS = 5000; // ignorar errores idénticos dentro de 5s

    // ── Estado interno ───────────────────────────────────────────────────
    let _buffer          = [];
    let _sessionCount    = 0;
    let _flushTimer      = null;
    let _lastErrorKey    = '';
    let _lastErrorTime   = 0;
    let _initialized     = false;

    // ── Helpers ──────────────────────────────────────────────────────────
    function _getDeviceId() {
        try {
            if (typeof appDB !== 'undefined' && appDB._cache && appDB._cache.device_id) {
                return appDB._cache.device_id;
            }
        } catch (_) { /* ignore */ }
        return localStorage.getItem('device_id') || 'unknown';
    }

    function _getUserId() {
        try {
            if (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.id) {
                return CLIENT_CONFIG.id;
            }
        } catch (_) { /* ignore */ }
        return localStorage.getItem('medico_id') || 'anonymous';
    }

    function _getAppVersion() {
        try {
            if (typeof APP_VERSION !== 'undefined') return APP_VERSION;
        } catch (_) { /* ignore */ }
        return 'unknown';
    }

    function _makeErrorKey(msg, source) {
        return (msg || '') + '|' + (source || '');
    }

    function _isDuplicate(msg, source) {
        const key = _makeErrorKey(msg, source);
        const now = Date.now();
        if (key === _lastErrorKey && (now - _lastErrorTime) < DEDUP_WINDOW_MS) {
            return true;
        }
        _lastErrorKey = key;
        _lastErrorTime = now;
        return false;
    }

    function _truncate(str, max) {
        if (!str) return '';
        str = String(str);
        return str.length > max ? str.substring(0, max) + '…' : str;
    }

    // ── Captura ──────────────────────────────────────────────────────────
    function _captureError(entry) {
        if (_sessionCount >= MAX_PER_SESSION) return;
        if (_isDuplicate(entry.message, entry.source)) return;

        _sessionCount++;
        _buffer.push({
            ts:      new Date().toISOString(),
            type:    entry.type || 'error',
            message: _truncate(entry.message, 500),
            source:  _truncate(entry.source, 200),
            line:    entry.line || 0,
            col:     entry.col || 0,
            stack:   _truncate(entry.stack, 800),
            url:     _truncate(location.href, 200),
            version: _getAppVersion()
        });

        if (_buffer.length >= MAX_BUFFER) {
            _flush();
        }
    }

    // ── Flush al backend ─────────────────────────────────────────────────
    async function _flush() {
        if (_buffer.length === 0) return;

        const batch = _buffer.splice(0); // extraer y vaciar
        const payload = {
            action:   'log_client_errors',
            userId:   _getUserId(),
            deviceId: _getDeviceId(),
            errors:   batch
        };

        try {
            const res = await fetch(_BACKEND_URL, {
                method:  'POST',
                headers: { 'Content-Type': 'text/plain' },
                body:    JSON.stringify(payload)
            });
            if (!res.ok) {
                // Re-encolar los primeros N si falló (sin exceder buffer)
                _buffer.unshift(...batch.slice(0, 5));
            }
        } catch (_) {
            // Sin conexión: re-encolar parcialmente
            _buffer.unshift(...batch.slice(0, 5));
        }
    }

    // ── Listeners ────────────────────────────────────────────────────────
    function _onError(message, source, lineno, colno, error) {
        _captureError({
            type:    'uncaught',
            message: message,
            source:  source,
            line:    lineno,
            col:     colno,
            stack:   error && error.stack ? error.stack : ''
        });
        // No retornamos true: permitir que el error llegue a la consola
    }

    function _onUnhandledRejection(event) {
        const reason = event.reason;
        _captureError({
            type:    'unhandledrejection',
            message: reason ? (reason.message || String(reason)) : 'Unknown rejection',
            source:  '',
            line:    0,
            col:     0,
            stack:   reason && reason.stack ? reason.stack : ''
        });
    }

    // ── Init ─────────────────────────────────────────────────────────────
    function initErrorTelemetry() {
        if (_initialized) return;
        _initialized = true;

        // En entornos sin DOM (Node.js tests), solo registrar las funciones
        if (typeof window.addEventListener !== 'function') return;

        window.addEventListener('error', function (ev) {
            _onError(ev.message, ev.filename, ev.lineno, ev.colno, ev.error);
        });
        window.addEventListener('unhandledrejection', _onUnhandledRejection);

        // Flush periódico
        _flushTimer = setInterval(function () {
            if (_buffer.length > 0) _flush();
        }, FLUSH_INTERVAL);

        // Flush al cerrar la página
        window.addEventListener('beforeunload', function () {
            if (_buffer.length > 0) {
                // sendBeacon es más fiable que fetch en beforeunload
                try {
                    const payload = JSON.stringify({
                        action:   'log_client_errors',
                        userId:   _getUserId(),
                        deviceId: _getDeviceId(),
                        errors:   _buffer.splice(0)
                    });
                    navigator.sendBeacon(_BACKEND_URL, payload);
                } catch (_) { /* best effort */ }
            }
        });
    }

    // ── API pública ──────────────────────────────────────────────────────
    window.initErrorTelemetry     = initErrorTelemetry;
    window.getErrorTelemetryBuffer = function () { return _buffer.slice(); };
    window.flushErrorTelemetry     = _flush;
})();
