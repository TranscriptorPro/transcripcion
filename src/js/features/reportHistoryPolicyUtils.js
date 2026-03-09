// Report History Policy Utils
// Centralizes retention policy for report history entries.
(function () {
    'use strict';

    const DEFAULT_MAX = 200;
    const MIN_MAX = 50;
    const HARD_MAX = 1000;

    function getReportHistoryMax() {
        let max = DEFAULT_MAX;

        if (typeof CLIENT_CONFIG !== 'undefined' && Number.isFinite(Number(CLIENT_CONFIG.reportHistoryMax))) {
            max = Number(CLIENT_CONFIG.reportHistoryMax);
        }

        const raw = localStorage.getItem('report_history_max');
        if (raw != null && raw !== '' && Number.isFinite(Number(raw))) {
            max = Number(raw);
        }

        if (max < MIN_MAX) max = MIN_MAX;
        if (max > HARD_MAX) max = HARD_MAX;
        return Math.floor(max);
    }

    window.ReportHistoryPolicyUtils = {
        getReportHistoryMax,
        DEFAULT_MAX
    };
})();
