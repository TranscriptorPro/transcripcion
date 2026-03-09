// ============ UI RB-2: DETECCION MULTI-PESTANA (BroadcastChannel) ============
(function initMultiTabDetection() {
    if (typeof BroadcastChannel === 'undefined') return; // navegador no soporta
    const channel = new BroadcastChannel('transcriptor-pro');
    let otherTabDetected = false;

    channel.postMessage({ type: 'ping', ts: Date.now() });

    channel.addEventListener('message', (e) => {
        if (e.data?.type === 'ping') {
            channel.postMessage({ type: 'pong', ts: Date.now() });
        }
        if ((e.data?.type === 'ping' || e.data?.type === 'pong') && !otherTabDetected) {
            otherTabDetected = true;
            if (typeof showToast === 'function') {
                showToast('⚠️ Otra pestaña de Transcriptor está abierta. Esto puede causar conflictos con el guardado.', 'warning', 6000);
            }
        }
    });

    window.addEventListener('beforeunload', () => { channel.close(); });
})();
