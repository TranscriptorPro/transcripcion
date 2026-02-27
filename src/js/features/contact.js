/**
 * contact.js — K3
 * Botón "Contacto" con modal: motivo predefinido + descripción libre.
 * Envío directo via backend (Google Apps Script → GmailApp).
 * Solo visible para usuarios no-ADMIN.
 */

/* ── Reenviar contactos pendientes ───────────────────────────────────────── */
window._retryPendingContacts = async function () {
    let pending;
    try {
        pending = (typeof appDB !== 'undefined' ? await appDB.get('pending_contacts') : null)
            || JSON.parse(localStorage.getItem('pending_contacts') || '[]');
    } catch (_) { return; }
    if (!pending || !pending.length) return;

    const backendUrl = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.backendUrl)
        || (typeof appDB !== 'undefined' ? await appDB.get('backend_url') : null)
        || localStorage.getItem('backend_url');
    if (!backendUrl) return; // sin backend no podemos reintentar

    const still = [];
    for (const msg of pending) {
        try {
            const res = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_email',
                    to: 'soporte@transcriptorpro.com',
                    subject: `[Contacto pendiente] ${msg.motivo}`,
                    htmlBody: `<p><b>Motivo:</b> ${msg.motivo}</p><p>${msg.detalle}</p><p><small>${msg.nombre} — Mat. ${msg.mat} — ${msg.date}</small></p>`,
                    senderName: `TranscriptorPro — ${msg.nombre}`
                })
            });
            const data = await res.json();
            if (!data.success) still.push(msg);
        } catch (_) {
            still.push(msg);
        }
    }

    if (still.length === 0) {
        if (typeof appDB !== 'undefined') await appDB.remove('pending_contacts');
        else localStorage.removeItem('pending_contacts');
        if (typeof showToast === 'function') showToast('✅ Mensajes pendientes enviados', 'success');
    } else {
        if (typeof appDB !== 'undefined') await appDB.set('pending_contacts', still);
        else localStorage.setItem('pending_contacts', JSON.stringify(still));
    }
};

window.initContact = function () {
    // No mostrar para ADMIN
    const isAdmin = (typeof CLIENT_CONFIG === 'undefined' || CLIENT_CONFIG.type === 'ADMIN');
    const btn = document.getElementById('btnContacto');
    if (!btn) return;
    if (isAdmin) { btn.style.display = 'none'; return; }
    btn.style.display = '';

    // Intentar reenviar contactos pendientes de sesiones anteriores
    setTimeout(() => { if (typeof _retryPendingContacts === 'function') _retryPendingContacts(); }, 10000);

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
        const sb = document.getElementById('btnSendContact');
        if (sb) sb.disabled = !motivo || !detalle;
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
        if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '📨 Enviar'; }
        // Resetear campos
        const motivo  = document.getElementById('contactMotivo');
        const detalle = document.getElementById('contactDetalle');
        if (motivo)  motivo.value  = '';
        if (detalle) detalle.value = '';
        setTimeout(() => detalle?.focus(), 50);
    });

    // Abrir desde código externo (ej: licenseManager, settingsPanel)
    window.openContactModal = function () {
        if (btn) btn.click();
    };

    // Cerrar
    function closeModal() { overlay.classList.remove('active'); }
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Enviar directo via backend
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const motivo  = document.getElementById('contactMotivo')?.value  || 'Sin motivo';
            const detalle = document.getElementById('contactDetalle')?.value?.trim() || '';
            const profData = (typeof appDB !== 'undefined' ? await appDB.get('prof_data') : null)
                || JSON.parse(localStorage.getItem('prof_data') || '{}');
            const nombre   = profData.nombre   || 'Médico';
            const mat      = profData.matricula || '';
            const deviceId = (typeof appDB !== 'undefined' ? await appDB.get('device_id') : null)
                || localStorage.getItem('device_id') || '—';
            const medicoId = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.medicoId) || '—';
            const plan     = (typeof CLIENT_CONFIG !== 'undefined' && (CLIENT_CONFIG.plan || CLIENT_CONFIG.type)) || '—';

            const contactEmail = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.contactEmail)
                ? CLIENT_CONFIG.contactEmail
                : 'soporte@transcriptorpro.app';

            // Deshabilitar botón y mostrar estado
            if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '⏳ Enviando...'; }

            const subject = `[TranscriptorPro] ${motivo}`;
            const htmlBody = `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <div style="background:#0f766e;color:white;padding:16px 20px;border-radius:10px 10px 0 0;">
                        <h2 style="margin:0;font-size:1.1rem;">📧 Contacto desde TranscriptorPro</h2>
                    </div>
                    <div style="padding:20px;background:#ffffff;border:1px solid #e2e8f0;border-top:none;">
                        <p style="margin:0 0 4px;font-size:.85rem;color:#64748b;"><strong>Motivo:</strong> ${motivo}</p>
                        <hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0;">
                        ${detalle.split('\n').map(l => l.trim() === '' ? '<br>' : `<p style="margin:0 0 8px;line-height:1.5;color:#1e293b;">${l}</p>`).join('')}
                    </div>
                    <div style="padding:12px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;font-size:.78rem;color:#64748b;">
                        <strong>Dr./Dra. ${nombre}</strong> | Mat. ${mat}<br>
                        ID: ${medicoId} | Plan: ${plan} | Device: ${deviceId}
                    </div>
                </div>`;

            // Intentar envío via backend
            const backendUrl = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.backendUrl)
                || (typeof appDB !== 'undefined' ? await appDB.get('backend_url') : null)
                || localStorage.getItem('backend_url');

            if (backendUrl) {
                try {
                    const response = await fetch(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'send_email',
                            to: contactEmail,
                            subject: subject,
                            htmlBody: htmlBody,
                            senderName: `TranscriptorPro — ${nombre}`
                        })
                    });
                    const data = await response.json();

                    if (data.success) {
                        if (form)       form.style.display       = 'none';
                        if (successMsg) successMsg.style.display = 'block';
                        if (typeof showToast === 'function') showToast('✅ Mensaje enviado correctamente', 'success');
                        setTimeout(closeModal, 2500);
                        return;
                    } else {
                        throw new Error(data.error || 'Error desconocido');
                    }
                } catch (err) {
                    console.error('[Contact] Error enviando via backend:', err);
                    // Fallback: mostrar error y permitir reintentar
                    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '📨 Reintentar'; }
                    if (typeof showToast === 'function') showToast('⚠️ No se pudo enviar. Intentá de nuevo.', 'error');
                    return;
                }
            }

            // Fallback si no hay backend configurado: enviar sin abrir pestaña
            // (guardar localmente y avisar)
            try {
                const pending = (typeof appDB !== 'undefined' ? await appDB.get('pending_contacts') : null)
                    || JSON.parse(localStorage.getItem('pending_contacts') || '[]');
                pending.push({ motivo, detalle, nombre, mat, date: new Date().toISOString() });
                if (typeof appDB !== 'undefined') await appDB.set('pending_contacts', pending);
                else localStorage.setItem('pending_contacts', JSON.stringify(pending));
            } catch (_) {}

            if (form)       form.style.display       = 'none';
            if (successMsg) successMsg.style.display = 'block';
            if (typeof showToast === 'function') showToast('📩 Mensaje guardado. Se enviará cuando haya conexión.', 'info');
            setTimeout(closeModal, 2500);
        });
    }
};
