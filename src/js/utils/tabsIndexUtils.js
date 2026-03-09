// Tabs Index Utils
// Guards tab index bounds to avoid out-of-range access.
(function () {
    'use strict';

    function clampIndex(index, length) {
        const len = Number.isFinite(length) ? length : 0;
        if (len <= 0) return 0;
        let idx = Number.isFinite(index) ? Math.floor(index) : 0;
        if (idx < 0) idx = 0;
        if (idx >= len) idx = len - 1;
        return idx;
    }

    function isValidIndex(index, length) {
        return Number.isFinite(index) && index >= 0 && index < length;
    }

    window.TabsIndexUtils = {
        clampIndex,
        isValidIndex
    };
})();
