
/**
 * Limpia el texto del editor para extracción de datos de paciente,
 * eliminando banners de UI (.patient-data-header, etc.) que podrían
 * confundir al parser de datos del paciente.
 */
function _getCleanEditorText(el) {
    if (!el) return '';
    var clone = el.cloneNode(true);
    clone.querySelectorAll('.patient-data-header, .patient-placeholder-banner, .no-print, .ai-note-panel, .inline-review-btn, .original-text-banner, .btn-append-inline, #aiNotePanel').forEach(function(n) { n.remove(); });
    return clone.textContent || '';
}

/**
 * Genera un código QR como data URL (imagen PNG base64).
 * Usa qrcode-generator (CDN). Retorna un dataURL o '' si falla.
 * @param {string} text - Texto a codificar
 * @returns {string} data:image/gif;base64,...
 */
window.generateQRCode = function (text) {
    try {
        if (typeof qrcode !== 'function') return '';
        // Normalizar: eliminar diacríticos (tildes, acentos, etc.) para evitar
        // corrupción de caracteres en la librería qrcode-generator (solo acepta ASCII).
        // á→a, é→e, í→i, ó→o, ú→u, ñ→n, Á→A, etc.
        const normalized = String(text || 'Transcriptor Medico Pro')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')   // elimina combinadores diacríticos
            .replace(/[^\x00-\x7F]/g, '');     // elimina cualquier otro no-ASCII residual
        const qr = qrcode(0, 'M');
        qr.addData(normalized);
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

async function _pdfPreviewSafeGet(key, fallback) {
    const dataUtils = window.PdfDataAccessUtils || {};
    if (typeof dataUtils.safeGet === 'function') {
        return dataUtils.safeGet(key, fallback);
    }
    try {
        if (typeof appDB !== 'undefined' && appDB && typeof appDB.get === 'function') {
            const v = await appDB.get(key);
            return v == null ? fallback : v;
        }
    } catch (_) { /* fallback below */ }
    try {
        const raw = localStorage.getItem(key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
    } catch (_) {
        return fallback;
    }
}

async function _pdfPreviewSaveRaw(key, value) {
    try {
        if (typeof appDB !== 'undefined' && appDB && typeof appDB.set === 'function') {
            await appDB.set(key, value);
        }
    } catch (_) { /* ignore */ }
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (_) { /* ignore */ }
}

async function _pdfPreviewSaveJson(key, value) {
    try {
        if (typeof appDB !== 'undefined' && appDB && typeof appDB.set === 'function') {
            await appDB.set(key, value);
        }
    } catch (_) { /* ignore */ }
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (_) { /* ignore */ }
}

function _pdfReadImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve('');
        if (!/^image\//i.test(file.type || '')) return reject(new Error('Archivo invalido'));
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = () => reject(new Error('No se pudo leer la imagen'));
        r.readAsDataURL(file);
    });
}

function _uniqDataUrls(list) {
    const out = [];
    (Array.isArray(list) ? list : []).forEach((v) => {
        const s = String(v || '');
        if (!s.startsWith('data:image/')) return;
        if (!out.includes(s)) out.push(s);
    });
    return out;
}

function _assetOptionButton(src, selected, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm';
    btn.style.cssText = 'padding:4px;border:1px solid ' + (selected ? 'var(--primary,#1a56a0)' : 'var(--border,#cbd5e1)') + ';background:' + (selected ? 'var(--primary-soft,#eff6ff)' : 'var(--bg-card,#fff)') + ';';
    btn.title = selected ? 'Seleccionado' : 'Seleccionar';
    btn.innerHTML = `<img src="${src}" alt="Asset" style="height:34px;width:auto;display:block;">`;
    btn.addEventListener('click', onClick);
    return btn;
}

function _resolveActiveIndexes(cfg) {
    const wpSel = document.getElementById('pdfWorkplace');
    const proSel = document.getElementById('pdfProfessional');
    const wpValue = wpSel?.value;
    const proValue = proSel?.value;
    const wpIndex = (wpValue !== undefined && wpValue !== null && String(wpValue).trim() !== '' && Number.isFinite(Number(wpValue)))
        ? Number(wpValue)
        : Number(cfg.activeWorkplaceIndex);
    const proIndex = (proValue !== undefined && proValue !== null && String(proValue).trim() !== '' && Number.isFinite(Number(proValue)))
        ? Number(proValue)
        : Number(cfg.activeProfessionalIndex);
    return { wpIndex, proIndex };
}

async function _selectInstitutionLogo(dataUrl) {
    const cfg = window._pdfConfigCache || (await _pdfPreviewSafeGet('pdf_config', {})) || {};
    const { wpIndex } = _resolveActiveIndexes(cfg);
    if (Number.isNaN(wpIndex)) {
        if (typeof showToast === 'function') showToast('Selecciona un lugar de trabajo para elegir su logo', 'warning');
        return false;
    }

    const profiles = (await _pdfPreviewSafeGet('workplace_profiles', [])) || [];
    const wp = profiles[wpIndex];
    if (!wp) {
        if (typeof showToast === 'function') showToast('No se encontro el lugar de trabajo seleccionado', 'error');
        return false;
    }

    wp.logoOptions = _uniqDataUrls([...(wp.logoOptions || []), wp.logo, dataUrl]);
    wp.logo = dataUrl;
    cfg.activeWorkplaceIndex = String(wpIndex);
    window._pdfConfigCache = cfg;

    await _pdfPreviewSaveJson('workplace_profiles', profiles);
    await _pdfPreviewSaveJson('pdf_config', cfg);
    await _pdfPreviewSaveRaw('pdf_logo', dataUrl);
    await _refreshAssetSelectors();
    return true;
}

async function _addInstitutionLogo(dataUrl) {
    return _selectInstitutionLogo(dataUrl);
}

async function _selectProfessionalAsset(kind, dataUrl) {
    const isSign = kind === 'firma';
    const optionsKey = isSign ? 'firmaOptions' : 'logoOptions';
    const cfg = window._pdfConfigCache || (await _pdfPreviewSafeGet('pdf_config', {})) || {};
    const { wpIndex, proIndex } = _resolveActiveIndexes(cfg);

    const profiles = (await _pdfPreviewSafeGet('workplace_profiles', [])) || [];
    const wp = !Number.isNaN(wpIndex) ? profiles?.[wpIndex] : null;
    const prof = (wp && !Number.isNaN(proIndex)) ? wp?.professionals?.[proIndex] : null;

    // Si existe profesional en workplace_profiles, persistir allí.
    // Si no existe (ej. setup sin profesional seleccionado), usar fallback en pdf_config.activeProfessional.
    if (prof) {
        prof[optionsKey] = _uniqDataUrls([...(prof[optionsKey] || []), prof[kind], dataUrl]);
        prof[kind] = dataUrl;
        await _pdfPreviewSaveJson('workplace_profiles', profiles);
        cfg.activeWorkplaceIndex = String(wpIndex);
        cfg.activeProfessionalIndex = String(proIndex);
    }

    const currentActive = (cfg.activeProfessional && typeof cfg.activeProfessional === 'object')
        ? cfg.activeProfessional
        : {};
    const mergedOptions = _uniqDataUrls([...(currentActive[optionsKey] || []), currentActive[kind], dataUrl]);
    cfg.activeProfessional = {
        ...currentActive,
        [optionsKey]: mergedOptions,
        [kind]: dataUrl,
        logo: (prof?.logo || currentActive.logo || (kind === 'logo' ? dataUrl : '')),
        firma: (prof?.firma || currentActive.firma || (kind === 'firma' ? dataUrl : ''))
    };

    window._pdfConfigCache = cfg;
    await _pdfPreviewSaveJson('pdf_config', cfg);

    if (isSign) await _pdfPreviewSaveRaw('pdf_signature', dataUrl);
    else await _pdfPreviewSaveRaw('pdf_logo', dataUrl);

    await _refreshAssetSelectors();
    return true;
}

async function _addProfessionalAsset(kind, dataUrl) {
    return _selectProfessionalAsset(kind, dataUrl);
}

async function _refreshAssetSelectors() {
    const cfg = window._pdfConfigCache || (await _pdfPreviewSafeGet('pdf_config', {})) || {};
    const profiles = (await _pdfPreviewSafeGet('workplace_profiles', [])) || [];
    const { wpIndex, proIndex } = _resolveActiveIndexes(cfg);

    const wp = !Number.isNaN(wpIndex) ? profiles[wpIndex] : null;
    const prof = (wp && !Number.isNaN(proIndex)) ? wp?.professionals?.[proIndex] : null;
    const activeProFallback = (cfg.activeProfessional && typeof cfg.activeProfessional === 'object')
        ? cfg.activeProfessional
        : null;

    const instCurrent = String(wp?.logo || '').startsWith('data:image/') ? wp.logo : '';
    const instOptions = _uniqDataUrls([...(wp?.logoOptions || []), instCurrent]);
    const instPreview = document.getElementById('pdfLogoPreview');
    if (instPreview) {
        instPreview.innerHTML = instCurrent
            ? `<img src="${instCurrent}" alt="Logo institucional" style="max-height:80px;">`
            : '<span style="color:var(--text-secondary);font-size:0.8rem;">Sin logo institucional</span>';
    }
    const instOptionsEl = document.getElementById('pdfInstLogoOptions');
    if (instOptionsEl) {
        instOptionsEl.innerHTML = '';
        instOptions.forEach((src) => {
            instOptionsEl.appendChild(_assetOptionButton(src, src === instCurrent, () => { _selectInstitutionLogo(src); }));
        });
    }

    const profCurrentRaw = prof?.logo || activeProFallback?.logo || '';
    const profCurrent = String(profCurrentRaw).startsWith('data:image/') ? profCurrentRaw : '';
    const profOptions = _uniqDataUrls([...(prof?.logoOptions || []), ...(activeProFallback?.logoOptions || []), profCurrent]);
    const profPreview = document.getElementById('pdfProfLogoPreview');
    if (profPreview) {
        profPreview.innerHTML = profCurrent
            ? `<img src="${profCurrent}" alt="Logo profesional" style="max-height:70px;">`
            : '<span style="color:var(--text-secondary);font-size:0.8rem;">Sin logo profesional</span>';
    }
    const profOptionsEl = document.getElementById('pdfProfLogoOptions');
    if (profOptionsEl) {
        profOptionsEl.innerHTML = '';
        profOptions.forEach((src) => {
            profOptionsEl.appendChild(_assetOptionButton(src, src === profCurrent, () => { _selectProfessionalAsset('logo', src); }));
        });
    }

    const sigCurrentRaw = prof?.firma || activeProFallback?.firma || '';
    const sigCurrent = String(sigCurrentRaw).startsWith('data:image/') ? sigCurrentRaw : '';
    const sigOptions = _uniqDataUrls([...(prof?.firmaOptions || []), ...(activeProFallback?.firmaOptions || []), sigCurrent]);
    const sigPreview = document.getElementById('pdfSignaturePreview');
    if (sigPreview) {
        sigPreview.innerHTML = sigCurrent
            ? `<img src="${sigCurrent}" alt="Firma" style="max-height:70px;">`
            : '<span style="color:var(--text-secondary);font-size:0.8rem;">Sin firma digital</span>';
    }
    const sigOptionsEl = document.getElementById('pdfSignatureOptions');
    if (sigOptionsEl) {
        sigOptionsEl.innerHTML = '';
        sigOptions.forEach((src) => {
            sigOptionsEl.appendChild(_assetOptionButton(src, src === sigCurrent, () => { _selectProfessionalAsset('firma', src); }));
        });
    }
}

function _initPdfAssetReplacementHandlers() {
    if (window._pdfAssetReplaceHandlersBound) return;
    window._pdfAssetReplaceHandlersBound = true;

    const bindPicker = (btnId, inputId, onFile) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!btn || !input) return;
        btn.addEventListener('click', () => input.click());
        input.addEventListener('change', async (e) => {
            const file = e.target?.files?.[0];
            if (!file) return;
            try {
                const dataUrl = await _pdfReadImageAsDataUrl(file);
                if (!dataUrl.startsWith('data:image/')) throw new Error('Formato no valido');
                const ok = await onFile(dataUrl);
                if (ok && typeof showToast === 'function') showToast('Archivo reemplazado correctamente', 'success');
            } catch (err) {
                if (typeof showToast === 'function') showToast(String(err?.message || 'No se pudo reemplazar el archivo'), 'error');
            } finally {
                input.value = '';
            }
        });
    };

    bindPicker('btnReplaceInstLogo', 'pdfInstLogoUpload', _addInstitutionLogo);
    bindPicker('btnReplaceProfLogo', 'pdfProfLogoUpload', (d) => _addProfessionalAsset('logo', d));
    bindPicker('btnReplaceSignature', 'pdfSignUpload', (d) => _addProfessionalAsset('firma', d));

    const wpSel = document.getElementById('pdfWorkplace');
    if (wpSel) wpSel.addEventListener('change', () => { setTimeout(() => { _refreshAssetSelectors(); }, 80); });
    const proSel = document.getElementById('pdfProfessional');
    if (proSel) proSel.addEventListener('change', () => { setTimeout(() => { _refreshAssetSelectors(); }, 80); });
}

function _stripAccentsForCompare(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _isGenericStudyType(text) {
    const n = _stripAccentsForCompare(text).toLowerCase().trim();
    return n === ''
        || n === 'informe medico general'
        || n === 'informe medico'
        || n === 'informe general'
        || n === 'informe generico'
        || n === 'generico'
        || n === 'general';
}

function _extractStudyTypeFromEditorHeading(editorEl) {
    if (!editorEl) return '';
    const probe = document.createElement('div');
    probe.innerHTML = editorEl.innerHTML || '';
    const heading = probe.querySelector('h1, h2, h3');
    if (!heading) return '';
    const raw = String(heading.textContent || '').trim();
    const m = raw.match(/^INFORME\s+DE\s+(.+)$/i);
    if (m && m[1]) return m[1].trim();
    return '';
}

function _ensurePdfFormatToggles() {
    const mkLabel = (id, text, checked) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        if (checked) input.checked = true;
        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + text));
        return label;
    };

    const showHeaderEl = document.getElementById('pdfShowHeader');
    const showQREl = document.getElementById('pdfShowQR');

    if (showHeaderEl && !document.getElementById('pdfHideReportHeader')) {
        const host = showHeaderEl.closest('label')?.parentElement;
        const anchor = showHeaderEl.closest('label');
        if (host && anchor) {
            const newLabel = mkLabel(
                'pdfHideReportHeader',
                'Excluir encabezado de lugar de trabajo (en todas las páginas, solo usuarios persona)',
                false
            );
            if (anchor.nextSibling) host.insertBefore(newLabel, anchor.nextSibling);
            else host.appendChild(newLabel);
        }
    }

    if (showQREl && !document.getElementById('pdfShowReportNumber')) {
        const host = showQREl.closest('label')?.parentElement;
        const anchor = showQREl.closest('label');
        if (host && anchor) {
            const newLabel = mkLabel('pdfShowReportNumber', 'Mostrar número de informe', true);
            if (anchor.nextSibling) host.insertBefore(newLabel, anchor.nextSibling);
            else host.appendChild(newLabel);
        }
    }
}

function _isClinicProfile() {
    const type = String(window.CLIENT_CONFIG?.type || '').toUpperCase();
    const planCode = String(window.CLIENT_CONFIG?.planCode || '').toUpperCase();
    return type === 'CLINIC' || planCode === 'CLINIC';
}

window.openPdfConfigModal = async function () {
    _ensurePdfFormatToggles();
    _initPdfAssetReplacementHandlers();
    if (typeof loadPdfConfiguration === 'function') await loadPdfConfiguration();
    const dataUtils = window.PdfDataAccessUtils || {};
    const safeGet = (typeof dataUtils.safeGet === 'function') ? dataUtils.safeGet : async (_k, fallback) => fallback;
    const config = window._pdfConfigCache || (await safeGet('pdf_config', {})) || {};

    const profData = (await safeGet('prof_data', {})) || {};
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    const normName = (v) => (typeof window.normalizeFieldText === 'function')
        ? window.normalizeFieldText(String(v || ''), 'name')
        : String(v || '');
    const isAdmin = typeof isAdminUser === 'function' && isAdminUser();
    const isPro = window.currentMode === 'pro';

    set('pdfProfName', normName(profData.nombre));
    set('pdfProfMatricula', profData.matricula);
    const specs = Array.isArray(profData.specialties) ? profData.specialties.join(' / ') : (profData.especialidad || '');
    set('pdfProfEspecialidad', normName(specs));

    if (isAdmin) {
        ['pdfProfName', 'pdfProfMatricula', 'pdfProfEspecialidad'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.readOnly = false; el.disabled = false;
                el.style.backgroundColor = '';
                el.closest('.field-group')?.classList.remove('locked');
            }
        });
    } else {
        ['pdfProfName', 'pdfProfMatricula', 'pdfProfEspecialidad'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.readOnly = true;
                el.disabled = true;
                el.closest('.field-group')?.classList.add('locked');
            }
        });
    }

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

    const canManageWorkplaces = isPro || isAdmin;
    const btnAdd = document.getElementById('btnAddWorkplace');
    if (btnAdd) btnAdd.style.display = canManageWorkplaces ? '' : 'none';
    const btnEdit = document.getElementById('btnEditWorkplace');
    if (btnEdit) btnEdit.style.display = canManageWorkplaces ? '' : 'none';

    const detailsPanel = document.getElementById('workplaceDetailsPanel');
    if (detailsPanel) detailsPanel.style.display = 'none';

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

    if (isPro && window.selectedTemplate && window.MEDICAL_TEMPLATES?.[window.selectedTemplate]) {
        const tplName = window.MEDICAL_TEMPLATES[window.selectedTemplate].name || '';
        if (studyTypeSelect && tplName) {
            studyTypeSelect.value = tplName;
            const hint = document.getElementById('pdfStudyTypeHint');
            if (hint) { hint.textContent = '✨ Auto-detectado desde la plantilla'; hint.style.display = ''; }
        }
    }

    const editorForExtract = window.editor || document.getElementById('editor');
    const freshExtract = (editorForExtract && typeof extractPatientDataFromText === 'function')
        ? extractPatientDataFromText(_getCleanEditorText(editorForExtract)) : {};
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
            const extracted = extractPatientDataFromText(_getCleanEditorText(window.editor));
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

    const reportNumEl = document.getElementById('pdfReportNumber');
    if (reportNumEl && !reportNumEl.value && typeof generateReportNumber === 'function') {
        reportNumEl.value = generateReportNumber();
    }
    // Persistir el número de informe (auto-generado o existente) en el config cache
    // para que TODOS los pipelines (captura DOM, createHTML fallback, email) lo vean.
    if (reportNumEl && reportNumEl.value && config && !config.reportNum) {
        config.reportNum = reportNumEl.value;
        window._pdfConfigCache = config;
        try {
            localStorage.setItem('pdf_config', JSON.stringify(config));
            if (typeof appDB !== 'undefined' && appDB && typeof appDB.set === 'function') {
                appDB.set('pdf_config', config).catch(() => {});
            }
        } catch (_) {}
    }
    const studyDateEl = document.getElementById('pdfStudyDate');
    if (studyDateEl && !studyDateEl.value) {
        studyDateEl.value = new Date().toISOString().split('T')[0];
    }

    updatePdfModalByMode();
    if (typeof populateWorkplaceDropdown === 'function') populateWorkplaceDropdown();
    if (typeof populatePatientDatalist === 'function') populatePatientDatalist();

    // Restaurar profesional activo
    const pdfCfgRestore = (await safeGet('pdf_config', {})) || {};
    const activeProRestore = pdfCfgRestore.activeProfessional;
    if (activeProRestore) {
        set('pdfProfName',        normName(activeProRestore.nombre || ''));
        set('pdfProfMatricula',   activeProRestore.matricula     || '');
        set('pdfProfEspecialidad',normName(activeProRestore.especialidades || ''));
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

    const showSignImageChk = document.getElementById('pdfShowSignImage');
    if (showSignImageChk) showSignImageChk.checked = pdfCfgRestore.showSignImage ?? true;
    const showInstLogoChk = document.getElementById('pdfShowInstLogo');
    if (showInstLogoChk) showInstLogoChk.checked = pdfCfgRestore.showInstLogo ?? true;
    const showProfLogoChk = document.getElementById('pdfShowProfLogo');
    if (showProfLogoChk) showProfLogoChk.checked = pdfCfgRestore.showProfLogo ?? true;
    const showReportNumChk = document.getElementById('pdfShowReportNumber');
    if (showReportNumChk) showReportNumChk.checked = pdfCfgRestore.showReportNumber !== false;
    const hideHeaderChk = document.getElementById('pdfHideReportHeader');
    if (hideHeaderChk) {
        const isClinic = _isClinicProfile();
        hideHeaderChk.checked = !isClinic && (pdfCfgRestore.hideReportHeader === true);
        hideHeaderChk.disabled = isClinic;
        hideHeaderChk.title = isClinic ? 'Esta opción solo aplica a usuarios persona' : '';
    }

    // No se oculta globalmente aquí porque el panel entero ya está oculto

    if (studyTypeSelect && pdfCfgRestore.studyType) {
        // Intentar seleccionar del dropdown
        const opts = Array.from(studyTypeSelect.options).map(o => o.value);
        if (opts.includes(pdfCfgRestore.studyType)) {
            studyTypeSelect.value = pdfCfgRestore.studyType;
        }
    }

    await _refreshAssetSelectors();

    document.getElementById('pdfModalOverlay')?.classList.add('active');
}

/**
 * Pagina la vista previa en páginas A4 reales separadas.
 * Cada página tiene altura fija de 297mm, pie de página en el borde inferior,
 * firma y QR solo en la última página. Los títulos no se separan de su contenido.
 */
function _paginatePreview() {
    const container = document.getElementById('printPreviewContainer');
    const origPage = document.getElementById('previewPage');
    if (!container || !origPage) return;

    // Limpiar paginación previa
    container.querySelectorAll('.pv-real-page').forEach(p => p.remove());
    container.classList.remove('pv-paginated');
    origPage.classList.remove('pv-hidden');

    // --- CONSTANTES ---
    const MM_PX = 96 / 25.4;
    const PAGE_H = Math.round(297 * MM_PX);
    const BOTTOM_PAD = Math.round(10 * MM_PX);

    // --- ELEMENTOS ORIGINALES ---
    const els = {
        wp: document.getElementById('previewWorkplace'),
        hdr: document.getElementById('previewHeader'),
        study: document.getElementById('previewStudy'),
        patient: document.getElementById('previewPatient'),
        content: document.getElementById('previewContent'),
        sig: document.getElementById('previewSignature'),
        qr: document.getElementById('previewQR'),
        footer: document.getElementById('previewFooter')
    };

    // Medir altura exterior incluyendo márgenes
    const mH = (el) => {
        if (!el || el.style.display === 'none' || !el.offsetParent) return 0;
        const s = getComputedStyle(el);
        return el.offsetHeight + parseInt(s.marginTop || 0) + parseInt(s.marginBottom || 0);
    };

    const hWp = mH(els.wp);
    const hHdr = mH(els.hdr);
    const hStudy = mH(els.study);
    const hPatient = mH(els.patient);
    const hSig = mH(els.sig);
    const hQr = mH(els.qr);
    const hFoot = mH(els.footer);

    // --- AGRUPAR: título + primer bloque de contenido juntos ---
    const rawKids = Array.from(els.content.children).filter(c =>
        !c.classList.contains('pv-pagebreak-marker')
    );
    const groups = [];
    for (let i = 0; i < rawKids.length;) {
        const el = rawKids[i];
        if (/^H[1-3]$/i.test(el.tagName)) {
            const grp = [el];
            if (i + 1 < rawKids.length && !/^H[1-3]$/i.test(rawKids[i + 1].tagName)) {
                grp.push(rawKids[i + 1]);
                i += 2;
            } else {
                i++;
            }
            groups.push(grp);
        } else {
            groups.push([el]);
            i++;
        }
    }
    const gH = groups.map(g => g.reduce((s, e) => s + mH(e), 0));

    // --- CAPACIDADES DE PÁGINA ---
    const hFirstTop = hWp + hHdr + hStudy + hPatient;
    const hOtherTop = hWp;
    const hTail = hSig + hQr + 20;
    const cap = (topH, hasTail) => PAGE_H - topH - hFoot - BOTTOM_PAD - (hasTail ? hTail : 0) - 20;

    // --- DISTRIBUIR GRUPOS EN PÁGINAS ---
    const pageGroups = [];
    let cur = [];
    let curH = 0;
    let isFirst = true;

    for (let gi = 0; gi < groups.length; gi++) {
        const h = gH[gi];
        const curCap = cap(isFirst ? hFirstTop : hOtherTop, false);
        if (curH + h > curCap && curH > 0) {
            pageGroups.push(cur);
            cur = [gi];
            curH = h;
            isFirst = false;
        } else {
            cur.push(gi);
            curH += h;
        }
    }
    pageGroups.push(cur);

    // Verificar que la última página cabe con firma+QR
    if (pageGroups.length > 0) {
        const li = pageGroups.length - 1;
        const lastIsFirst = li === 0;
        const lastCH = pageGroups[li].reduce((s, gi) => s + gH[gi], 0);
        const lastCap = cap(lastIsFirst ? hFirstTop : hOtherTop, true);
        if (lastCH > lastCap && pageGroups[li].length > 1) {
            const overflow = [];
            let h = lastCH;
            while (h > lastCap && pageGroups[li].length > 1) {
                const removed = pageGroups[li].pop();
                h -= gH[removed];
                overflow.unshift(removed);
            }
            if (overflow.length > 0) pageGroups.push(overflow);
        }
    }

    // Asegurar firma no quede sola
    if (pageGroups.length > 1 && pageGroups[pageGroups.length - 1].length === 0) {
        const prev = pageGroups[pageGroups.length - 2];
        if (prev.length > 1) {
            pageGroups[pageGroups.length - 1].unshift(prev.pop());
        }
    }

    const totalPages = pageGroups.length;

    // --- LEER ESTILOS Y HTML DE SECCIONES ---
    const accentColor = origPage.style.getPropertyValue('--pa') || '#1a56a0';
    const fontFamily = origPage.style.fontFamily;
    const fontSize = origPage.style.fontSize;
    const sideMargin = origPage.style.paddingLeft || '18mm';
    const vis = (el) => el && el.style.display !== 'none';
    const oHTML = (el) => vis(el) ? el.outerHTML : '';
    const iHTML = (el) => (vis(el) && el.innerHTML.trim()) ? el.innerHTML : '';
    const wpHtml = oHTML(els.wp);
    const hdrHtml = oHTML(els.hdr);
    const studyHtml = oHTML(els.study);
    const patientHtml = oHTML(els.patient);
    const sigHtml = iHTML(els.sig);
    const qrHtml = iHTML(els.qr);
    const footHtml = iHTML(els.footer);
    const footHidden = els.footer?.style.display === 'none';

    // --- CONSTRUIR PÁGINAS ---
    for (let pi = 0; pi < totalPages; pi++) {
        const isFirstPg = (pi === 0);
        const isLastPg = (pi === totalPages - 1);
        const pgNum = pi + 1;

        const pg = document.createElement('div');
        pg.className = 'a4-page pv-real-page';
        pg.dataset.page = pgNum;
        pg.style.setProperty('--pa', accentColor);
        if (fontFamily) pg.style.fontFamily = fontFamily;
        if (fontSize) pg.style.fontSize = fontSize;

        const inner = document.createElement('div');
        inner.className = 'pv-page-inner';
        inner.style.paddingLeft = sideMargin;
        inner.style.paddingRight = sideMargin;

        // Workplace (en toda página, con margen negativo para ancho completo)
        if (wpHtml) {
            const tmp = document.createElement('div');
            tmp.innerHTML = wpHtml;
            const clone = tmp.firstElementChild;
            if (clone) { clone.removeAttribute('id'); inner.appendChild(clone); }
        }

        // Primera página: encabezados profesional, estudio, paciente
        if (isFirstPg) {
            [hdrHtml, studyHtml, patientHtml].forEach(html => {
                if (html) {
                    const tmp = document.createElement('div');
                    tmp.innerHTML = html;
                    const el = tmp.firstElementChild;
                    if (el) { el.removeAttribute('id'); inner.appendChild(el); }
                }
            });
        }

        // Contenido de esta página
        const contentDiv = document.createElement('div');
        contentDiv.className = 'pv-page-content preview-content';
        for (const gi of pageGroups[pi]) {
            for (const el of groups[gi]) {
                contentDiv.appendChild(el.cloneNode(true));
            }
        }
        inner.appendChild(contentDiv);

        // Espaciador flex (empuja la zona inferior al borde de la página)
        const spacer = document.createElement('div');
        spacer.className = 'pv-page-spacer';
        inner.appendChild(spacer);

        // Zona inferior
        const bottom = document.createElement('div');
        bottom.className = 'pv-page-bottom';

        // Firma + QR solo en última página
        if (isLastPg) {
            if (sigHtml) {
                const s = document.createElement('div');
                s.className = 'preview-signature';
                s.innerHTML = sigHtml;
                bottom.appendChild(s);
            }
            if (qrHtml) {
                const q = document.createElement('div');
                q.className = 'preview-qr';
                q.innerHTML = qrHtml;
                bottom.appendChild(q);
            }
        }

        // Footer en toda página
        if (footHtml && !footHidden) {
            const f = document.createElement('div');
            f.className = 'preview-footer';
            f.innerHTML = footHtml.replace(
                /Página\s+\d+(\s+de\s+\d+)?/,
                `Página ${pgNum} de ${totalPages}`
            );
            bottom.appendChild(f);
        }

        inner.appendChild(bottom);
        pg.appendChild(inner);
        container.appendChild(pg);
    }

    // Ocultar página original
    origPage.classList.add('pv-hidden');
    container.classList.add('pv-paginated');

    // --- NAVEGACIÓN ---
    const navEl = document.getElementById('previewPageNav');
    if (navEl && totalPages > 1) {
        navEl.style.display = 'flex';
        navEl.innerHTML = `
            <button class="btn btn-outline btn-sm" id="pvNavPrev" disabled>◀ Anterior</button>
            <span class="pvnav-info">Página <strong>1</strong> de ${totalPages}</span>
            <button class="btn btn-outline btn-sm" id="pvNavNext">Siguiente ▶</button>`;
        let curPg = 1;
        const upd = () => {
            document.getElementById('pvNavPrev').disabled = curPg <= 1;
            document.getElementById('pvNavNext').disabled = curPg >= totalPages;
            navEl.querySelector('.pvnav-info').innerHTML = `Página <strong>${curPg}</strong> de ${totalPages}`;
        };
        const scrollTo = (n) => {
            const allPages = container.querySelectorAll('.pv-real-page');
            if (allPages[n - 1]) allPages[n - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        document.getElementById('pvNavPrev')?.addEventListener('click', () => {
            if (curPg > 1) { curPg--; scrollTo(curPg); upd(); }
        });
        document.getElementById('pvNavNext')?.addEventListener('click', () => {
            if (curPg < totalPages) { curPg++; scrollTo(curPg); upd(); }
        });
        container.addEventListener('scroll', () => {
            const pvPages = container.querySelectorAll('.pv-real-page');
            let closest = 1, minD = Infinity;
            const cR = container.getBoundingClientRect();
            pvPages.forEach((p, i) => {
                const d = Math.abs(p.getBoundingClientRect().top - cR.top);
                if (d < minD) { minD = d; closest = i + 1; }
            });
            if (closest !== curPg) { curPg = closest; upd(); }
        });
    } else if (navEl) {
        navEl.style.display = totalPages > 1 ? 'flex' : 'none';
    }
}

window.openPrintPreview = async function () {
    // Limpiar paginación previa
    const _pvC = document.getElementById('printPreviewContainer');
    if (_pvC) { _pvC.querySelectorAll('.pv-real-page').forEach(p => p.remove()); _pvC.classList.remove('pv-paginated'); }
    const _origP = document.getElementById('previewPage');
    if (_origP) { _origP.classList.remove('pv-hidden'); _origP.style.display = ''; }

    const dataUtils = window.PdfDataAccessUtils || {};
    const safeGet = (typeof dataUtils.safeGet === 'function') ? dataUtils.safeGet : async (_k, fallback) => fallback;
    const profData = (await safeGet('prof_data', {})) || {};
    // Priorizar _pdfConfigCache (actualizado en memoria de forma síncrona por el botón Previsualizar)
    // para que los cambios del formulario sean visibles ANTES de guardar en IndexedDB
    const config   = window._pdfConfigCache || (await safeGet('pdf_config', {})) || {};
    const resolvedCtx = (typeof window.resolveReportContext === 'function')
        ? await window.resolveReportContext({ includeEditorExtract: true, includeFormFallback: true })
        : null;

    // Check de robustez para debugging: confirma datos clave usados por preview.
    console.log('[PDFPreview] Datos fuente:', {
        hasProfName: !!((config.activeProfessional && config.activeProfessional.nombre) || (await safeGet('prof_data', {}))?.nombre),
        hasMatricula: !!((config.activeProfessional && config.activeProfessional.matricula) || (await safeGet('prof_data', {}))?.matricula),
        hasFirma: !!(await safeGet('pdf_signature', '')),
        hasLogo: !!(await safeGet('pdf_logo', '')),
        hasFooterText: !!(config.footerText || '')
    });

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
    const rawProfName    = activePro?.nombre || profData.nombre || '';
    const profDisplayObj = (typeof window.getProfessionalDisplay === 'function')
        ? window.getProfessionalDisplay(rawProfName, activePro?.sexo || profData.sexo || '')
        : {
            fullName: (String(rawProfName || '').trim() || 'Profesional Médico'),
            name: (String(rawProfName || '').trim() || 'Profesional Médico'),
            title: 'Dr.'
        };
    const profName       = escName(profDisplayObj.fullName) || 'Profesional Médico';
    const profDisplayTitle = profDisplayObj.title || 'Dr.';
    const matriculaRaw   = String(activePro?.matricula || profData.matricula || '');
    const matricula      = esc((typeof window.normalizeMatriculaDisplay === 'function')
        ? window.normalizeMatriculaDisplay(matriculaRaw)
        : matriculaRaw);
    const especialidadRaw = activePro?.especialidades
        || (Array.isArray(profData.specialties)
            ? profData.specialties.filter(s => s && s !== 'Todas').join(' / ')
            : (profData.especialidad || ''));
    const especialidad    = escSentence(especialidadRaw);
    const especialidadDisplay = esc((especialidadRaw || '').replace(/^ALL$/i, '').replace(/^General$/i, 'Medicina General').trim());
    const profDisplayName = escName(profDisplayObj.name || rawProfName || 'Profesional Médico');
    const profDisplayFullName = escName(profDisplayObj.fullName || `${profDisplayTitle} ${profDisplayName}`);
    // Contacto del profesional (con fallback socialMedia para clones)
    const sm = (activePro?.socialMedia && typeof activePro.socialMedia === 'object')
        ? activePro.socialMedia
        : ((profData?.socialMedia && typeof profData.socialMedia === 'object') ? profData.socialMedia : {});
    const pvTelefono  = esc(activePro?.telefono  || profData.telefono  || '');
    const pvEmail     = esc(activePro?.email     || profData.email     || '');
    const pvWhatsapp  = esc(activePro?.whatsapp  || profData.whatsapp  || sm.whatsapp  || sm.WhatsApp  || '');
    const pvInstagram = esc(activePro?.instagram || profData.instagram || sm.instagram || sm.Instagram || '');
    const pvFacebook  = esc(activePro?.facebook  || profData.facebook  || sm.facebook  || sm.Facebook  || '');
    const pvXSocial   = esc(activePro?.x         || profData.x         || sm.x || sm.X || sm.twitter || sm.Twitter || '');
    const pvYoutube   = esc(activePro?.youtube   || profData.youtube   || sm.youtube   || sm.YouTube   || '');
    const showPhone   = (activePro?.showPhone ?? config.showPhone ?? true) !== false;
    const showEmail   = (activePro?.showEmail ?? config.showEmail ?? true) !== false;
    const showSocial  = (activePro?.showSocial ?? config.showSocial ?? false) === true;
    const profLogoSize = config.logoSizePx || parseInt(localStorage.getItem('prof_logo_size_px') || '60');
    const firmaSize   = config.firmaSizePx || parseInt(localStorage.getItem('firma_size_px') || '60');
    const instLogoSize = config.instLogoSizePx || parseInt(localStorage.getItem('inst_logo_size_px') || '60');
    const institutionName = escName(activePro?.institutionName || profData.institutionName || '');
    const accentColor     = activePro?.headerColor || profData.headerColor || '#1a56a0';

    // Datos del lugar de trabajo (desde workplace_profiles)
    const wpProfiles = (await safeGet('workplace_profiles', [])) || [];
    const wpIdx = config.activeWorkplaceIndex;
    const activeWp = (wpIdx !== undefined && wpIdx !== null) ? wpProfiles[Number(wpIdx)] : wpProfiles[0];
    const wpName = escName(activeWp?.name || '');
    const wpEmail = esc(activeWp?.email || config.workplaceEmail || '');

    // Extraer datos del paciente SIEMPRE frescos desde el editor
    const editorEl  = window.editor || document.getElementById('editor');
    const extracted = (editorEl && typeof extractPatientDataFromText === 'function')
        ? extractPatientDataFromText(_getCleanEditorText(editorEl)) : {};

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
    const patientName     = escName((resolvedCtx && resolvedCtx.patientName) || extracted.name || config.patientName || formPatient.name || '');
    const patientDni      = esc((resolvedCtx && resolvedCtx.patientDni) || extracted.dni || config.patientDni || formPatient.dni || '');
    const patientAge      = esc((resolvedCtx && resolvedCtx.patientAge) || extracted.age || config.patientAge || formPatient.age || '');
    const rawSex          = (resolvedCtx && resolvedCtx.patientSex) || extracted.sex || config.patientSex || formPatient.sex || '';
    const patientSex      = rawSex === 'M' ? 'Masculino' : rawSex === 'F' ? 'Femenino' : escName(rawSex);
    const patientInsurance = escUpper((resolvedCtx && resolvedCtx.patientInsurance) || config.patientInsurance || formPatient.insurance || '');
    const affiliateNum = esc((resolvedCtx && resolvedCtx.patientAffiliateNum) || config.patientAffiliateNum || reqVal('reqPatientAffiliateNum') || reqVal('pdfPatientAffiliateNum') || '');

    // Datos del estudio (fallback: plantilla detectada → nombre de plantilla seleccionada)
    const tplKey = window.selectedTemplate || config.selectedTemplate || '';
    const tplName = (tplKey && window.MEDICAL_TEMPLATES?.[tplKey]?.name) || '';
    const headingStudyType = _extractStudyTypeFromEditorHeading(editorEl);
    const baseStudyType = config.studyType || document.getElementById('reqStudyType')?.value || tplName || '';
    const effectiveStudyType = (resolvedCtx && resolvedCtx.studyType)
        ? resolvedCtx.studyType
        : ((_isGenericStudyType(baseStudyType) && headingStudyType)
            ? headingStudyType
            : baseStudyType);
    const studyType    = escSentence(effectiveStudyType);
    const showStudyDate = resolvedCtx ? resolvedCtx.showStudyDate : ((document.getElementById('reqShowStudyDate')?.checked ?? config.showStudyDate ?? true) !== false);
    const studyDate    = resolvedCtx
        ? (resolvedCtx.studyDateDisplay || '')
        : ((config.studyDate || document.getElementById('reqStudyDate')?.value || '')
            ? new Date((config.studyDate || document.getElementById('reqStudyDate')?.value || '') + 'T12:00').toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})
            : '');
    const studyReason  = escSentence((resolvedCtx && resolvedCtx.studyReason) || config.studyReason || document.getElementById('reqStudyReason')?.value || '');
    const _rawRefDoctor = String((resolvedCtx && resolvedCtx.referringDoctorRaw) || config.referringDoctor || document.getElementById('reqReferringDoctor')?.value || '')
        .replace(/^\s*(?:dr\.?|dra\.?)\s+/i, '')
        .trim();
    const refDoctor    = (resolvedCtx && resolvedCtx.referringDoctorDisplay)
        ? escName(resolvedCtx.referringDoctorDisplay)
        : (_rawRefDoctor ? escName('Dr./a ' + _rawRefDoctor) : '');
    const reportNum    = esc((resolvedCtx && resolvedCtx.reportNum) || document.getElementById('pdfReportNumber')?.value || config.reportNum || '');
    const showReportNumber = (config.showReportNumber ?? true) === true;
    const hideReportHeader = resolvedCtx ? !!resolvedCtx.hideReportHeader : (!_isClinicProfile() && (config.hideReportHeader === true));
    const footerText   = esc((resolvedCtx && resolvedCtx.footerText) || config.footerText || 'Este informe es válido únicamente con la firma del profesional a cargo.');
    const wkAddr       = esc(config.workplaceAddress || activeWp?.address || '');
    const wkPhone      = esc(config.workplacePhone   || activeWp?.phone || '');
    const showStudyTime = resolvedCtx ? resolvedCtx.showStudyTime : ((document.getElementById('reqShowStudyTime')?.checked ?? config.showStudyTime ?? true) !== false);
    const studyTime    = showStudyTime
        ? esc((resolvedCtx && resolvedCtx.studyTime) || document.getElementById('reqStudyTime')?.value || document.getElementById('pdfStudyTime')?.value || config.studyTime || '')
        : '';
    const showSignLine = config.showSignLine ?? true;
    const showSignName = config.showSignName ?? true;
    const showSignMat  = config.showSignMatricula ?? true;
    // Logo institucional: del workplace activo (wp.logo) → fallback a pdf_logo para compat. con usuarios sin factory setup
    const _wpLogoRaw = activeWp?.logo || '';
    const instLogoSrc = (_wpLogoRaw && _wpLogoRaw.startsWith('data:')) ? _wpLogoRaw : ((await safeGet('pdf_logo', '')) || '');
    // Logo del profesional (foto/logo del médico, distinto del logo institucional)
    const profLogoSrc = (activePro?.logo && activePro.logo.startsWith('data:')) ? activePro.logo : '';
    // Firma digital
    const sigSrc  = (activePro?.firma && activePro.firma.startsWith('data:')) ? activePro.firma : ((await safeGet('pdf_signature', '')) || '');
    const hasInstLogo = !!(instLogoSrc && instLogoSrc.startsWith('data:image/'));
    const hasProfLogo = !!(profLogoSrc && profLogoSrc.startsWith('data:image/'));
    const showInstLogo = (config.showInstLogo ?? true) === true;
    const showProfLogo = (config.showProfLogo ?? true) === true;
    const hasLogo = showInstLogo && hasInstLogo; // alias para compat. interna
    const hasSig  = !!(sigSrc && sigSrc.startsWith('data:image/'));

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

    const wpHeaderEl = document.getElementById('previewWorkplace');
    if (wpHeaderEl) {
        if (hideReportHeader) {
            wpHeaderEl.innerHTML = '';
            wpHeaderEl.style.display = 'none';
        } else {
        const hasWpData = wpName || wkAddr || wkPhone || wpEmail;
        if (hasWpData) {
            wpHeaderEl.style.display = '';
            let wpHtml = '<div class="pvw-block">';
            // Logo institucional (a la izquierda del nombre de la institución)
            if (showInstLogo && hasInstLogo) wpHtml += `<img class="pvw-logo" src="${instLogoSrc}" alt="Logo" style="max-height:${instLogoSize}px;width:auto;object-fit:contain;border:none;border-radius:0;background:transparent;box-shadow:none;">`;
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
    }

    const headerEl = document.getElementById('previewHeader');
    if (headerEl) {
        if (hideReportHeader) {
            headerEl.innerHTML = '';
            headerEl.style.display = 'none';
        } else {
        // Ocultar encabezado si es ADMIN sin profesional activo configurado
        const isAdminWithoutProf = (!activePro || !activePro.nombre) &&
            (!profData.nombre || profData.nombre === 'Administrador' || profData.nombre === 'Admin');
        if (isAdminWithoutProf) {
            headerEl.innerHTML = '';
            headerEl.style.display = 'none';
        } else {
            headerEl.style.display = '';
            // Specialties as badges
            const pvEspArr = (especialidadRaw || '').replace(/^ALL$/i, 'Medicina General')
                .split(/[,\/]/).map(s => s.replace(/^General$/i, 'Medicina General').trim()).filter(Boolean);
            const pvBadgesHtml = pvEspArr.map(s => `<span class="pvh-badge">${esc(s)}</span>`).join('');
            const socialIconSvg = (network) => {
                const iconColor = '#ffffff';
                const bgByNetwork = {
                    whatsapp: '#25D366',
                    instagram: '#E4405F',
                    facebook: '#1877F2',
                    x: '#111827',
                    youtube: '#FF0000'
                };
                const bg = bgByNetwork[network] || '#1a56a0';
                if (network === 'instagram') {
                    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="6" ry="6" fill="${bg}"/><circle cx="12" cy="12" r="4" fill="none" stroke="${iconColor}" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.2" fill="${iconColor}"/></svg>`;
                }
                if (network === 'facebook') {
                    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="${bg}"/><path d="M13.3 8h2V5.6h-2.4c-2.5 0-4.1 1.5-4.1 4.1V12H7v2.4h1.8v4h2.6v-4h2.4L14.2 12h-2.8V9.9c0-1.1.5-1.9 1.9-1.9Z" fill="${iconColor}"/></svg>`;
                }
                if (network === 'x') {
                    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="${bg}"/><path d="M7 7h2.4l2.8 4 3-4H17l-3.9 5.2L17 17h-2.4l-3-4.2L8.6 17H7l4-5.4L7 7Z" fill="${iconColor}"/></svg>`;
                }
                if (network === 'youtube') {
                    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="2" y="5.5" width="20" height="13" rx="4" ry="4" fill="${bg}"/><path d="M10 9.2v5.6l5-2.8-5-2.8Z" fill="${iconColor}"/></svg>`;
                }
                return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="${bg}"/><path d="M8.4 7.8h3.3l.8 1.5-1.2 1.3c.7 1.2 1.7 2.2 2.9 2.9l1.3-1.2 1.5.8v3.3c-4.4.8-9.2-4-8.6-8.2Z" fill="${iconColor}"/></svg>`;
            };
            // Contact right column
            const pvCItems = [];
            if (showPhone && pvTelefono)  pvCItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9742;</span>${pvTelefono}</div>`);
            if (showEmail && pvEmail)     pvCItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9993;</span>${pvEmail}</div>`);
            const pvSocialItems = [];
            if (showSocial && pvWhatsapp)  pvSocialItems.push({ key: 'whatsapp', value: pvWhatsapp });
            if (showSocial && pvInstagram) pvSocialItems.push({ key: 'instagram', value: pvInstagram });
            if (showSocial && pvFacebook)  pvSocialItems.push({ key: 'facebook', value: pvFacebook });
            if (showSocial && pvXSocial)   pvSocialItems.push({ key: 'x', value: pvXSocial });
            if (showSocial && pvYoutube)   pvSocialItems.push({ key: 'youtube', value: pvYoutube });
            const pvContactHtml = pvCItems.length ? `<div class="pvh-contact">${pvCItems.join('')}</div>` : '';
            const pvSocialHtml = pvSocialItems.length
                ? `<div class="pvh-social">${pvSocialItems.map((item) => `<div class="pvh-soc-item"><span class="pvh-soc-icon">${socialIconSvg(item.key)}</span><span class="pvh-soc-val">${item.value}</span></div>`).join('')}</div>`
                : '';
            headerEl.innerHTML = `
                <div class="pvh-body" style="display:flex;align-items:center;gap:12px;">
                    ${(showProfLogo && hasProfLogo) ? `<img src="${profLogoSrc}" alt="Logo Prof" style="height:40px;max-height:40px;width:auto;object-fit:contain;flex-shrink:0;background:transparent;border:none;border-radius:0;">` : ''}
                    <div class="pvh-info" style="flex:1;min-width:0;">
                        <div>
                            <span class="pvh-name">Estudio realizado por: ${profDisplayFullName}</span>
                        </div>
                        ${pvBadgesHtml ? `<div class="pvh-badges">${pvBadgesHtml}</div>` : ''}
                        ${matricula ? `<div class="pvh-mat">Mat. ${matricula}</div>` : ''}
                    </div>
                    ${pvContactHtml}
                </div>
                ${pvSocialHtml}`;
        }
            }
    }

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

    const studyEl = document.getElementById('previewStudy');
    if (studyEl) {
        const studyTitle = (studyType && String(studyType).trim()) ? `INFORME DE ${studyType}` : 'INFORME MEDICO';
        const studyInline = [];
        if (showReportNumber) {
            studyInline.push(`<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">INFORME Nº:</span><span class="pvs-val">${reportNum || '—'}</span></div>`);
        }
        if (showStudyDate && (studyDate || studyTime)) {
            studyInline.push(`<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">FECHA:</span><span class="pvs-val">${studyDate}${studyTime ? ' ' + studyTime + ' hs.' : ''}</span></div>`);
        }
        if (refDoctor)   studyInline.push(`<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">SOLICITANTE:</span><span class="pvs-val">${refDoctor}</span></div>`);
        if (studyReason) studyInline.push(`<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">MOTIVO:</span><span class="pvs-val">${studyReason}</span></div>`);
        studyEl.innerHTML = `<div style="text-align:center;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--pa,#1a56a0);font-size:13pt;border-bottom:2px solid var(--pa,#1a56a0);padding-bottom:4px;margin:2px 0 10px;">${studyTitle}</div>`
            + (studyInline.length ? `<div class="pvs-grid pvs-inline">${studyInline.join('')}</div>` : '');
    }

    const contentEl = document.getElementById('previewContent');
    if (contentEl) {
        contentEl.innerHTML = editorEl ? editorEl.innerHTML : '';
        // Eliminar elementos de UI que no deben aparecer en la vista previa
        contentEl.querySelectorAll('.patient-data-header, .patient-placeholder-banner, .btn-append-inline, .original-text-banner, .no-print, .ai-note-panel, .inline-review-btn, #aiNotePanel').forEach(el => {
            el.remove();
        });
        // Evitar doble título: si el contenido arranca con "INFORME DE ...",
        // ese heading se reemplaza por el encabezado principal de la vista previa.
        const firstEl = contentEl.firstElementChild;
        if (firstEl && /^H[1-3]$/i.test(firstEl.tagName) && /^\s*INFORME\s+DE\b/i.test(firstEl.textContent || '')) {
            firstEl.remove();
        }
        // Eliminar campos vacíos [No especificado] completamente
        contentEl.querySelectorAll('.no-data-field').forEach(el => {
            el.remove();
        });
    }

    const sigEl = document.getElementById('previewSignature');
    // Mostrar imagen de firma por defecto si existe (el usuario puede desactivarla en la config)
    const showSignImage = config.showSignImage ?? hasSig;
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
            if (showSignImage && hasSig) sigHtml += `<img src="${sigSrc}" class="pvsig-img" alt="Firma" style="max-height:${firmaSize}px;">`;
            if (showSignLine) sigHtml += `<div class="pvsig-line"></div>`;
            if (showSignName && profName) sigHtml += `<div class="pvsig-name">${profDisplayFullName}</div>`;
            if (showSignMat  && matricula) sigHtml += `<div class="pvsig-mat">Mat. ${matricula}</div>`;
            if (especialidad) sigHtml += `<div class="pvsig-spec">${especialidad}</div>`;
            sigHtml += '</div>';
            sigEl.innerHTML = sigHtml;
        }
    }

    const footerEl = document.getElementById('previewFooter');
    if (footerEl) {
        const parts = [];
        if (footerText) parts.push(`<span>${footerText}</span>`);
        if (resolvedCtx ? resolvedCtx.showDateInFooter : !!config.showDate) {
            parts.push(`<span>Impreso: ${new Date().toLocaleDateString('es-ES')}</span>`);
        }
        // Número de página real: calculado después de renderizar
        if (config.showPageNum) parts.push(`<span class="pvf-pagenum" style="margin-left:auto;">Página 1</span>`);
        footerEl.innerHTML = parts.length ? `<div class="pvf-wrap">${parts.join('')}</div>` : '';
        footerEl.style.display = parts.length ? '' : 'none';
    }

    const qrEl = document.getElementById('previewQR');
    if (qrEl) {
        const showQR = config.showQR ?? false;
        if (showQR && typeof generateQRCode === 'function') {
            // Construir texto de verificación con datos del informe
            const qrParts = [
                'TPRO-VERIFY',
                `ID:${(showReportNumber && reportNum) ? reportNum : 'TPRO-' + Date.now()}`,
                `Fecha:${new Date().toLocaleDateString('es-ES')}`,
                profName ? `Prof:${profName}` : '',
                matricula ? `Mat:${matricula}` : '',
                config.patientName ? `Pac:${config.patientName}` : '',
                config.patientDni ? `DNI:${config.patientDni}` : '',
                studyType ? `Estudio:${studyType}` : '',
                institutionName ? `Inst:${institutionName}` : ''
            ].filter(Boolean);
            const qrData = qrParts.join('|');
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

    // Paginar en páginas A4 independientes con footer, firma y QR
    setTimeout(() => { _paginatePreview(); }, 200);
}

// Extraido a pdfPreviewActions.js para reducir tamano del modulo principal.
// Compat tests (texto): _escHtml | printFromPreview | saveToDisk | downloadAs


/**
 * Evalúa la completitud de la configuración del PDF/impresión.
 * @returns {{ level: 'red'|'yellow'|'green', missing: string[] }}
 */
window.evaluateConfigCompleteness = function () {
    const profData = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
    const pdfConfig = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
    const missing = [];

    // Campos críticos (sin ellos el PDF sale muy incompleto)
    if (!profData.nombre)      missing.push('Nombre del profesional');
    if (!profData.matricula)   missing.push('Matrícula');

    // Campos importantes
    const specs = Array.isArray(profData.specialties) ? profData.specialties.join('') : (profData.especialidad || profData.especialidades || '');
    if (!specs) missing.push('Especialidad');

    const workplaces = window._wpProfilesCache || JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
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
