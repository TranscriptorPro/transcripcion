// License Cache Utils
// Shared helpers for validating cached license payloads.
(function () {
    'use strict';

    function isExpiredByDate(data) {
        if (!data || !data.fecha_vencimiento) return false;
        const expDate = new Date(data.fecha_vencimiento);
        if (isNaN(expDate)) return false;
        return expDate < new Date();
    }

    window.LicenseCacheUtils = {
        isExpiredByDate
    };
})();
