// ============ UI MODAL FOCUS/A11Y UTILS ============
// RB-1: Focus trap generico para modales
window.trapFocusInModal = function (modal) {
    if (!modal) return;
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    modal._trapHandler = function (e) {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    };
    modal.addEventListener('keydown', modal._trapHandler);
    // Enfocar primer elemento focusable al abrir
    requestAnimationFrame(() => {
        const first = modal.querySelector(FOCUSABLE);
        if (first) first.focus();
    });
};

window.releaseFocusTrap = function (modal) {
    if (!modal || !modal._trapHandler) return;
    modal.removeEventListener('keydown', modal._trapHandler);
    delete modal._trapHandler;
};

// RB-1: Observer automatico para modales con clase .modal-overlay
(function initModalFocusTrapObserver() {
    window.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            // Observer para modales que usan classList.add('active')
            const observer = new MutationObserver(() => {
                if (modal.classList.contains('active')) {
                    window.trapFocusInModal(modal);
                } else {
                    window.releaseFocusTrap(modal);
                }
            });
            observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

            // Observer para modales que usan style.display
            const styleObs = new MutationObserver(() => {
                const d = modal.style.display;
                if (d === 'flex' || d === 'block') {
                    window.trapFocusInModal(modal);
                } else if (d === 'none' || d === '') {
                    window.releaseFocusTrap(modal);
                }
            });
            styleObs.observe(modal, { attributes: true, attributeFilter: ['style'] });
        });
    });
})();
