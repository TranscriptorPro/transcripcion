// ============ PDF PREVIEW ACTIONS (EMAIL / PRINT / WORKPLACE) ============

async function _queuePendingEmail(payload) {
    try {
        const pending = (typeof appDB !== 'undefined' ? await appDB.get('pending_outbound_emails') : null)
            || JSON.parse(localStorage.getItem('pending_outbound_emails') || '[]');
        pending.push({ ...payload, queuedAt: new Date().toISOString() });
        if (typeof appDB !== 'undefined') await appDB.set('pending_outbound_emails', pending);
        else localStorage.setItem('pending_outbound_emails', JSON.stringify(pending));
    } catch (_) {
        // No bloquear la UX si falla la persistencia local.
    }
}

async function _retryPendingOutboundEmails() {
    if (window._pendingOutboundRetryRunning) return;
    window._pendingOutboundRetryRunning = true;
    try {
        let pending = (typeof appDB !== 'undefined' ? await appDB.get('pending_outbound_emails') : null)
            || JSON.parse(localStorage.getItem('pending_outbound_emails') || '[]');
        if (!Array.isArray(pending) || pending.length === 0) return;

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
        if (!/^https?:\/\//i.test(backendUrl)) return;

        const remaining = [];
        for (const msg of pending) {
            try {
                const sendUrl = backendUrl + (backendUrl.includes('?') ? '&' : '?') + 'action=send_email';
                let pdfBase64 = null;
                if (typeof window.generatePDFBase64 === 'function') {
                    pdfBase64 = await window.generatePDFBase64();
                }

                const response = await fetch(sendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'send_email',
                        to: msg.to,
                        subject: msg.subject,
                        htmlBody: msg.htmlBody,
                        pdfBase64: pdfBase64,
                        fileName: `Informe_${new Date().toISOString().split('T')[0]}.pdf`,
                        senderName: msg.senderName || msg.profName || 'Profesional',
                        replyTo: msg.replyTo || ''
                    })
                });

                const raw = await response.text();
                let parsed = null;
                try { parsed = raw ? JSON.parse(raw) : null; } catch (_) { parsed = null; }
                const ok = !!(
                    (parsed && (parsed.success === true || parsed.ok === true || String(parsed.status || '').toLowerCase() === 'ok'))
                    || (response.ok && /email enviado|success|"success"\s*:\s*true/i.test(String(raw || '')))
                );
                if (!ok) throw new Error('SEND_FAILED');
            } catch (_) {
                remaining.push(msg);
            }
        }

        if (typeof appDB !== 'undefined') await appDB.set('pending_outbound_emails', remaining);
        localStorage.setItem('pending_outbound_emails', JSON.stringify(remaining));
        if (remaining.length === 0 && typeof showToast === 'function') {
            showToast('✅ Correos pendientes reenviados', 'success');
        }
    } catch (_) {
        // No bloquear UI por fallas de reintento.
    } finally {
        window._pendingOutboundRetryRunning = false;
    }
}

// ============ ENVIAR POR EMAIL DESDE VISTA PREVIA ============
window.emailFromPreview = async function () {
    const resolvedCtx = (typeof window.resolveReportContext === 'function')
        ? await window.resolveReportContext({ includeEditorExtract: true, includeFormFallback: true })
        : null;
    const config   = (await _pdfPreviewSafeGet('pdf_config', {})) || {};
    const profData = (await _pdfPreviewSafeGet('prof_data', {})) || {};
    const activePro = config.activeProfessional || null;
    const rawProfName = activePro?.nombre || profData.nombre || 'Profesional';
    const profDisplay = (typeof window.getProfessionalDisplay === 'function')
        ? window.getProfessionalDisplay(rawProfName, activePro?.sexo || profData.sexo || '').fullName
        : (String(rawProfName || '').trim() || 'Profesional');
    const patientName = (resolvedCtx && resolvedCtx.patientName) || config.patientName || '';
    const studyType   = (resolvedCtx && resolvedCtx.studyType)   || config.studyType   || 'Informe médico';
    const reportNum   = (resolvedCtx && resolvedCtx.reportNum)   || config.reportNum   || '';
    const studyDate   = (resolvedCtx && resolvedCtx.studyDateDisplay)
        || (config.studyDate
            ? new Date(config.studyDate + 'T12:00').toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})
            : new Date().toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'}));

    // Asunto automático
    const subject = `Informe de ${studyType}${patientName ? ' — ' + patientName : ''} — Fecha: ${studyDate}`;

    // Cuerpo HTML del email
    const wpProfiles = (await _pdfPreviewSafeGet('workplace_profiles', [])) || [];
    const wpFromResolved = resolvedCtx && resolvedCtx.activeWorkplace;
    const wpIdx = config.activeWorkplaceIndex;
    const activeWp = wpFromResolved || ((wpIdx !== undefined && wpIdx !== null) ? wpProfiles[Number(wpIdx)] : wpProfiles[0]);
    const wpName = activeWp?.name || '';
    const wpPhone = activeWp?.phone || config.workplacePhone || '';
    const senderReplyTo = String(activePro?.email || profData.email || activeWp?.email || config.workplaceEmail || '').trim();

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
        <p style="font-size:13px;color:#666;margin:0;line-height:1.5;">
            Atentamente,<br>
            <strong>${_escHtml(profDisplay)}</strong><br>
            ${_escHtml(wpName)}
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
        if (typeof showToast === 'function') {
            showToast('No se pudo abrir el modal de envio. Reintenta desde la vista previa.', 'error');
        }
        return;
    }

    if (recipientEl) recipientEl.value = '';
    if (subjectEl)   subjectEl.value = subject;
    if (bodyPreview) bodyPreview.innerHTML = htmlBody;
    if (statusEl)    { statusEl.style.display = 'none'; statusEl.textContent = ''; }

    overlay.classList.add('active');

    // Guardar datos para el envío
    window._emailPendingData = {
        subject,
        htmlBody,
        studyType,
        studyDate,
        profName: profDisplay,
        patientName,
        senderName: profDisplay,
        replyTo: senderReplyTo
    };

    // Pre-generar PDF en segundo plano para acelerar el envío cuando el usuario confirma.
    window._emailPdfBase64Promise = (typeof window.generatePDFBase64 === 'function')
        ? window.generatePDFBase64().catch(() => null)
        : null;
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
async function _blobToBase64(blob) {
    return new Promise((resolve) => {
        try {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || '').split(',')[1] || null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        } catch (_) {
            resolve(null);
        }
    });
}

async function _generatePDFBase64FromHtmlSnapshot() {
    if (typeof createHTML !== 'function') {
        console.error('[email PDF] createHTML no disponible');
        return null;
    }
    if (typeof window._buildPdfBlobForEmail !== 'function') {
        console.error('[email PDF] _buildPdfBlobForEmail no disponible');
        return null;
    }
    try {
        const htmlDoc = await createHTML();
        if (!htmlDoc) {
            console.error('[email PDF] createHTML devolvió vacío');
            return null;
        }
        // Reutiliza exactamente el mismo pipeline que el botón Descargar PDF.
        const blob = await window._buildPdfBlobForEmail(htmlDoc);
        if (!blob) {
            console.error('[email PDF] _buildPdfBlobForEmail devolvió null');
            return null;
        }
        return await _blobToBase64(blob);
    } catch (err) {
        console.error('[email PDF] Error generando PDF para email:', err);
        return null;
    }
}

async function _generatePDFBase64FromPreviewDom() {
    // Mismo pipeline visual que la descarga manual para garantizar consistencia 1:1.
    if (typeof window._buildPdfBlobFromPreviewCapture !== 'function') {
        return null;
    }
    try {
        const blob = await window._buildPdfBlobFromPreviewCapture();
        if (!blob) return null;
        return await _blobToBase64(blob);
    } catch (err) {
        console.error('[email PDF] Fallback preview DOM falló:', err);
        return null;
    }
}

async function _generatePDFBase64Impl() {
    if (typeof jspdf === 'undefined') {
        await new Promise(r => setTimeout(r, 600));
    }
    try {
        const editorEl  = window.editor || document.getElementById('editor');
        if (!editorEl || !editorEl.innerHTML.trim()) return null;

        // Prioridad 1: exactamente el mismo pipeline que descargar PDF desde preview.
        const fromPreview = await _generatePDFBase64FromPreviewDom();
        if (fromPreview) return fromPreview;

        // Prioridad 2: fallback html snapshot si el pipeline visual no está disponible.
        const exactLike = await _generatePDFBase64FromHtmlSnapshot();
        if (exactLike) return exactLike;

        // Ruta 3 (último recurso): PDF simple de texto para no bloquear el envío de correo.
        if (window.jspdf?.jsPDF) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
            const plain = String(editorEl.innerText || '').trim();
            const lines = doc.splitTextToSize(plain || 'Informe médico', 180);
            doc.setFontSize(10);
            let y = 12;
            lines.forEach((line) => {
                if (y > 285) {
                    doc.addPage();
                    y = 12;
                }
                doc.text(line, 15, y);
                y += 5;
            });
            return await _blobToBase64(doc.output('blob'));
        }

        return null;
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

    if (!overlay || overlay.dataset.emailSendInitialized === '1') return;
    overlay.dataset.emailSendInitialized = '1';

    const closeModal = () => {
        overlay?.classList.remove('active');
        window._emailPendingData = null;
        window._emailPdfBase64Promise = null;
    };

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
            await _queuePendingEmail({
                to,
                subject: data.subject,
                htmlBody: data.htmlBody,
                studyType: data.studyType,
                studyDate: data.studyDate,
                profName: data.profName,
                reason: 'backend_not_configured'
            });
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.background = '#fef3c7';
                statusEl.style.color = '#92400e';
                statusEl.textContent = '⚠️ Backend de email no configurado. El envio fue guardado en cola interna (sin abrir Gmail).';
            }
            if (typeof showToast === 'function') {
                showToast('📩 Envio en cola interna. Configura backend para envio directo.', 'info');
            }
            setTimeout(closeModal, 1600);
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
            // Reutilizar pre-generación en background si existe; fallback a generación inmediata.
            let pdfBase64 = window._emailPdfBase64Promise
                ? await window._emailPdfBase64Promise
                : null;
            if (!pdfBase64) {
                pdfBase64 = await window.generatePDFBase64();
            }
            if (!pdfBase64) throw new Error('No se pudo generar el PDF');

            sendBtn.textContent = '📨 Enviando...';
            if (statusEl) statusEl.textContent = '📨 Enviando email...';

            const senderName = String(data.senderName || data.profName || 'Profesional').trim();
            const replyTo = String(data.replyTo || '').trim();

            const fileDate = new Date().toISOString().split('T')[0];
            const fileName = `Informe_${(data.studyType || 'Medico').replace(/\s+/g, '_')}_${fileDate}.pdf`;

            // Compatibilidad backend viejo/nuevo: action en query + body.
            const sendUrl = backendUrl + (backendUrl.includes('?') ? '&' : '?') + 'action=send_email';

            const response = await fetch(sendUrl, {
                method: 'POST',
                // Request simple para evitar preflight OPTIONS en Apps Script (CORS 405).
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'send_email',
                    to: to,
                    subject: data.subject,
                    htmlBody: data.htmlBody,
                    pdfBase64: pdfBase64,
                    fileName: fileName,
                    senderName: senderName,
                    replyTo: replyTo
                })
            });

            const raw = await response.text();
            let result = null;
            try {
                result = raw ? JSON.parse(raw) : null;
            } catch (_) {
                result = null;
            }

            const isSuccess = !!(
                (result && (result.success === true || result.ok === true || String(result.status || '').toLowerCase() === 'ok'))
                || (response.ok && /email enviado|success|"success"\s*:\s*true/i.test(String(raw || '')))
            );

            if (isSuccess) {
                if (statusEl) {
                    statusEl.style.background = '#d1fae5';
                    statusEl.style.color = '#065f46';
                    statusEl.textContent = '✅ Email enviado correctamente a ' + to;
                }
                if (typeof showToast === 'function') showToast('✅ Email enviado correctamente', 'success');
                setTimeout(closeModal, 2500);
            } else {
                throw new Error((result && result.error) || `Error backend HTTP_${response.status}`);
            }
        } catch (err) {
            console.error('Error enviando email:', err);
            await _queuePendingEmail({
                to,
                subject: data.subject,
                htmlBody: data.htmlBody,
                studyType: data.studyType,
                studyDate: data.studyDate,
                profName: data.profName,
                reason: 'send_failed',
                error: String(err?.message || err || 'unknown')
            });
            if (statusEl) {
                statusEl.style.background = '#fef3c7';
                statusEl.style.color = '#92400e';
                statusEl.innerHTML = `⚠️ No se pudo enviar por backend. Se guardó en cola interna para reintento desde la app.<br><span style="font-size:0.75rem;">Error: ${_escHtml(err.message || 'desconocido')}</span>`;
            }
            if (typeof showToast === 'function') showToast('⚠️ Error de backend. Envio guardado en cola interna.', 'warning');
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = '📨 Enviar ahora';
        }
    });

    // Reintento suave de envios pendientes: al iniciar y al recuperar conectividad.
    setTimeout(() => { _retryPendingOutboundEmails(); }, 2000);
    window.addEventListener('online', () => { _retryPendingOutboundEmails(); });
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

// ============ PDF VIA html-to-image (no parsea CSS — usa SVG foreignObject) ============
window.downloadPDFFromCanvas = async function (fileName, fileDate) {
    if (typeof showToast === 'function') showToast('\u23F3 Generando PDF...', 'info', 10000);
    try {
        const blob = await window._buildPdfBlobFromPreviewCapture();
        if (!blob) throw new Error('No se pudo generar el PDF desde preview');

        // Descargar
        const saveHandler = (typeof window.saveToDisk === 'function') ? window.saveToDisk : async (b, name) => {
            const url = URL.createObjectURL(b);
            const a = document.createElement('a'); a.href = url; a.download = name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
        await saveHandler(blob, `${fileName}_${fileDate}.pdf`);
        if (typeof showToast === 'function') showToast('PDF descargado \u2713', 'success');

        // Guardar en historial
        if (typeof saveReportToHistory === 'function' && !window._skipReportSave) {
            try {
                const editorEl = window.editor || document.getElementById('editor');
                saveReportToHistory({ htmlContent: editorEl ? editorEl.innerHTML : '', fileName: fileName, patientName: '', patientDni: '' });
            } catch (_) { /* no bloquear */ }
        }
    } catch (err) {
        console.error('[downloadPDFFromCanvas] Error:', err);
        if (typeof showToast === 'function') showToast('Error al generar PDF: ' + (err.message || String(err)), 'error');
    }
};

window._buildPdfBlobFromPreviewCapture = async function (options) {
    const opts = options || {};
    // 1. Asegurar que la preview está renderizada
    const previewPage = document.getElementById('previewPage');
    if (!previewPage) throw new Error('Vista previa no disponible');

    const overlay = document.getElementById('printPreviewOverlay');
    const isOpen = overlay && overlay.classList.contains('active');
    let captureNode = previewPage;
    let tempCaptureHost = null;
    let restoreOverlayVisibility = '';
    let restoreOverlayPointerEvents = '';
    if (!isOpen) {
        if (opts.silentOpen && overlay) {
            restoreOverlayVisibility = overlay.style.visibility;
            restoreOverlayPointerEvents = overlay.style.pointerEvents;
            overlay.style.visibility = 'hidden';
            overlay.style.pointerEvents = 'none';
        }
        if (typeof window.openPrintPreview === 'function') {
            await window.openPrintPreview();
        }
        await new Promise(r => setTimeout(r, 700));

        if (opts.silentOpen) {
            const livePreviewPage = document.getElementById('previewPage');
            if (!livePreviewPage) throw new Error('Vista previa no disponible');
            tempCaptureHost = document.createElement('div');
            tempCaptureHost.style.cssText = 'position:fixed;left:-99999px;top:0;background:#fff;z-index:-1;pointer-events:none;';
            captureNode = livePreviewPage.cloneNode(true);
            tempCaptureHost.appendChild(captureNode);
            document.body.appendChild(tempCaptureHost);
        }
    }

    // 2. Ocultar marcadores de salto de página para captura limpia
    const markers = Array.from(captureNode.querySelectorAll('.pv-pagebreak-marker'));
    markers.forEach(m => { m._savedDisplay = m.style.display; m.style.display = 'none'; });

    let dataUrl;
    try {
        // html-to-image: captura pixel-perfect sin parsear CSS (SVG foreignObject)
        const lib = window.htmlToImage || window['html-to-image'];
        if (!lib) throw new Error('html-to-image no cargado');

        dataUrl = await lib.toJpeg(captureNode, {
            quality: 0.92,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            skipFonts: false
        });
    } finally {
        markers.forEach(m => { m.style.display = m._savedDisplay !== undefined ? m._savedDisplay : ''; });
        if (tempCaptureHost && tempCaptureHost.parentNode) tempCaptureHost.parentNode.removeChild(tempCaptureHost);
        if (!isOpen && opts.silentOpen && overlay) {
            overlay.classList.remove('active');
            overlay.style.visibility = restoreOverlayVisibility;
            overlay.style.pointerEvents = restoreOverlayPointerEvents;
        }
    }

    if (!dataUrl) throw new Error('html-to-image no produjo resultado');

    // 3. Convertir dataUrl → canvas para paginar en A4
    const img = new Image();
    await new Promise(function (res, rej) { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);

    // 4. Paginar en hojas A4
    const { jsPDF } = window.jspdf;
    const PAGE_W_MM = 210;
    const PAGE_H_MM = 297;
    const pageHeightPx = Math.round((PAGE_H_MM / PAGE_W_MM) * canvas.width);
    const totalPages = Math.ceil(canvas.height / pageHeightPx);

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    for (let i = 0; i < totalPages; i++) {
        if (i > 0) doc.addPage();
        const srcY = i * pageHeightPx;
        const srcH = Math.min(pageHeightPx, canvas.height - srcY);

        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = srcH;
        slice.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        const sliceHmm = (srcH / canvas.width) * PAGE_W_MM;
        doc.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PAGE_W_MM, sliceHmm);
    }

    return doc.output('blob');
};
