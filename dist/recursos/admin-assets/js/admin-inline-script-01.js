// v23 — Force SW update + purge ALL old caches on admin pages
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => {
                r.update();
                if (r.waiting) {
                    r.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        });
        if (window.caches) {
            caches.keys().then(keys => {
                keys.forEach(k => {
                    if (k !== 'transcriptor-pro-v23') caches.delete(k);
                });
            });
        }
    }
    