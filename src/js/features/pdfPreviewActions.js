// ============ PDF PREVIEW ACTIONS (EMAIL / PRINT / WORKPLACE) ============

// ============ ENVIAR POR EMAIL DESDE VISTA PREVIA ============
window.emailFromPreview = async function () {
    const config   = (await _pdfPreviewSafeGet('pdf_config', {})) || {};
    const profData = (await _pdfPreviewSafeGet('prof_data', {})) || {};
    const activePro = config.activeProfessional || null;
    const rawProfName = activePro?.nombre || profData.nombre || 'Profesional';
    const profSexo = activePro?.sexo || profData.sexo || '';
    const titleMatch = String(rawProfName).match(/^(Dra?\.?\s*)/i);
    const profTitle = profSexo === 'F' ? 'Dra.' : profSexo === 'M' ? 'Dr.' : (titleMatch && /^dra/i.test(titleMatch[1]) ? 'Dra.' : 'Dr.');
    const profBaseName = String(rawProfName).replace(/^(Dra?\.?\s*)/i, '').trim();
    const profDisplay = `${profTitle} ${profBaseName || rawProfName}`.trim();
    const patientName = config.patientName || '';
    const studyType   = config.studyType   || 'Informe médico';
    const reportNum   = config.reportNum   || '';
    const rawDate     = config.studyDate   || '';
    const studyDate   = rawDate
        ? new Date(rawDate + 'T12:00').toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})
        : new Date().toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'});

    // Asunto automático
    const subject = `Informe de ${studyType}${patientName ? ' — ' + patientName : ''} — Fecha: ${studyDate}`;

    // Cuerpo HTML del email
    const wpProfiles = (await _pdfPreviewSafeGet('workplace_profiles', [])) || [];
    const wpIdx = config.activeWorkplaceIndex;
    const activeWp = (wpIdx !== undefined && wpIdx !== null) ? wpProfiles[Number(wpIdx)] : wpProfiles[0];
    const wpName = activeWp?.name || '';
    const wpPhone = activeWp?.phone || config.workplacePhone || '';

    const htmlBody = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#1a56a0;color:white;padding:14px 20px;border-radius:8px 8px 0 0;text-align:center;">
        <h2 style="margin:0;font-size:18px;text-transform:uppercase;">${_escHtml(wpName || 'Consultorio Médico')}</h2>
    </div>
    <div style="background:#f8f9fb;padding:24px 20px;border:1px solid #e3e8ef;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 16px;">
            Estimado/a${patientName ? ' <strong>' + _escHtml(patientName) + '</strong>' : ''},
        </p>
        <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 12px;">
            Le informamos que se ha generado el resultado de su estudio de
            <strong>${_escHtml(studyType)}</strong> realizado con fecha <strong>${studyDate}</strong>.
        </p>
        <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 12px;">
            Encontrará adjunto el informe completo en formato PDF para su revisión y archivo personal.
            ${reportNum ? 'Número de informe: <strong>' + _escHtml(reportNum) + '</strong>.' : ''}
        </p>
        <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 16px;">
            Ante cualquier consulta sobre los resultados, no dude en comunicarse con nosotros${wpPhone ? ' al <strong>' + _escHtml(wpPhone) + '</strong>' : ''}.
        </p>
        <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">
        <p style="font-size:13px;color:#666;margin:0;line-height:1.5;text-transform:uppercase;">
            Atentamente,<br>
            <strong>${_escHtml(profDisplay).toUpperCase()}</strong><br>
            ${_escHtml(wpName).toUpperCase()}
        </p>
    </div>
    <p style="font-size:11px;color:#999;text-align:center;margin-top:12px;">
        Este es un mensaje automático generado por Transcriptor Médico Pro.
        La información adjunta es confidencial y de uso exclusivo del destinatario.
    </p>
</div>`;

    // Poblar modal
    const overlay = document.getElementById('emailSendOverlay');
    const recipientEl = document.getElementById('emailRecipient');
    const subjectEl   = document.getElementById('emailSubject');
    const bodyPreview = document.getElementById('emailPreviewBody');
    const statusEl    = document.getElementById('emailSendStatus');

    if (!overlay) {
        // Fallback: mailto
        const mailSubject = encodeURIComponent(subject);
        const mailBody = encodeURIComponent(`Se adjunta el informe de ${studyType} realizado con fecha ${studyDate}.\n\nAtte., ${profName.toUpperCase()}`);
        window.open(`mailto:?subject=${mailSubject}&body=${mailBody}`, '_blank');
        return;
    }

    if (recipientEl) recipientEl.value = '';
    if (subjectEl)   subjectEl.value = subject;
    if (bodyPreview) bodyPreview.innerHTML = htmlBody;
    if (statusEl)    { statusEl.style.display = 'none'; statusEl.textContent = ''; }

    overlay.classList.add('active');

    // Guardar datos para el envío
    window._emailPendingData = { subject, htmlBody, studyType, studyDate, profName: profDisplay, patientName };
};

function _escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============ GENERACIÓN DE PDF EN BASE64 PARA EMAIL ============
let _pdfBase64Queue = Promise.resolve();
window.generatePDFBase64 = function () {
    // Serializar llamadas para evitar race condition en saveToDisk
    _pdfBase64Queue = _pdfBase64Queue.then(() => _generatePDFBase64Impl()).catch(() => null);
    return _pdfBase64Queue;
};
async function _generatePDFBase64Impl() {
    if (typeof jspdf === 'undefined') {
        await new Promise(r => setTimeout(r, 600));
    }
    try {
        const editorEl  = window.editor || document.getElementById('editor');
        if (!editorEl || !editorEl.innerHTML.trim()) return null;

        return new Promise((resolve) => {
            const origSave = window.saveToDisk;
            let restored = false;
            const restore = () => { if (!restored) { restored = true; window.saveToDisk = origSave; } };

            window.saveToDisk = async (blob, name) => {
                restore();
                try {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                } catch(_) { resolve(null); }
            };

            // Timeout de seguridad: si saveToDisk nunca es llamado, resolver null
            const timeout = setTimeout(() => { restore(); resolve(null); }, 30000);

            const fName = 'informe';
            const fecha = new Date().toLocaleDateString('es-ES');
            const fDate = new Date().toISOString().split('T')[0];
            downloadPDFWrapper(editorEl.innerHTML, fName, fecha, fDate)
                .then(() => { /* saveToDisk ya fue llamado */ })
                .catch(() => { clearTimeout(timeout); restore(); resolve(null); });
        });
    } catch (e) {
        console.error('Error generando PDF base64:', e);
        return null;
    }
}

// ============ INIT EMAIL SEND MODAL ============
window.initEmailSendModal = function () {
    const overlay     = document.getElementById('emailSendOverlay');
    const closeBtn    = document.getElementById('closeEmailSendModal');
    const cancelBtn   = document.getElementById('btnCancelEmailSend');
    const sendBtn     = document.getElementById('btnSendEmailNow');
    const statusEl    = document.getElementById('emailSendStatus');

    const closeModal = () => { overlay?.classList.remove('active'); };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    sendBtn?.addEventListener('click', async () => {
        const recipientEl = document.getElementById('emailRecipient');
        const to = recipientEl?.value?.trim();
        if (!to || !to.includes('@')) {
            if (typeof showToast === 'function') showToast('Ingresá un email válido', 'error');
            recipientEl?.focus();
            return;
        }

        const data = window._emailPendingData;
        if (!data) return;

        // Obtener URL del backend (mismo criterio que contacto)
        let backendUrl = '';
        try {
            backendUrl =
                (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.backendUrl)
                || (typeof appDB !== 'undefined' ? await appDB.get('backend_url') : '')
                || localStorage.getItem('backend_url')
                || '';
        } catch (_) {
            backendUrl = localStorage.getItem('backend_url') || '';
        }
        backendUrl = String(backendUrl || '').trim();
        const hasBackend = /^https?:\/\//i.test(backendUrl);

        if (!hasBackend) {
            // Fallback: mailto
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.background = '#fef3c7';
                statusEl.style.color = '#92400e';
                statusEl.innerHTML = '⚠️ Backend de email no configurado (URL inválida o ausente). Abriendo cliente de correo...';
            }
            setTimeout(() => {
                const mailSubject = encodeURIComponent(data.subject);
                const mailBody = encodeURIComponent(`Se adjunta el informe de ${data.studyType} realizado con fecha ${data.studyDate}.\n\nDescargue el PDF desde la vista previa y adjúntelo manualmente.\n\nAtte., ${data.profName.toUpperCase()}`);
                window.open(`mailto:${to}?subject=${mailSubject}&body=${mailBody}`, '_blank');
                closeModal();
            }, 1500);
            return;
        }

        // Mostrar estado de envío
        sendBtn.disabled = true;
        sendBtn.textContent = '⏳ Generando PDF...';
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#dbeafe';
            statusEl.style.color = '#1e40af';
            statusEl.textContent = '⏳ Generando PDF para adjuntar...';
        }

        try {
            // Generar PDF en base64
            const pdfBase64 = await window.generatePDFBase64();
            if (!pdfBase64) throw new Error('No se pudo generar el PDF');

            sendBtn.textContent = '📨 Enviando...';
            if (statusEl) statusEl.textContent = '📨 Enviando email...';

            const config = (await _pdfPreviewSafeGet('pdf_config', {})) || {};
            const profData = (await _pdfPreviewSafeGet('prof_data', {})) || {};
            const activePro = config.activeProfessional || null;
            const senderName = activePro?.nombre || profData.nombre || 'Transcriptor Médico Pro';

            const fileDate = new Date().toISOString().split('T')[0];
            const fileName = `Informe_${(data.studyType || 'Medico').replace(/\s+/g, '_')}_${fileDate}.pdf`;

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_email',
                    to: to,
                    subject: data.subject,
                    htmlBody: data.htmlBody,
                    pdfBase64: pdfBase64,
                    fileName: fileName,
                    senderName: senderName
                })
            });

            const result = await response.json();

            if (result.success) {
                if (statusEl) {
                    statusEl.style.background = '#d1fae5';
                    statusEl.style.color = '#065f46';
                    statusEl.textContent = '✅ Email enviado correctamente a ' + to;
                }
                if (typeof showToast === 'function') showToast('✅ Email enviado correctamente', 'success');
                setTimeout(closeModal, 2500);
            } else {
                throw new Error(result.error || 'Error desconocido del servidor');
            }
        } catch (err) {
            console.error('Error enviando email:', err);
            if (statusEl) {
                statusEl.style.background = '#fef3c7';
                statusEl.style.color = '#92400e';
                statusEl.innerHTML = `⚠️ No se pudo enviar directamente. <a href="#" id="emailFallbackLink" style="color:#1e40af;text-decoration:underline;">Abrir cliente de correo</a><br><span style="font-size:0.75rem;">Error: ${err.message}</span>`;
                document.getElementById('emailFallbackLink')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    const mailSubject = encodeURIComponent(data.subject);
                    const mailBody = encodeURIComponent(`Se adjunta el informe de ${data.studyType} realizado con fecha ${data.studyDate}.\n\nAtte., ${data.profName.toUpperCase()}`);
                    window.open(`mailto:${to}?subject=${mailSubject}&body=${mailBody}`, '_blank');
                });
            }
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = '📨 Enviar ahora';
        }
    });
};
window.workplaceProfiles = [];
_pdfPreviewSafeGet('workplace_profiles', []).then(function(v) { window.workplaceProfiles = v || []; }).catch(function() {});

window.populateWorkplaceDropdown = function () {
    const dropdown = document.getElementById('pdfWorkplace');
    if (!dropdown) return;
    const currentVal = dropdown.value;
    dropdown.innerHTML = '<option value="">-- Seleccionar lugar --</option>';
    window.workplaceProfiles.forEach((wp, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = wp.name;
        dropdown.appendChild(opt);
    });
    if (currentVal) dropdown.value = currentVal;
}

document.addEventListener('DOMContentLoaded', () => {
    // Listener de workplace ya está en business.js — no duplicar
});

// ============ IMPRIMIR DESDE VISTA PREVIA ============
// Inyecta el contenido A4 en un iframe oculto con estructura table para
// que el navegador repita encabezado y pie en cada página impresa.
window.printFromPreview = async function () {
    const page = document.getElementById('previewPage');
    if (!page) { window.print(); return; }

    // Generar HTML standalone idéntico a la vista previa (usa createHTML del editor)
    // Esto garantiza 100% de fidelidad: lo que se ve en preview = lo que se imprime
    let htmlDoc;
    if (typeof createHTML === 'function') {
        htmlDoc = await createHTML();
    } else if (typeof window.createHTML === 'function') {
        htmlDoc = await window.createHTML();
    } else {
        // Fallback: imprimir directo
        window.print();
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;opacity:0;border:none;';
    document.body.appendChild(iframe);

    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open();
    iDoc.write(htmlDoc);
    iDoc.close();

    iframe.onload = function () {
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 3000);
        }, 500);
    };
};
