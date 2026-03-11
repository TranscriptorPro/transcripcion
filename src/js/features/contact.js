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

    const resolveProfessionalName = (name, sex) => {
        if (typeof window.getProfessionalDisplay === 'function') {
            return window.getProfessionalDisplay(name, sex).fullName;
        }
        return String(name || 'Profesional').trim() || 'Profesional';
    };

    const defaultSupportEmail = (typeof window.getResolvedSupportContactEmail === 'function')
        ? window.getResolvedSupportContactEmail()
        : 'aldowagner78@gmail.com';

    for (const msg of pending) {
        try {
            const senderDisplay = resolveProfessionalName(msg.nombre, msg.sexo);
            const res = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_email',
                    to: msg.to || defaultSupportEmail,
                    subject: `[Contacto pendiente] ${msg.motivo}`,
                    htmlBody: `<p><b>Motivo:</b> ${(msg.motivo||"").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p><p>${(msg.detalle||"").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p><p><small>${senderDisplay.replace(/</g,"&lt;")} - Mat. ${(msg.mat||"").replace(/</g,"&lt;")} - ${msg.date}</small></p>`,
                    senderName: msg.senderName || senderDisplay,
                    replyTo: msg.replyTo || ''
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
    const btn = document.getElementById('btnContacto');
    if (!btn) return;

    // Resolver rol de forma robusta (runtime + config persistida)
    // para evitar falsos ADMIN durante hidratacion inicial.
    const resolveClientType = () => {
        if (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG && CLIENT_CONFIG.type) {
            return CLIENT_CONFIG.type;
        }
        try {
            const raw = localStorage.getItem('client_config_stored');
            if (!raw) return 'ADMIN';
            const parsed = JSON.parse(raw);
            return parsed && parsed.type ? parsed.type : 'ADMIN';
        } catch (_) {
            return 'ADMIN';
        }
    };

    const applyContactVisibility = () => {
        const isAdmin =
            (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN') ||
            resolveClientType() === 'ADMIN';
        btn.style.display = isAdmin ? 'none' : '';
        return !isAdmin;
    };

    // Evitar listeners duplicados si initContact se llama más de una vez.
    if (btn.dataset.contactInitialized === '1') {
        applyContactVisibility();
        return;
    }

    if (!applyContactVisibility()) {
        let retries = 0;
        const retryTimer = setInterval(() => {
            retries += 1;
            const visible = applyContactVisibility();
            if (visible || retries >= 10) clearInterval(retryTimer);
        }, 250);
        return;
    }

    btn.dataset.contactInitialized = '1';

    // Intentar reenviar contactos pendientes de sesiones anteriores
    // Reintento inicial a los 10s, luego cada 5 minutos si quedaron pendientes (máximo 10 reintentos)
    let _contactRetryTimer = null;
    let _contactRetryCount = 0;
    const _CONTACT_MAX_RETRIES = 10;
    function _scheduleContactRetry(delay) {
        if (_contactRetryTimer) clearTimeout(_contactRetryTimer);
        if (_contactRetryCount >= _CONTACT_MAX_RETRIES) {
            console.info('[Contact] Máximo de reintentos alcanzado (' + _CONTACT_MAX_RETRIES + ')');
            return;
        }
        _contactRetryTimer = setTimeout(async () => {
            if (typeof _retryPendingContacts === 'function') await _retryPendingContacts();
            _contactRetryCount++;
            // Si aún quedan pendientes, reintentar en 5 minutos
            let pending;
            try {
                pending = (typeof appDB !== 'undefined' ? await appDB.get('pending_contacts') : null)
                    || JSON.parse(localStorage.getItem('pending_contacts') || '[]');
            } catch(_) { pending = []; }
            if (pending && pending.length > 0 && _contactRetryCount < _CONTACT_MAX_RETRIES) {
                _scheduleContactRetry(5 * 60 * 1000);
            }
        }, delay);
    }
    _scheduleContactRetry(10000);
    // Reintentar cuando vuelve la conexión
    window.addEventListener('online', () => _scheduleContactRetry(3000));

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
    window.openContactModal = function (defaultMotivo) {
        if (btn) btn.click();
        if (defaultMotivo) {
            const motivoEl = document.getElementById('contactMotivo');
            if (motivoEl) {
                motivoEl.value = defaultMotivo;
                motivoEl.dispatchEvent(new Event('change'));
            }
        }
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

            const contactEmail = (typeof window.getResolvedSupportContactEmail === 'function')
                ? window.getResolvedSupportContactEmail()
                : ((typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.contactEmail)
                    ? CLIENT_CONFIG.contactEmail
                    : 'aldowagner78@gmail.com');
            const senderName = (typeof window.getProfessionalDisplay === 'function')
                ? window.getProfessionalDisplay(nombre, profData.sexo).fullName
                : (String(nombre || 'Profesional').trim() || 'Profesional');
            const replyTo = String(
                profData.email
                || (typeof CLIENT_CONFIG !== 'undefined' ? CLIENT_CONFIG.email : '')
                || ''
            ).trim();

            // Deshabilitar botón y mostrar estado
            if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '⏳ Enviando...'; }

            const subject = `[TranscriptorPro] ${motivo}`;
            const _esc = typeof escapeHtml === 'function' ? escapeHtml : (s => (s||"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"));
            const safeDetalle = detalle.split('\n').map(l => l.trim() === '' ? '<br>' : `<p style="margin:0 0 8px;line-height:1.5;color:#1e293b;">${_esc(l)}</p>`).join('');
            const htmlBody = `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <div style="background:#0f766e;color:white;padding:16px 20px;border-radius:10px 10px 0 0;">
                        <h2 style="margin:0;font-size:1.1rem;">Contacto desde TranscriptorPro</h2>
                    </div>
                    <div style="padding:20px;background:#ffffff;border:1px solid #e2e8f0;border-top:none;">
                        <p style="margin:0 0 4px;font-size:.85rem;color:#64748b;"><strong>Motivo:</strong> ${_esc(motivo)}</p>
                        <hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0;">
                        ${safeDetalle}
                    </div>
                    <div style="padding:12px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;font-size:.78rem;color:#64748b;">
                        <strong>${_esc(senderName)}</strong> | Mat. ${_esc(mat)}<br>
                        ID: ${_esc(medicoId)} | Plan: ${_esc(plan)} | Device: ${_esc(deviceId)}
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
                            senderName: senderName,
                            replyTo: replyTo
                        })
                    });
                    const data = await response.json();

                    if (data.success) {
                        // Registrar solicitud en hoja de soporte para que aparezca en el panel admin
                        try {
                            await fetch(backendUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'log_support_request',
                                    medicoId: medicoId,
                                    nombre: nombre,
                                    motivo: motivo,
                                    detalle: detalle,
                                    deviceId: deviceId
                                })
                            });
                        } catch(_) { /* no bloquear si falla el log */ }

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
                    // Guardar localmente para reintento automático
                    try {
                        const pending = (typeof appDB !== 'undefined' ? await appDB.get('pending_contacts') : null)
                            || JSON.parse(localStorage.getItem('pending_contacts') || '[]');
                        pending.push({ motivo, detalle, nombre, mat, date: new Date().toISOString(), senderName, replyTo, to: contactEmail });
                        if (typeof appDB !== 'undefined') await appDB.set('pending_contacts', pending);
                        else localStorage.setItem('pending_contacts', JSON.stringify(pending));
                    } catch (_) {}
                    if (form)       form.style.display       = 'none';
                    if (successMsg) successMsg.style.display = 'block';
                    if (typeof showToast === 'function') showToast('📩 Mensaje guardado. Se reintentará automáticamente desde la app.', 'info');
                    setTimeout(closeModal, 3000);
                    return;
                }
            }

            // Fallback si no hay backend configurado: guardar localmente para reintento interno
            try {
                const pending = (typeof appDB !== 'undefined' ? await appDB.get('pending_contacts') : null)
                    || JSON.parse(localStorage.getItem('pending_contacts') || '[]');
                pending.push({ motivo, detalle, nombre, mat, date: new Date().toISOString(), senderName, replyTo, to: contactEmail });
                if (typeof appDB !== 'undefined') await appDB.set('pending_contacts', pending);
                else localStorage.setItem('pending_contacts', JSON.stringify(pending));
            } catch (_) {}

            if (form)       form.style.display       = 'none';
            if (successMsg) successMsg.style.display = 'block';
            if (typeof showToast === 'function') showToast('📩 Mensaje guardado. Se enviará automáticamente cuando haya backend/conexión.', 'info');
            setTimeout(closeModal, 2500);
        });
    }
};
