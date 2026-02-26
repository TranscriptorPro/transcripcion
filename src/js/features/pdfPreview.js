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

    // ── Color del encabezado (palette de 6 opciones) ──
    const headerColorEl = document.getElementById('pdfHeaderColor');
    if (headerColorEl) {
        const savedColor = profData.headerColor || '#1a56a0';
        headerColorEl.dataset.selectedColor = savedColor;
        headerColorEl.querySelectorAll('.hdr-swatch').forEach(s => {
            s.classList.toggle('selected', s.dataset.color === savedColor);
            s.style.borderColor = s.dataset.color === savedColor ? 'var(--text-primary, #0f172a)' : 'transparent';
        });
        const previewBar = document.getElementById('hdrColorPreviewBar');
        if (previewBar) previewBar.style.background = savedColor;
    }

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

    // ── Firma: checkbox de mostrar imagen (la imagen se define en los clones) ──
    const showSignImageChk = document.getElementById('pdfShowSignImage');
    if (showSignImageChk) showSignImageChk.checked = pdfCfgRestore.showSignImage ?? false;

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

    // Helper: normalizar + escapar
    const norm = typeof normalizeFieldText === 'function' ? normalizeFieldText : (t) => t || '';
    const escName = (t) => esc(norm(t || '', 'name'));     // Nombres: Cada Palabra Capitalizada
    const escUpper = (t) => esc((t || '').toUpperCase());   // MAYÚSCULAS: OSDE, IAPOS
    const escSentence = (t) => esc(norm(t || '', 'sentence')); // Modo oración

    // Datos del profesional (profesional activo tiene prioridad)
    const activePro      = config.activeProfessional || null;
    const profName       = escName(activePro?.nombre     || profData.nombre) || 'Profesional Médico';
    const matricula      = esc(activePro?.matricula  || profData.matricula || '');
    const especialidadRaw = activePro?.especialidades
        || (Array.isArray(profData.specialties)
            ? profData.specialties.filter(s => s && s !== 'Todas').join(' / ')
            : (profData.especialidad || ''));
    const especialidad    = escSentence(especialidadRaw);
    const institutionName = escName(activePro?.institutionName || profData.institutionName || '');
    const accentColor     = activePro?.headerColor || profData.headerColor || '#1a56a0';

    // Datos del lugar de trabajo (desde workplace_profiles)
    const wpProfiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
    const wpIdx = config.activeWorkplaceIndex;
    const activeWp = (wpIdx !== undefined && wpIdx !== null) ? wpProfiles[Number(wpIdx)] : wpProfiles[0];
    const wpName = escName(activeWp?.name || '');
    const wpEmail = esc(activeWp?.email || config.workplaceEmail || '');

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
    // Normalización: nombres→name, cobertura→UPPER, resto→sentence
    const patientName     = escName(extracted.name || config.patientName || formPatient.name || '');
    const patientDni      = esc(extracted.dni   || config.patientDni   || formPatient.dni      || '');
    const patientAge      = esc(extracted.age   || config.patientAge   || formPatient.age      || '');
    const rawSex          = extracted.sex || config.patientSex || formPatient.sex || '';
    const patientSex      = rawSex === 'M' ? 'Masculino' : rawSex === 'F' ? 'Femenino' : escName(rawSex);
    const patientInsurance = escUpper(config.patientInsurance || formPatient.insurance || '');
    const affiliateNum = esc(config.patientAffiliateNum || reqVal('reqPatientAffiliateNum') || reqVal('pdfPatientAffiliateNum') || '');

    // Datos del estudio (fallback: plantilla detectada → nombre de plantilla seleccionada)
    const tplKey = window.selectedTemplate || config.selectedTemplate || '';
    const tplName = (tplKey && window.MEDICAL_TEMPLATES?.[tplKey]?.name) || '';
    const studyType    = escSentence(config.studyType || tplName || '');
    const rawDate      = config.studyDate || '';
    const studyDate    = rawDate
        ? new Date(rawDate + 'T12:00').toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})
        : new Date().toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'});
    const studyReason  = escSentence(config.studyReason || '');
    const refDoctor    = escName(config.referringDoctor || '');
    const reportNum    = esc(document.getElementById('pdfReportNumber')?.value || config.reportNum || '');
    const footerText   = esc(config.footerText || 'Este informe es válido únicamente con la firma del profesional a cargo.');
    const wkAddr       = esc(config.workplaceAddress || activeWp?.address || '');
    const wkPhone      = esc(config.workplacePhone   || activeWp?.phone || '');
    const studyTime    = esc(document.getElementById('pdfStudyTime')?.value || config.studyTime || '');
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
    if (page) {
        page.style.setProperty('--pa', accentColor);

        // Aplicar fuente configurada (sincronizar con PDF)
        const fontMap = { helvetica: 'Helvetica, Arial, sans-serif', times: "'Times New Roman', Times, serif", courier: "'Courier New', Courier, monospace" };
        const cfgFont = (config.font || 'helvetica').toLowerCase();
        page.style.fontFamily = fontMap[cfgFont] || fontMap.helvetica;

        // Aplicar tamaño de fuente configurado
        const cfgFontSize = parseInt(config.fontSize) || 10;
        page.style.fontSize = cfgFontSize + 'pt';

        // Aplicar márgenes configurados
        const marginMap = { narrow: '10mm', normal: '18mm', wide: '28mm' };
        const cfgMargin = marginMap[config.margins] || '18mm';
        page.style.paddingLeft = cfgMargin;
        page.style.paddingRight = cfgMargin;
        page.style.paddingBottom = cfgMargin;
    }

    // ── LUGAR DE TRABAJO (arriba de todo — se repite en cada hoja impresa) ──
    const wpHeaderEl = document.getElementById('previewWorkplace');
    if (wpHeaderEl) {
        const hasWpData = wpName || wkAddr || wkPhone || wpEmail;
        if (hasWpData) {
            wpHeaderEl.style.display = '';
            let wpHtml = '<div class="pvw-block">';
            // Logo de la institución (a la izquierda del nombre)
            if (hasLogo) wpHtml += `<img class="pvw-logo" src="${logoSrc}" alt="Logo">`;
            wpHtml += '<div class="pvw-text">';
            if (wpName)  wpHtml += `<div class="pvw-name">${wpName}</div>`;
            const wpDetails = [wkAddr, wkPhone ? 'Tel: ' + wkPhone : '', wpEmail].filter(Boolean);
            if (wpDetails.length) wpHtml += `<div class="pvw-details">${wpDetails.join(' &nbsp;•&nbsp; ')}</div>`;
            wpHtml += '</div></div>';
            wpHeaderEl.innerHTML = wpHtml;
        } else {
            wpHeaderEl.innerHTML = '';
            wpHeaderEl.style.display = 'none';
        }
    }

    // ── ENCABEZADO PROFESIONAL (no se repite — solo página 1) ─────
    const headerEl = document.getElementById('previewHeader');
    if (headerEl) {
        // Ocultar encabezado si es ADMIN sin profesional activo configurado
        const isAdminWithoutProf = (!activePro || !activePro.nombre) &&
            (!profData.nombre || profData.nombre === 'Administrador' || profData.nombre === 'Admin');
        if (isAdminWithoutProf) {
            headerEl.innerHTML = '';
            headerEl.style.display = 'none';
        } else {
            headerEl.style.display = '';
            headerEl.innerHTML = `
                <div class="pvh-body">
                    <div class="pvh-info">
                        <div class="pvh-name">${profName}</div>
                        ${especialidad   ? `<div class="pvh-spec">${especialidad}</div>`   : ''}
                        ${institutionName ? `<div class="pvh-inst">${institutionName}</div>` : ''}
                        ${matricula      ? `<div class="pvh-mat">Mat. ${matricula}</div>` : ''}
                    </div>
                </div>`;
        }
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
        if (affiliateNum) cells.push(`<div class="pvp-cell"><span class="pvp-lbl">Nº Afiliado</span><span class="pvp-val">${affiliateNum}</span></div>`);
        if (cells.length) {
            patientEl.innerHTML = `<div class="pvp-grid">${cells.join('')}</div>`;
            patientEl.style.display = '';
        } else {
            // Sin datos del paciente → ocultar sección completa
            patientEl.innerHTML = '';
            patientEl.style.display = 'none';
        }
    }

    // ── DATOS DEL ESTUDIO (3 columnas, 2 filas) ─────────────────────
    const studyEl = document.getElementById('previewStudy');
    if (studyEl) {
        // Fila 1: Estudio | Informe Nº | Fecha (dd/mm/aaaa)
        // Fila 2: Solicitante | Motivo
        let row1 = '';
        row1 += `<div class="pvs-cell"><span class="pvs-lbl">Estudio</span><span class="pvs-val">${studyType || '—'}</span></div>`;
        row1 += `<div class="pvs-cell"><span class="pvs-lbl">Informe Nº</span><span class="pvs-val">${reportNum || '—'}</span></div>`;
        row1 += `<div class="pvs-cell"><span class="pvs-lbl">Fecha</span><span class="pvs-val">${studyDate}${studyTime ? ' ' + studyTime : ''}</span></div>`;
        let row2 = '';
        if (refDoctor)   row2 += `<div class="pvs-cell"><span class="pvs-lbl">Solicitante</span><span class="pvs-val">${refDoctor}</span></div>`;
        if (studyReason) row2 += `<div class="pvs-cell"><span class="pvs-lbl">Motivo</span><span class="pvs-val">${studyReason}</span></div>`;
        studyEl.innerHTML = `<div class="pvs-grid pvs-3col">${row1}</div>`
            + (row2 ? `<div class="pvs-grid pvs-2col">${row2}</div>` : '');
    }

    // ── CONTENIDO DEL INFORME ────────────────────────────────────
    const contentEl = document.getElementById('previewContent');
    if (contentEl) {
        contentEl.innerHTML = editorEl ? editorEl.innerHTML : '';
        // Eliminar elementos de UI que no deben aparecer en la vista previa
        contentEl.querySelectorAll('.patient-data-header, .patient-placeholder-banner, .btn-append-inline, .original-text-banner, .no-print, .ai-note-panel, #aiNotePanel').forEach(el => {
            el.remove();
        });
        // Eliminar campos vacíos [No especificado] completamente
        contentEl.querySelectorAll('.no-data-field').forEach(el => {
            el.remove();
        });
    }

    // ── FIRMA ────────────────────────────────────────────────────
    const sigEl = document.getElementById('previewSignature');
    const showSignImage = config.showSignImage ?? false;
    if (sigEl) {
        // Ocultar firma si es ADMIN sin profesional activo
        const isAdminSig = (!activePro || !activePro.nombre) &&
            (!profData.nombre || profData.nombre === 'Administrador' || profData.nombre === 'Admin');
        if (isAdminSig) {
            sigEl.innerHTML = '';
            sigEl.style.display = 'none';
        } else {
            sigEl.style.display = '';
            let sigHtml = '<div class="pvsig-block">';
            // Imagen de firma va ENCIMA de la línea
            if (showSignImage && hasSig) sigHtml += `<img src="${sigSrc}" class="pvsig-img" alt="Firma">`;
            if (showSignLine) sigHtml += `<div class="pvsig-line"></div>`;
            if (showSignName && profName) sigHtml += `<div class="pvsig-name">${profName}</div>`;
            if (showSignMat  && matricula) sigHtml += `<div class="pvsig-mat">Mat. ${matricula}</div>`;
            if (especialidad) sigHtml += `<div class="pvsig-spec">${especialidad}</div>`;
            sigHtml += '</div>';
            sigEl.innerHTML = sigHtml;
        }
    }

    // ── PIE DE PÁGINA ─────────────────────────────────────────────
    const footerEl = document.getElementById('previewFooter');
    if (footerEl) {
        const parts = [];
        if (footerText) parts.push(`<span>${footerText}</span>`);
        if (config.showDate) parts.push(`<span>Impreso: ${new Date().toLocaleDateString('es-ES')}</span>`);
        // Número de página real: calculado después de renderizar
        if (config.showPageNum) parts.push(`<span class="pvf-pagenum" style="margin-left:auto;">Página 1</span>`);
        footerEl.innerHTML = parts.length ? `<div class="pvf-wrap">${parts.join('')}</div>` : '';
        footerEl.style.display = parts.length ? '' : 'none';
    }

    // ── CÓDIGO QR DE VERIFICACIÓN (debajo de la firma) ─────────────
    const qrEl = document.getElementById('previewQR');
    if (qrEl) {
        const showQR = config.showQR ?? false;
        if (showQR && typeof generateQRCode === 'function') {
            // RM-5: QR con referencia interna (sin datos del paciente en texto plano)
            const qrData = reportNum
                ? `TPRO-${reportNum}`
                : `TPRO-${Date.now()}`;
            const qrImgSrc = generateQRCode(qrData || 'Transcriptor Médico Pro');
            qrEl.innerHTML = `<img src="${qrImgSrc}" alt="QR" style="width:72px;height:72px;">
                <span class="pvqr-label">Código de verificación</span>`;
            qrEl.style.display = '';
        } else {
            qrEl.innerHTML = '';
            qrEl.style.display = 'none';
        }
    }

    document.getElementById('printPreviewOverlay')?.classList.add('active');

    // Calcular número de páginas y configurar navegación
    setTimeout(() => {
        const pageEl = document.getElementById('previewPage');
        const pageNumEl = document.querySelector('.pvf-pagenum');
        const pageHeightMM = 297;
        const onePagePx = pageHeightMM * (96 / 25.4); // ~1122px
        const totalPages = Math.max(1, Math.ceil((pageEl?.scrollHeight || 0) / onePagePx));

        if (pageNumEl) {
            pageNumEl.textContent = totalPages > 1 ? `Página 1 de ${totalPages}` : 'Página 1 de 1';
        }

        // ── Indicadores visuales de salto de página ──────────────
        // Muestran dónde caería cada salto de página con un separador
        // y una mini-repetición del banner del lugar de trabajo (como hace el PDF real)
        if (pageEl && totalPages > 1) {
            // Limpiar marcadores previos
            pageEl.querySelectorAll('.pv-pagebreak-marker').forEach(m => m.remove());

            // Solo repetir el workplace banner (no el header profesional)
            const wpHeaderEl = document.getElementById('previewWorkplace');
            const wpCloneHtml = wpHeaderEl && wpHeaderEl.style.display !== 'none' ? wpHeaderEl.outerHTML : '';

            // Insertar marcadores en el contenido en las posiciones de salto
            const contentEl = document.getElementById('previewContent');
            if (contentEl) {
                // Calcular la altura disponible para contenido en la primera página
                const headerZoneH = contentEl.offsetTop; // todo lo que hay antes del contenido
                const footerEl = document.getElementById('previewFooter');
                const sigEl = document.getElementById('previewSignature');
                const footerZoneH = (footerEl?.offsetHeight || 0) + (sigEl?.offsetHeight || 0) + 40;

                const firstPageContentH = onePagePx - headerZoneH - footerZoneH;
                // Páginas siguientes: solo workplace banner se repite (~50px aprox) + footer
                const repeatedHeaderH = (wpHeaderEl?.offsetHeight || 0) + 20;
                const nextPageContentH = onePagePx - repeatedHeaderH - footerZoneH;

                let accumulatedH = 0;
                let currentPageBreakAt = firstPageContentH;
                let pageIdx = 1;
                const children = Array.from(contentEl.children);
                const insertions = []; // {beforeChild, pageNum}

                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    const childH = child.offsetHeight + parseInt(getComputedStyle(child).marginTop || 0) +
                                   parseInt(getComputedStyle(child).marginBottom || 0);

                    if (accumulatedH + childH > currentPageBreakAt && accumulatedH > 0) {
                        pageIdx++;
                        insertions.push({ beforeChild: child, pageNum: pageIdx });
                        accumulatedH = childH;
                        currentPageBreakAt = nextPageContentH;
                    } else {
                        accumulatedH += childH;
                    }
                }

                // Insertar los marcadores (en orden inverso para no desplazar índices)
                insertions.reverse().forEach(({ beforeChild, pageNum }) => {
                    const marker = document.createElement('div');
                    marker.className = 'pv-pagebreak-marker';
                    marker.innerHTML = `
                        <div class="pv-pb-separator">
                            <span class="pv-pb-label">— Fin pág. ${pageNum - 1} / Inicio pág. ${pageNum} —</span>
                        </div>
                        <div class="pv-pb-repeated-header">
                            ${wpCloneHtml}
                        </div>`;
                    contentEl.insertBefore(marker, beforeChild);
                });
            }
        }

        // Navegación multi-página
        const navEl = document.getElementById('previewPageNav');
        if (navEl && totalPages > 1) {
            navEl.style.display = 'flex';
            navEl.innerHTML = `
                <button class="btn btn-outline btn-sm" id="pvNavPrev" disabled>◀ Anterior</button>
                <span class="pvnav-info">Página <strong>1</strong> de ${totalPages}</span>
                <button class="btn btn-outline btn-sm" id="pvNavNext">Siguiente ▶</button>`;
            let currentPage = 1;
            const container = document.getElementById('printPreviewContainer');
            const update = () => {
                document.getElementById('pvNavPrev').disabled = currentPage <= 1;
                document.getElementById('pvNavNext').disabled = currentPage >= totalPages;
                navEl.querySelector('.pvnav-info').innerHTML = `Página <strong>${currentPage}</strong> de ${totalPages}`;
                if (pageNumEl) pageNumEl.textContent = `Página ${currentPage} de ${totalPages}`;
            };
            document.getElementById('pvNavPrev')?.addEventListener('click', () => {
                if (currentPage > 1) { currentPage--; container.scrollTop = (currentPage - 1) * onePagePx; update(); }
            });
            document.getElementById('pvNavNext')?.addEventListener('click', () => {
                if (currentPage < totalPages) { currentPage++; container.scrollTop = (currentPage - 1) * onePagePx; update(); }
            });
            // Sincronizar página con scroll manual
            container?.addEventListener('scroll', () => {
                const newPage = Math.min(totalPages, Math.max(1, Math.floor(container.scrollTop / onePagePx) + 1));
                if (newPage !== currentPage) { currentPage = newPage; update(); }
            });
        } else if (navEl) {
            navEl.style.display = 'none';
        }
    }, 150);
}

// ============ ENVIAR POR EMAIL DESDE VISTA PREVIA ============
window.emailFromPreview = function () {
    const config   = JSON.parse(localStorage.getItem('pdf_config') || '{}');
    const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
    const activePro = config.activeProfessional || null;
    const profName  = activePro?.nombre || profData.nombre || 'Profesional';
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
    const wpProfiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
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
            <strong>${_escHtml(profName).toUpperCase()}</strong><br>
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
    window._emailPendingData = { subject, htmlBody, studyType, studyDate, profName, patientName };
};

function _escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============ GENERACIÓN DE PDF EN BASE64 PARA EMAIL ============
window.generatePDFBase64 = async function () {
    if (typeof jspdf === 'undefined') {
        await new Promise(r => setTimeout(r, 600));
    }
    try {
        const { jsPDF } = window.jspdf;
        const profData  = JSON.parse(localStorage.getItem('prof_data') || '{}');
        const config    = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        const editorEl  = window.editor || document.getElementById('editor');
        if (!editorEl || !editorEl.innerHTML.trim()) return null;

        // Reutilizar downloadPDFWrapper internamente pero capturando el doc
        // Método más simple: generar y capturar como base64
        const pgSize = (config.pageSize || 'a4').toLowerCase();
        const orient = (config.orientation || 'portrait').toLowerCase();

        // Usar la misma función pero con output datauristring
        // Para no duplicar código, simulamos la descarga y capturamos el blob
        return new Promise((resolve) => {
            // Temporalmente sobrescribir saveToDisk para capturar el blob
            const origSave = window.saveToDisk;
            window.saveToDisk = async (blob, name) => {
                window.saveToDisk = origSave; // restaurar
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1]; // quitar data:...;base64,
                    resolve(base64);
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            };
            const fName = 'informe';
            const fecha = new Date().toLocaleDateString('es-ES');
            const fDate = new Date().toISOString().split('T')[0];
            downloadPDFWrapper(editorEl.innerHTML, fName, fecha, fDate).catch(() => {
                window.saveToDisk = origSave;
                resolve(null);
            });
        });
    } catch (e) {
        console.error('Error generando PDF base64:', e);
        return null;
    }
};

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

        // Obtener URL del backend
        const backendUrl = localStorage.getItem('backend_url') || '';
        if (!backendUrl) {
            // Fallback: mailto
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.background = '#fef3c7';
                statusEl.style.color = '#92400e';
                statusEl.innerHTML = '⚠️ Backend no configurado. Abriendo cliente de correo...';
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

            const config = JSON.parse(localStorage.getItem('pdf_config') || '{}');
            const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
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
// Inyecta el contenido A4 en un iframe oculto con estructura table para
// que el navegador repita encabezado y pie en cada página impresa.
window.printFromPreview = function () {
    const page = document.getElementById('previewPage');
    if (!page) { window.print(); return; }

    // Recopilar todas las reglas CSS del documento principal
    // FILTRAR reglas @media print que ocultan el body (son para el documento principal, no para el iframe)
    let allStyles = '';
    try {
        Array.from(document.styleSheets).forEach(ss => {
            try {
                Array.from(ss.cssRules).forEach(r => {
                    // Saltar reglas @media print que contengan #printPreviewOverlay (son del doc principal)
                    if (r.cssText && r.cssText.includes('#printPreviewOverlay')) return;
                    if (r.cssText && r.cssText.includes('body > *:not(')) return;
                    allStyles += r.cssText + '\n';
                });
            } catch (_) { /* cross-origin stylesheet, skip */ }
        });
    } catch (_) {}

    // Leer el color de acento aplicado en la página
    const accentColor = page.style.getPropertyValue('--pa') || '#1a56a0';
    const fontFamily = page.style.fontFamily || "'Times New Roman', Times, serif";
    const fontSize = page.style.fontSize || '10pt';

    // Extraer secciones del preview para armar estructura con thead/tfoot
    const wpHtml      = document.getElementById('previewWorkplace')?.outerHTML || '';
    const headerHtml  = document.getElementById('previewHeader')?.outerHTML || '';
    const patientHtml = document.getElementById('previewPatient')?.outerHTML || '';
    const studyHtml   = document.getElementById('previewStudy')?.outerHTML || '';
    // Contenido sin los marcadores de salto de página
    const contentEl   = document.getElementById('previewContent');
    let contentHtml   = '';
    if (contentEl) {
        const clone = contentEl.cloneNode(true);
        clone.querySelectorAll('.pv-pagebreak-marker').forEach(m => m.remove());
        contentHtml = clone.outerHTML;
    }
    const sigHtml     = document.getElementById('previewSignature')?.outerHTML || '';
    const qrHtml      = document.getElementById('previewQR')?.outerHTML || '';
    const footerHtml  = document.getElementById('previewFooter')?.outerHTML || '';

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
            html, body { margin: 0; padding: 0; background: white; font-family: ${fontFamily}; font-size: ${fontSize}; }

            /* Tabla de layout para repetir encabezado/pie */
            .print-table { width: 100%; border-collapse: collapse; }
            .print-table td { padding: 0; vertical-align: top; }
            .print-thead-cell { border-bottom: none; }
            .print-tfoot-cell { border-top: none; }

            /* Anular estilos de .a4-page ya que usamos la tabla */
            .a4-page {
                box-shadow: none !important;
                margin: 0 !important;
                border-radius: 0 !important;
                width: 100% !important;
                min-height: auto !important;
                padding: 0 !important;
                border-top: none !important;
            }

            .no-print, .ai-note-panel, .pv-pagebreak-marker { display: none !important; }

            @media print {
                html, body { margin: 0; padding: 0; }
                @page { margin: 12mm 15mm; }

                /* Borde superior de acento en cada página */
                .print-thead-cell {
                    border-top: 5px solid var(--pa, #1a56a0);
                    padding-top: 2mm;
                }

                /* Nunca cortar justo después de un título */
                h1, h2, h3,
                .report-h1, .report-h2, .report-h3 {
                    break-after: avoid;
                    page-break-after: avoid;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                /* Nunca dejar la firma sola en una página */
                .preview-signature, .pvsig-block {
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                /* Evitar viudas/huérfanas */
                p { orphans: 3; widows: 3; }
                .no-print, .ai-note-panel, .pv-pagebreak-marker { display: none !important; }
            }
        </style>
    </head><body>
        <table class="print-table">
            <thead><tr><td class="print-thead-cell">
                ${wpHtml}
            </td></tr></thead>
            <tfoot><tr><td class="print-tfoot-cell">
                ${footerHtml}
            </td></tr></tfoot>
            <tbody><tr><td>
                ${headerHtml}
                ${studyHtml}
                ${patientHtml}
                ${contentHtml}
                ${sigHtml}
                ${qrHtml}
            </td></tr></tbody>
        </table>
    </body></html>`);
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
    // Semáforo deshabilitado — la función existe para evitar errores en llamadas externas
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
