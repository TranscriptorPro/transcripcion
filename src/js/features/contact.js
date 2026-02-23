/**
 * contact.js — K3
 * Botón "Contacto" con modal: motivo predefinido + descripción libre.
 * Envío via mailto: (funciona sin backend).
 * Solo visible para usuarios no-ADMIN.
 */

window.initContact = function () {
    // No mostrar para ADMIN
    const isAdmin = (typeof CLIENT_CONFIG === 'undefined' || CLIENT_CONFIG.type === 'ADMIN');
    const btn = document.getElementById('btnContacto');
    if (!btn) return;
    if (isAdmin) { btn.style.display = 'none'; return; }
    btn.style.display = '';

    // El overlay es el contenedor completo (tiene clase .modal-overlay)
    const overlay  = document.getElementById('contactModalOverlay');
    const closeBtn = document.getElementById('btnCloseContactModal');
    const form     = document.getElementById('contactForm');
    const sendBtn  = document.getElementById('btnSendContact');
    const successMsg = document.getElementById('contactSuccess');

    if (!overlay) return;

    // Habilitar el botón de enviar solo cuando hay motivo + descripción
    function validateForm() {
        const motivo  = document.getElementById('contactMotivo')?.value;
        const detalle = document.getElementById('contactDetalle')?.value?.trim();
        if (sendBtn) sendBtn.disabled = !motivo || !detalle;
    }

    document.getElementById('contactMotivo')
        ?.addEventListener('change', validateForm);
    document.getElementById('contactDetalle')
        ?.addEventListener('input',  validateForm);

    // Abrir modal
    btn.addEventListener('click', () => {
        overlay.classList.add('active');
        if (successMsg) successMsg.style.display = 'none';
        if (form) form.style.display = 'flex';
        if (sendBtn) sendBtn.disabled = true;
        // Resetear campos
        const motivo  = document.getElementById('contactMotivo');
        const detalle = document.getElementById('contactDetalle');
        if (motivo)  motivo.value  = '';
        if (detalle) detalle.value = '';
        setTimeout(() => detalle?.focus(), 50);
    });

    // Cerrar
    function closeModal() { overlay.classList.remove('active'); }
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Enviar
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const motivo  = document.getElementById('contactMotivo')?.value  || 'Sin motivo';
            const detalle = document.getElementById('contactDetalle')?.value?.trim() || '';
            const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
            const nombre   = profData.nombre   || 'Médico';
            const mat      = profData.matricula || '';

            const contactEmail = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.contactEmail)
                ? CLIENT_CONFIG.contactEmail
                : 'soporte@transcriptorpro.app';

            const subject = encodeURIComponent(`[TranscriptorPro] ${motivo}`);
            const body    = encodeURIComponent(
                `Motivo: ${motivo}\n\n${detalle}\n\n---\nDr./Dra. ${nombre} | Mat. ${mat}\nApp: TranscriptorPro`
            );

            window.open(`mailto:${contactEmail}?subject=${subject}&body=${body}`, '_blank');

            // Mostrar confirmacion
            if (form)        form.style.display       = 'none';
            if (successMsg)  successMsg.style.display = 'block';
            setTimeout(closeModal, 2500);
        });
    }
};
