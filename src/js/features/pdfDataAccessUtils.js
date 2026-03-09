// PDF Data Access Utils
// Null-safe reads from appDB/localStorage for PDF flows.
(function () {
    'use strict';

    async function safeGet(key, fallback) {
        try {
            if (typeof appDB !== 'undefined' && appDB && typeof appDB.get === 'function') {
                const value = await appDB.get(key);
                if (value !== undefined && value !== null) return value;
            }
        } catch (_) {}

        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined || raw === '') return fallback;
            try {
                return JSON.parse(raw);
            } catch (_) {
                return raw;
            }
        } catch (_) {
            return fallback;
        }
    }

    window.PdfDataAccessUtils = {
        safeGet
    };
})();
