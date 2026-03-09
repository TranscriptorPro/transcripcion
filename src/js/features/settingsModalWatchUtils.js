// Settings Modal Watch Utils
// Reusable helper to detect when a modal overlay loses the "active" class.
(function () {
    'use strict';

    function watchForClose(element, callback) {
        if (!element || typeof callback !== 'function') return;
        const obs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.attributeName === 'class' && !element.classList.contains('active')) {
                    obs.disconnect();
                    callback();
                    break;
                }
            }
        });
        obs.observe(element, { attributes: true, attributeFilter: ['class'] });
    }

    window.SettingsModalWatchUtils = {
        watchForClose
    };
})();
