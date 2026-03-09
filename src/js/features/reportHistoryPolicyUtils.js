// Report History Policy Utils
// Centralizes retention policy for report history entries.
(function () {
    'use strict';

    const STORAGE_KEY = 'report_history_max';
    const DEFAULT_MAX = 200;
    const MIN_MAX = 50;
    const HARD_MAX = 1000;

    function _clampMax(value) {
        let max = Number(value);
        if (!Number.isFinite(max)) max = DEFAULT_MAX;
        if (max < MIN_MAX) max = MIN_MAX;
        if (max > HARD_MAX) max = HARD_MAX;
        return Math.floor(max);
    }

    function getReportHistoryMax() {
        let max = DEFAULT_MAX;

        if (typeof CLIENT_CONFIG !== 'undefined' && Number.isFinite(Number(CLIENT_CONFIG.reportHistoryMax))) {
            max = Number(CLIENT_CONFIG.reportHistoryMax);
        }

        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw != null && raw !== '' && Number.isFinite(Number(raw))) {
            max = Number(raw);
        }

        return _clampMax(max);
    }

    function setReportHistoryMax(value) {
        const max = _clampMax(value);
        localStorage.setItem(STORAGE_KEY, String(max));
        return max;
    }

    function resetReportHistoryMax() {
        localStorage.removeItem(STORAGE_KEY);
        return getReportHistoryMax();
    }

    window.ReportHistoryPolicyUtils = {
        getReportHistoryMax,
        setReportHistoryMax,
        resetReportHistoryMax,
        DEFAULT_MAX,
        MIN_MAX,
        HARD_MAX
    };
})();
