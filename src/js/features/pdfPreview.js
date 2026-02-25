// ============ PDF MODAL & PRINT PREVIEW HANDLER ============

/**
 * Genera un código QR como data URL (imagen PNG base64).
 * Usa qrcode-generator (CDN). Retorna un dataURL o '' si falla.
 * @param {string} text - Texto a codificar
 * @returns {string} data:image/gif;base64,...
 */
window.generateQRCode = function (text) {
    try {
        if (typeof qrcode !== 'function') return '';
        const qr = qrcode(0, 'M');
        qr.addData(text || 'Transcriptor Médico Pro');
        qr.make();
        return qr.createDataURL(4, 0);
    } catch (e) {
        console.warn('QR generation failed:', e);
        return '';
    }
};

window.updatePdfModalByMode = function () {
    const proElements = document.querySelectorAll('.pro-only');
    proElements.forEach(el => {
        el.style.display = window.currentMode === 'pro' ? 'block' : 'none';
    });
}

window.openPdfConfigModal = function () {
    if (typeof loadPdfConfiguration === 'function') loadPdfConfiguration();

    const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    const isAdmin = typeof isAdminUser === 'function' && isAdminUser();
    const isPro = window.currentMode === 'pro';

    // ── Datos del profesional (locked para no-admin) ──
    set('pdfProfName', profData.nombre);
    set('pdfProfMatricula', profData.matricula);
    const specs = Array.isArray(profData.specialties) ? profData.specialties.join(' / ') : (profData.especialidad || '');
    set('pdfProfEspecialidad', specs);

    if (isAdmin) {
        ['pdfProfName', 'pdfProfMatricula', 'pdfProfEspecialidad'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.readOnly = false; el.disabled = false;
                el.style.backgroundColor = '';
                el.closest('.field-group')?.classList.remove('locked');
            }
        });
    }

    // ── Color del encabezado (ahora en pestaña Formato, visible para todos) ──
    const headerColorEl = document.getElementById('pdfHeaderColor');
    if (headerColorEl) headerColorEl.value = profData.headerColor || '#1a56a0';

    // ── Lugar de trabajo: botón Agregar solo para Pro ──
    const btnAdd = document.getElementById('btnAddWorkplace');
    if (btnAdd) btnAdd.style.display = isPro ? '' : 'none';

    // ── Panel de detalles del lugar: oculto por defecto ──
    const detailsPanel = document.getElementById('workplaceDetailsPanel');
    if (detailsPanel) detailsPanel.style.display = 'none';

    // ── Poblar dropdown de Tipo de Estudio con las plantillas ──
    const studyTypeSelect = document.getElementById('pdfStudyType');
    if (studyTypeSelect && studyTypeSelect.options.length <= 1) {
        // Solo poblar una vez
        const templates = window.MEDICAL_TEMPLATES || {};
        const names = Object.values(templates).map(t => t.name).filter(Boolean).sort();
        const unique = [...new Set(names)];
        unique.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            studyTypeSelect.appendChild(opt);
        });
        // Opción "Otro" para escribir manualmente
        const otherOpt = document.createElement('option');
        otherOpt.value = '__other__';
        otherOpt.textContent = 'Otro (escribir manualmente)';
        studyTypeSelect.appendChild(otherOpt);
    }

    // ── En modo Pro: autoseleccionar tipo de estudio desde plantilla detectada ──
    if (isPro && window.selectedTemplate && window.MEDICAL_TEMPLATES?.[window.selectedTemplate]) {
        const tplName = window.MEDICAL_TEMPLATES[window.selectedTemplate].name || '';
        if (studyTypeSelect && tplName) {
            studyTypeSelect.value = tplName;
            const hint = document.getElementById('pdfStudyTypeHint');
            if (hint) { hint.textContent = '✨ Auto-detectado desde la plantilla'; hint.style.display = ''; }
        }
    }

    // ── Datos del paciente: extraer del editor ──
    const editorForExtract = window.editor || document.getElementById('editor');
    const freshExtract = (editorForExtract && typeof extractPatientDataFromText === 'function')
        ? extractPatientDataFromText(editorForExtract.innerText) : {};
    ['pdfPatientName','pdfPatientDni','pdfPatientAge','pdfPatientSex',
     'pdfPatientInsurance','pdfPatientAffiliateNum','pdfPatientPhone','pdfPatientBirthdate']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    if (freshExtract.name) set('pdfPatientName', freshExtract.name);
    if (freshExtract.dni)  set('pdfPatientDni',  freshExtract.dni);
    if (freshExtract.age)  set('pdfPatientAge',  freshExtract.age);
    if (freshExtract.sex)  set('pdfPatientSex',  freshExtract.sex);

    // Fallback desde formulario req*
    const rVal = (id) => document.getElementById(id)?.value?.trim() || '';
    const fillIfEmpty = (pdfId, reqId) => {
        const pdfEl = document.getElementById(pdfId);
        if (pdfEl && !pdfEl.value) pdfEl.value = rVal(reqId);
    };
    fillIfEmpty('pdfPatientName',        'reqPatientName');
    fillIfEmpty('pdfPatientDni',         'reqPatientDni');
    fillIfEmpty('pdfPatientAge',         'reqPatientAge');
    fillIfEmpty('pdfPatientSex',         'reqPatientSex');
    fillIfEmpty('pdfPatientInsurance',   'reqPatientInsurance');
    fillIfEmpty('pdfPatientAffiliateNum','reqPatientAffiliateNum');

    if (isPro && window.editor && window.editor.innerText.trim().length > 0) {
        if (typeof extractPatientDataFromText === 'function') {
            const extracted = extractPatientDataFromText(window.editor.innerText);
            const setIfEmpty = (id, v) => {
                if (!v) return;
                const element = document.getElementById(id);
                if (element && !element.value) element.value = v;
            };
            setIfEmpty('pdfPatientName', extracted.name);
            setIfEmpty('pdfPatientDni', extracted.dni);
            if (extracted.age) setIfEmpty('pdfPatientAge', extracted.age);
            if (extracted.sex) setIfEmpty('pdfPatientSex', extracted.sex);
        }
    }

    // ── Informe Nº, fecha y hora ──
    const reportNumEl = document.getElementById('pdfReportNumber');
    if (reportNumEl && !reportNumEl.value && typeof generateReportNumber === 'function') {
        reportNumEl.value = generateReportNumber();
    }
    const studyDateEl = document.getElementById('pdfStudyDate');
    if (studyDateEl && !studyDateEl.value) {
        studyDateEl.value = new Date().toISOString().split('T')[0];
    }
    const studyTimeEl = document.getElementById('pdfStudyTime');
    if (studyTimeEl && !studyTimeEl.value) {
        const now = new Date();
        studyTimeEl.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    updatePdfModalByMode();
    if (typeof populateWorkplaceDropdown === 'function') populateWorkplaceDropdown();
    if (typeof populatePatientDatalist === 'function') populatePatientDatalist();

    // Restaurar profesional activo
    const pdfCfgRestore = JSON.parse(localStorage.getItem('pdf_config') || '{}');
    const activeProRestore = pdfCfgRestore.activeProfessional;
    if (activeProRestore) {
        set('pdfProfName',        activeProRestore.nombre        || '');
        set('pdfProfMatricula',   activeProRestore.matricula     || '');
        set('pdfProfEspecialidad',activeProRestore.especialidades|| '');
    }
    const restoredWpIdx  = pdfCfgRestore.activeWorkplaceIndex;
    const restoredProIdx = pdfCfgRestore.activeProfessionalIndex;
    if (restoredWpIdx !== undefined && restoredWpIdx !== null) {
        const wpSel = document.getElementById('pdfWorkplace');
        if (wpSel) {
            wpSel.value = String(restoredWpIdx);
            wpSel.dispatchEvent(new Event('change'));
            if (restoredProIdx !== undefined) {
                setTimeout(() => {
                    const proSel = document.getElementById('pdfProfessional');
                    if (proSel) proSel.value = String(restoredProIdx);
                }, 60);
            }
        }
    }

    // ── Firma: upload solo admin, info para usuario ──
    const sigUploadGroup = document.getElementById('signatureUploadGroup');
    const sigInfoUser    = document.getElementById('signatureInfoUser');
    if (sigUploadGroup) sigUploadGroup.style.display = isAdmin ? '' : 'none';
    if (sigInfoUser)    sigInfoUser.style.display    = isAdmin ? 'none' : '';

    // ── Logo upload: solo visible al agregar lugar nuevo (en el panel de detalles) ──
    // No se oculta globalmente aquí porque el panel entero ya está oculto

    // ── Restaurar tipo de estudio desde config guardada ──
    if (studyTypeSelect && pdfCfgRestore.studyType) {
        // Intentar seleccionar del dropdown
        const opts = Array.from(studyTypeSelect.options).map(o => o.value);
        if (opts.includes(pdfCfgRestore.studyType)) {
            studyTypeSelect.value = pdfCfgRestore.studyType;
        }
    }

    document.getElementById('pdfModalOverlay')?.classList.add('active');
}

window.openPrintPreview = function () {
    const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
    const config   = JSON.parse(localStorage.getItem('pdf_config') || '{}');

    const esc = (t) => t != null ? String(t)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#039;') : '';

    // Datos del profesional (profesional activo tiene prioridad)
    const activePro      = config.activeProfessional || null;
    const profName       = esc(activePro?.nombre     || profData.nombre) || 'Profesional Médico';
    const matricula      = esc(activePro?.matricula  || profData.matricula || '');
    const especialidadRaw = activePro?.especialidades
        || (Array.isArray(profData.specialties)
            ? profData.specialties.filter(s => s && s !== 'Todas').join(' / ')
            : (profData.especialidad || ''));
    const especialidad    = esc(especialidadRaw);
    const institutionName = esc(profData.institutionName || '');
    const accentColor     = profData.headerColor || '#1a56a0';

    // Extraer datos del paciente SIEMPRE frescos desde el editor
    const editorEl  = window.editor || document.getElementById('editor');
    const extracted = (editorEl && typeof extractPatientDataFromText === 'function')
        ? extractPatientDataFromText(editorEl.innerText) : {};

    // Fallback 3: datos ingresados en el formulario de paciente (reqPatientName, etc.)
    const reqVal = (id) => document.getElementById(id)?.value?.trim() || '';
    const formPatient = {
        name:      reqVal('reqPatientName')      || reqVal('pdfPatientName'),
        dni:       reqVal('reqPatientDni')        || reqVal('pdfPatientDni'),
        age:       reqVal('reqPatientAge')        || reqVal('pdfPatientAge'),
        sex:       reqVal('reqPatientSex')        || reqVal('pdfPatientSex'),
        insurance: reqVal('reqPatientInsurance')  || reqVal('pdfPatientInsurance'),
    };

    // Preferir: 1) extraído del audio → 2) guardado en pdf_config → 3) formulario req* en pantalla
    const patientName     = esc(extracted.name)  || esc(config.patientName)  || esc(formPatient.name)     || '';
    const patientDni      = esc(extracted.dni)   || esc(config.patientDni)   || esc(formPatient.dni)      || '';
    const patientAge      = esc(extracted.age)   || esc(config.patientAge)   || esc(formPatient.age)      || '';
    const rawSex          = extracted.sex || config.patientSex || formPatient.sex || '';
    const patientSex      = rawSex === 'M' ? 'Masculino' : rawSex === 'F' ? 'Femenino' : esc(rawSex);
    const patientInsurance = esc(config.patientInsurance || formPatient.insurance || '');

    // Datos del estudio
    const studyType    = esc(config.studyType || '');
    const rawDate      = config.studyDate || '';
    const studyDate    = rawDate
        ? new Date(rawDate + 'T12:00').toLocaleDateString('es-ES', {day:'2-digit', month:'long', year:'numeric'})
        : new Date().toLocaleDateString('es-ES', {day:'2-digit', month:'long', year:'numeric'});
    const studyReason  = esc(config.studyReason || '');
    const refDoctor    = esc(config.referringDoctor || '');
    const reportNum    = esc(document.getElementById('pdfReportNumber')?.value || config.reportNum || '');
    const footerText   = esc(config.footerText || 'Este informe es válido únicamente con la firma del profesional a cargo.');
    const wkAddr       = esc(config.workplaceAddress || '');
    const wkPhone      = esc(config.workplacePhone   || '');
    const showSignLine = config.showSignLine ?? true;
    const showSignName = config.showSignName ?? true;
    const showSignMat  = config.showSignMatricula ?? true;
    // Logo/firma: profesional activo sobreescribe los globales
    const logoSrc = (activePro?.logo  && activePro.logo.startsWith('data:'))  ? activePro.logo  : localStorage.getItem('pdf_logo');
    const sigSrc  = (activePro?.firma && activePro.firma.startsWith('data:')) ? activePro.firma : localStorage.getItem('pdf_signature');
    const hasLogo = logoSrc && logoSrc.startsWith('data:image/');
    const hasSig  = sigSrc  && sigSrc.startsWith('data:image/');

    // Aplicar color de acento a la página
    const page = document.getElementById('previewPage');
    if (page) page.style.setProperty('--pa', accentColor);

    // ── ENCABEZADO ──────────────────────────────────────────────
    const headerEl = document.getElementById('previewHeader');
    if (headerEl) {
        headerEl.innerHTML = `
            <div class="pvh-body">
                ${hasLogo ? `<img class="pvh-logo" src="${logoSrc}" alt="Logo">` : ''}
                <div class="pvh-info">
                    <div class="pvh-name">${profName}</div>
                    ${especialidad   ? `<div class="pvh-spec">${especialidad}</div>`   : ''}
                    ${matricula      ? `<div class="pvh-mat">Matrícula Profesional: ${matricula}</div>` : ''}
                    ${institutionName? `<div class="pvh-inst">${institutionName}</div>` : ''}
                    ${(wkAddr||wkPhone) ? `<div class="pvh-addr">${wkAddr}${wkAddr&&wkPhone?' &bull; ':''}${wkPhone}</div>` : ''}
                </div>
            </div>`;
    }

    // ── DATOS DEL PACIENTE ───────────────────────────────────────
    const patientEl = document.getElementById('previewPatient');
    if (patientEl) {
        const cells = [];
        if (patientName)      cells.push(`<div class="pvp-cell"><span class="pvp-lbl">Paciente</span><span class="pvp-val pvp-bold">${patientName}</span></div>`);
        if (patientDni)       cells.push(`<div class="pvp-cell"><span class="pvp-lbl">DNI</span><span class="pvp-val">${patientDni}</span></div>`);
        if (patientAge)       cells.push(`<div class="pvp-cell"><span class="pvp-lbl">Edad</span><span class="pvp-val">${patientAge} años</span></div>`);
        if (patientSex)       cells.push(`<div class="pvp-cell"><span class="pvp-lbl">Sexo</span><span class="pvp-val">${patientSex}</span></div>`);
        if (patientInsurance) cells.push(`<div class="pvp-cell"><span class="pvp-lbl">Cobertura</span><span class="pvp-val">${patientInsurance}</span></div>`);
        patientEl.innerHTML = cells.length
            ? `<div class="pvp-grid">${cells.join('')}</div>`
            : `<div class="pvp-grid pvp-warn">⚠️ Sin datos del paciente — complete los datos en Configurar PDF</div>`;
    }

    // ── DATOS DEL ESTUDIO ────────────────────────────────────────
    const studyEl = document.getElementById('previewStudy');
    if (studyEl) {
        const items = [];
        if (studyType)   items.push(`<span><b>Estudio:</b> ${studyType}</span>`);
        items.push(`<span><b>Fecha:</b> ${studyDate}</span>`);
        if (reportNum)   items.push(`<span><b>Informe Nº:</b> ${reportNum}</span>`);
        if (refDoctor)   items.push(`<span><b>Solicitante:</b> ${refDoctor}</span>`);
        if (studyReason) items.push(`<span><b>Motivo:</b> ${studyReason}</span>`);
        studyEl.innerHTML = `<div class="pvs-row">${items.join('<span class="pvs-sep"> | </span>')}</div>`;
    }

    // ── CONTENIDO DEL INFORME ────────────────────────────────────
    const contentEl = document.getElementById('previewContent');
    if (contentEl) {
        contentEl.innerHTML = editorEl ? editorEl.innerHTML : '';
        // Limpiar campos vacíos (.no-data-field): ocultar botón lápiz, quitar estilo ámbar
        contentEl.querySelectorAll('.no-data-field').forEach(el => {
            el.querySelectorAll('.no-data-edit-btn').forEach(b => b.remove());
            el.style.cssText = 'color:#888;border:none;background:none;font-style:italic;';
        });
        // Ocultar elementos de UI que no deben aparecer en el informe
        contentEl.querySelectorAll('.no-print,.ai-note-panel,#aiNotePanel').forEach(el => {
            el.style.display = 'none';
        });
    }

    // ── FIRMA ────────────────────────────────────────────────────
    const sigEl = document.getElementById('previewSignature');
    if (sigEl) {
        let sigHtml = '<div class="pvsig-block">';
        if (hasSig)       sigHtml += `<img src="${sigSrc}" class="pvsig-img" alt="Firma">`;
        if (showSignLine) sigHtml += `<div class="pvsig-line"></div>`;
        if (showSignName && profName) sigHtml += `<div class="pvsig-name">${profName}</div>`;
        if (showSignMat  && matricula) sigHtml += `<div class="pvsig-mat">Mat. ${matricula}</div>`;
        if (especialidad) sigHtml += `<div class="pvsig-spec">${especialidad}</div>`;
        sigHtml += '</div>';
        sigEl.innerHTML = sigHtml;
    }

    // ── PIE DE PÁGINA ─────────────────────────────────────────────
    const footerEl = document.getElementById('previewFooter');
    if (footerEl) {
        const parts = [];
        if (footerText) parts.push(`<span>${footerText}</span>`);
        if (config.showDate) parts.push(`<span>Impreso: ${new Date().toLocaleDateString('es-ES')}</span>`);
        if (config.showPageNum) parts.push(`<span style="margin-left:auto;">Página 1</span>`);
        footerEl.innerHTML = parts.length ? `<div class="pvf-wrap">${parts.join('')}</div>` : '';
        footerEl.style.display = parts.length ? '' : 'none';
    }

    // ── CÓDIGO QR DE VERIFICACIÓN ─────────────────────────────────
    const qrEl = document.getElementById('previewQR');
    if (qrEl) {
        const showQR = config.showQR ?? false;
        if (showQR && typeof generateQRCode === 'function') {
            const qrData = [
                reportNum   ? `Informe: ${reportNum}`   : '',
                studyDate   ? `Fecha: ${studyDate}`      : '',
                profName    ? `Prof: ${profName}`         : '',
                patientName ? `Paciente: ${patientName}` : '',
            ].filter(Boolean).join(' | ');
            const qrImgSrc = generateQRCode(qrData || 'Transcriptor Médico Pro');
            qrEl.innerHTML = `<img src="${qrImgSrc}" alt="QR" style="width:80px;height:80px;">
                <span style="font-size:0.6rem;color:#888;display:block;text-align:center;">Verificación</span>`;
            qrEl.style.display = '';
        } else {
            qrEl.innerHTML = '';
            qrEl.style.display = 'none';
        }
    }

    document.getElementById('printPreviewOverlay')?.classList.add('active');
}

// ---- Workplace Profile logic ----
window.workplaceProfiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');

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
// Inyecta el contenido A4 en un iframe oculto y llama print() sobre él.
// Esto imprime SOLO el informe, sin ningún elemento de la UI.
window.printFromPreview = function () {
    const page = document.getElementById('previewPage');
    if (!page) { window.print(); return; }

    // Recopilar todas las reglas CSS del documento principal
    let allStyles = '';
    try {
        Array.from(document.styleSheets).forEach(ss => {
            try {
                allStyles += Array.from(ss.cssRules).map(r => r.cssText).join('\n');
            } catch (_) { /* cross-origin stylesheet, skip */ }
        });
    } catch (_) {}

    // Leer el color de acento aplicado en la página
    const accentColor = page.style.getPropertyValue('--pa') || '#1a56a0';

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:21cm;height:29.7cm;opacity:0;border:none;';
    document.body.appendChild(iframe);

    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open();
    iDoc.write(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>Imprimir Informe</title>
        <style>${allStyles}</style>
        <style>
            :root { --pa: ${accentColor}; }
            html, body { margin: 0; padding: 0; background: white; }
            .a4-page {
                box-shadow: none !important;
                margin: 0 !important;
                border-radius: 0 !important;
                width: 21cm !important;
                min-height: auto !important;
            }
            .no-print, .ai-note-panel { display: none !important; }
            @media print {
                html, body { margin: 0; padding: 0; }
                /* Intenta que todo quepa en una hoja: márgenes mínimos y fuente ligeramente más chica */
                @page { margin: 12mm; }
                .a4-page {
                    width: 100% !important;
                    padding: 0 !important;
                    border-top: 5px solid var(--pa, #1a56a0) !important;
                }
                /* Nunca cortar una página justo después de un título */
                .a4-page .report-h1,
                .a4-page .report-h2,
                .a4-page .report-h3,
                .a4-page .preview-content h1,
                .a4-page .preview-content h2,
                .a4-page .preview-content h3 {
                    break-after: avoid;
                    page-break-after: avoid;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                /* Nunca dejar la firma sola en una página */
                .preview-signature,
                .pvsig-block {
                    break-inside: avoid;
                    page-break-inside: avoid;
                    break-before: auto;
                }
                /* Evitar viudas/huérfanas */
                .a4-page .report-p,
                .a4-page .preview-content p {
                    orphans: 3;
                    widows: 3;
                }
                /* Ocultar UI */
                .no-print, .ai-note-panel { display: none !important; }
            }
        </style>
    </head><body>${page.outerHTML}</body></html>`);
    iDoc.close();

    iframe.onload = function () {
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 2000);
        }, 400);
    };
};

// ============ CONFIG COMPLETENESS TRAFFIC LIGHT ============

/**
 * Evalúa la completitud de la configuración del PDF/impresión.
 * @returns {{ level: 'red'|'yellow'|'green', missing: string[] }}
 */
window.evaluateConfigCompleteness = function () {
    const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
    const pdfConfig = JSON.parse(localStorage.getItem('pdf_config') || '{}');
    const missing = [];

    // Campos críticos (sin ellos el PDF sale muy incompleto)
    if (!profData.nombre)      missing.push('Nombre del profesional');
    if (!profData.matricula)   missing.push('Matrícula');

    // Campos importantes
    const specs = Array.isArray(profData.specialties) ? profData.specialties.join('') : (profData.especialidad || '');
    if (!specs) missing.push('Especialidad');

    // Workplace
    const workplaces = JSON.parse(localStorage.getItem('workplaces') || '[]');
    if (workplaces.length === 0 && !pdfConfig.selectedWorkplace) {
        missing.push('Lugar de trabajo');
    }

    if (missing.length === 0) return { level: 'green', missing };
    if (missing.length <= 2 && profData.nombre) return { level: 'yellow', missing };
    return { level: 'red', missing };
};

/**
 * Actualiza el indicador visual del semáforo en el botón de configuración.
 */
window.updateConfigTrafficLight = function () {
    const dot = document.getElementById('configTrafficLight');
    if (!dot) return;

    const { level } = window.evaluateConfigCompleteness();
    dot.className = 'config-traffic-light tl-' + level;
    dot.style.display = '';
    dot.title = level === 'green' ? 'Configuración completa'
              : level === 'yellow' ? 'Configuración parcial — faltan algunos datos'
              : 'Configuración incompleta — configura tus datos profesionales';
};

/**
 * Interceptor de validación antes de descargar PDF.
 * Retorna true si se puede continuar, false si debe cancelar.
 */
window.validateBeforeDownload = function (format) {
    if (format !== 'pdf') return true; // Otros formatos no necesitan config
    const { level, missing } = window.evaluateConfigCompleteness();
    if (level === 'green') return true;

    if (level === 'red') {
        if (typeof showToast === 'function') {
            showToast('⚠️ Configura tus datos profesionales antes de generar el PDF', 'warning', 5000);
        }
        // Abrir el modal de configuración automáticamente
        setTimeout(() => {
            if (typeof openPdfConfigModal === 'function') openPdfConfigModal();
        }, 300);
        return false;
    }

    // Yellow: avisar pero dejar continuar
    if (typeof showToast === 'function') {
        showToast(`ℹ️ Faltan: ${missing.join(', ')}. El PDF puede quedar incompleto.`, 'info', 4000);
    }
    return true;
};
