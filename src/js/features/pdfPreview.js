
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
    if (typeof loadPdfConfiguration === 'function') loadPdfConfiguration();
    const dataUtils = window.PdfDataAccessUtils || {};
    const safeGet = (typeof dataUtils.safeGet === 'function') ? dataUtils.safeGet : async (_k, fallback) => fallback;

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

    const reportNumEl = document.getElementById('pdfReportNumber');
    if (reportNumEl && !reportNumEl.value && typeof generateReportNumber === 'function') {
        reportNumEl.value = generateReportNumber();
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

window.openPrintPreview = async function () {
    const dataUtils = window.PdfDataAccessUtils || {};
    const safeGet = (typeof dataUtils.safeGet === 'function') ? dataUtils.safeGet : async (_k, fallback) => fallback;
    const profData = (await safeGet('prof_data', {})) || {};
    // Priorizar _pdfConfigCache (actualizado en memoria de forma síncrona por el botón Previsualizar)
    // para que los cambios del formulario sean visibles ANTES de guardar en IndexedDB
    const config   = window._pdfConfigCache || (await safeGet('pdf_config', {})) || {};

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
    const headingStudyType = _extractStudyTypeFromEditorHeading(editorEl);
    const baseStudyType = config.studyType || document.getElementById('reqStudyType')?.value || tplName || '';
    const effectiveStudyType = (_isGenericStudyType(baseStudyType) && headingStudyType)
        ? headingStudyType
        : baseStudyType;
    const studyType    = escSentence(effectiveStudyType);
    const rawDate      = config.studyDate || document.getElementById('reqStudyDate')?.value || '';
    const showStudyDate = (document.getElementById('reqShowStudyDate')?.checked ?? config.showStudyDate ?? true) !== false;
    const studyDate    = rawDate
        ? new Date(rawDate + 'T12:00').toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})
        : '';
    const studyReason  = escSentence(config.studyReason || document.getElementById('reqStudyReason')?.value || '');
    const _rawRefDoctor = String(config.referringDoctor || document.getElementById('reqReferringDoctor')?.value || '')
        .replace(/^\s*(?:dr\.?|dra\.?)\s+/i, '')
        .trim();
    const refDoctor    = _rawRefDoctor ? escName('Dr./a ' + _rawRefDoctor) : '';
    const reportNum    = esc(document.getElementById('pdfReportNumber')?.value || config.reportNum || '');
    const showReportNumber = (config.showReportNumber ?? true) === true;
    const hideReportHeader = !_isClinicProfile() && (config.hideReportHeader === true);
    const footerText   = esc(config.footerText || 'Este informe es válido únicamente con la firma del profesional a cargo.');
    const wkAddr       = esc(config.workplaceAddress || activeWp?.address || '');
    const wkPhone      = esc(config.workplacePhone   || activeWp?.phone || '');
    const showStudyTime = (document.getElementById('reqShowStudyTime')?.checked ?? config.showStudyTime ?? true) !== false;
    const studyTime    = showStudyTime
        ? esc(document.getElementById('reqStudyTime')?.value || document.getElementById('pdfStudyTime')?.value || config.studyTime || '')
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
            // Contact right column
            const pvCItems = [];
            if (showPhone && pvTelefono)  pvCItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9742;</span>${pvTelefono}</div>`);
            if (showEmail && pvEmail)     pvCItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9993;</span>${pvEmail}</div>`);
            if (showSocial && pvWhatsapp)  pvCItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#128241;</span>${pvWhatsapp}</div>`);
            if (showSocial && pvInstagram) pvCItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">@</span>${pvInstagram}</div>`);
            if (showSocial && pvFacebook)  pvCItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">f</span>${pvFacebook}</div>`);
            if (showSocial && pvXSocial)   pvCItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#120143;</span>${pvXSocial}</div>`);
            if (showSocial && pvYoutube)   pvCItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9654;</span>${pvYoutube}</div>`);
            const pvContactHtml = pvCItems.length ? `<div class="pvh-contact">${pvCItems.join('')}</div>` : '';
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
                </div>`;
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
        // Fila 1: Estudio | Informe Nº | Fecha
        // Fila 2: Solicitante | Motivo
        let row1 = '';
        row1 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">ESTUDIO:</span><span class="pvs-val">${studyType || '—'}</span></div>`;
        if (showReportNumber) {
            row1 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">INFORME Nº:</span><span class="pvs-val">${reportNum || '—'}</span></div>`;
        }
        if (showStudyDate && (studyDate || studyTime)) {
            row1 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">FECHA:</span><span class="pvs-val">${studyDate}${studyTime ? ' ' + studyTime : ''}</span></div>`;
        }
        let row2 = '';
        if (refDoctor)   row2 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">SOLICITANTE:</span><span class="pvs-val">${refDoctor}</span></div>`;
        if (studyReason) row2 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">MOTIVO:</span><span class="pvs-val">${studyReason}</span></div>`;
        studyEl.innerHTML = `<div style="text-align:center;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--pa,#1a56a0);font-size:13pt;border-bottom:2px solid var(--pa,#1a56a0);padding-bottom:4px;margin:2px 0 10px;">${studyTitle}</div><div class="pvs-grid pvs-3col">${row1}</div>`
            + (row2 ? `<div class="pvs-grid pvs-2col">${row2}</div>` : '');
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
        if (config.showDate) parts.push(`<span>Impreso: ${new Date().toLocaleDateString('es-ES')}</span>`);
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

    // Calcular número de páginas y configurar navegación
    setTimeout(() => {
        const pageEl = document.getElementById('previewPage');
        const pageNumEl = document.querySelector('.pvf-pagenum');
        const pageHeightMM = 297;
        const onePagePx = pageHeightMM * (96 / 25.4); // ~1122px

        // Estimación más fiel: contar páginas por bloques de contenido reales,
        // evitando falsos "Página 1 de 2" por redondeos de scrollHeight.
        const contentEl = document.getElementById('previewContent');
        const footerEl = document.getElementById('previewFooter');
        const sigEl = document.getElementById('previewSignature');
        const wpHeaderEl = document.getElementById('previewWorkplace');

        const headerZoneH = contentEl ? contentEl.offsetTop : 0;
        const footerZoneH = (footerEl?.offsetHeight || 0) + (sigEl?.offsetHeight || 0) + 40;
        const firstPageContentH = Math.max(120, onePagePx - headerZoneH - footerZoneH);
        const repeatedHeaderH = (wpHeaderEl?.offsetHeight || 0) + 20;
        const nextPageContentH = Math.max(120, onePagePx - repeatedHeaderH - footerZoneH);

        let totalPages = 1;
        if (contentEl) {
            const children = Array.from(contentEl.children).filter(ch => !ch.classList.contains('pv-pagebreak-marker'));
            if (children.length > 0) {
                let used = 0;
                let currentCap = firstPageContentH;
                let pageIdx = 1;
                for (const child of children) {
                    const styles = getComputedStyle(child);
                    const childH = child.offsetHeight
                        + parseInt(styles.marginTop || 0, 10)
                        + parseInt(styles.marginBottom || 0, 10);

                    if (used > 0 && used + childH > currentCap) {
                        pageIdx++;
                        used = childH;
                        currentCap = nextPageContentH;
                    } else {
                        used += childH;
                    }
                }
                totalPages = Math.max(1, pageIdx);
            }
        } else {
            totalPages = Math.max(1, Math.ceil((pageEl?.scrollHeight || 0) / onePagePx));
        }

        if (pageNumEl) {
            pageNumEl.textContent = totalPages > 1 ? `Página 1 de ${totalPages}` : 'Página 1 de 1';
        }

        // Muestran dónde caería cada salto de página con un separador
        // y una mini-repetición del banner del lugar de trabajo (como hace el PDF real)
        if (pageEl && totalPages > 1) {
            // Limpiar marcadores previos
            pageEl.querySelectorAll('.pv-pagebreak-marker').forEach(m => m.remove());

            // Solo repetir el workplace banner (no el header profesional)
            const wpCloneHtml = wpHeaderEl && wpHeaderEl.style.display !== 'none' ? wpHeaderEl.outerHTML : '';

            // Insertar marcadores en el contenido en las posiciones de salto
            if (contentEl) {
                // Calcular la altura disponible para contenido en la primera página
                // Reusar capacidades calculadas arriba para mantener consistencia.

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
