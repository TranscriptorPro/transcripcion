// ============ FORM & PATIENT DATA HANDLER ============

// ---- G2: Sistema unificado — patient_history MIGRADO a patient_registry ----
// savePatientToHistory es ahora un alias transparente de savePatientToRegistry.
// Al iniciar, migramos cualquier dato residual de patient_history → patient_registry.
(function _migratePatientHistory() {
    try {
        const old = JSON.parse(localStorage.getItem('patient_history') || '[]');
        if (old.length && typeof savePatientToRegistry === 'function') {
            // Migrar cada paciente viejo al registro (no duplica si ya existe)
            old.forEach(p => { if (p && p.name) savePatientToRegistry(p); });
            // Borrar la clave obsoleta solo si la migración fue posible
            localStorage.removeItem('patient_history');
        }
    } catch (_) { /* ignorar errores de migración */ }
})();

window.savePatientToHistory = function (patient) {
    // Alias: delega 100% al registro unificado
    if (typeof savePatientToRegistry === 'function') savePatientToRegistry(patient);
};

// populatePatientDatalist → delega al de patientRegistry.js (que usa getRegistry)
// Si patientRegistry aún no cargó, no-op.
if (typeof window.populatePatientDatalist === 'undefined') {
    window.populatePatientDatalist = function () {};
}

// Initial binding for patient search — usa searchPatientRegistry (registro unificado)
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('patientSearch');
    if (!searchInput) return;

    // C3: Dropdown de resultados múltiples
    var dropdown = document.createElement('div');
    dropdown.id = 'patientSearchDropdown';
    dropdown.style.cssText = 'position:absolute;z-index:100;background:var(--bg-card,#fff);border:1px solid var(--border-color,#ccc);border-radius:6px;max-height:180px;overflow-y:auto;display:none;width:100%;box-shadow:0 4px 12px rgba(0,0,0,.15);';
    searchInput.parentNode.style.position = 'relative';
    searchInput.parentNode.appendChild(dropdown);

    function fillPatient(p) {
        var set = function(id, v) { var el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; };
        set('pdfPatientName', p.name);
        set('pdfPatientDni', p.dni);
        set('pdfPatientAge', p.age);
        set('pdfPatientSex', p.sex);
        set('pdfPatientInsurance', p.insurance);
        set('pdfPatientPhone', p.phone);
        dropdown.style.display = 'none';
    }

    searchInput.addEventListener('input', function(e) {
        var val = e.target.value;
        if (!val || val.length < 2) { dropdown.style.display = 'none'; return; }
        var results = typeof searchPatientRegistry === 'function' ? searchPatientRegistry(val) : [];
        if (results.length === 0) { dropdown.style.display = 'none'; return; }
        if (results.length === 1) { fillPatient(results[0]); return; }

        dropdown.innerHTML = '';
        results.slice(0, 10).forEach(function(p) {
            var item = document.createElement('div');
            item.textContent = p.name + (p.dni ? ' — DNI: ' + p.dni : '');
            item.style.cssText = 'padding:6px 10px;cursor:pointer;font-size:0.85rem;border-bottom:1px solid var(--border-color,#eee);';
            item.addEventListener('mouseenter', function() { item.style.background = 'var(--primary-light,#e0f2fe)'; });
            item.addEventListener('mouseleave', function() { item.style.background = ''; });
            item.addEventListener('click', function() { fillPatient(p); searchInput.value = p.name; });
            dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
    });

    // Cerrar dropdown al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Birthdate → Age auto-calculation
    document.getElementById('pdfPatientBirthdate')?.addEventListener('change', (e) => {
        if (!e.target.value) return;
        const birthdate = new Date(e.target.value);
        const today = new Date();
        if (birthdate > today) {
            if (typeof showToast === 'function') showToast('⚠️ La fecha de nacimiento no puede ser futura', 'error');
            e.target.value = '';
            return;
        }
        let age = today.getFullYear() - birthdate.getFullYear();
        const m = today.getMonth() - birthdate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) age--;
        const ageEl = document.getElementById('pdfPatientAge');
        if (ageEl) ageEl.value = age;
    });
});

// ---- Extract patient data from transcription ----
const PATIENT_NAME_REGEX = /paciente\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/i;
const DNI_REGEX = /(?:DNI|documento|D\.N\.I\.?)[:\s]*(?:N[°º]?\s*)?(\d{1,3}\.?\d{3}\.?\d{3})/i;
const AGE_REGEX = /(\d{1,3})\s*años/i;
const SEX_REGEX = /(?:sexo|género)\s*(?::|,)?\s*(masculino|femenino|masc|fem)/i;

window.extractPatientDataFromText = function (text) {
    if (!text) return {};
    const data = {};
    const nameMatch = text.match(PATIENT_NAME_REGEX);
    if (nameMatch) data.name = nameMatch[1];
    const dniMatch = text.match(DNI_REGEX);
    if (dniMatch) data.dni = dniMatch[1];
    const ageMatch = text.match(AGE_REGEX);
    if (ageMatch) data.age = parseInt(ageMatch[1]);
    const sexMatch = text.match(SEX_REGEX);
    if (sexMatch) data.sex = /^m/i.test(sexMatch[1]) ? 'M' : 'F';
    return data;
}

// ---- Report numbering ----
// Nueva nomenclatura: XX-NNNNN-ddmmaa (XX=tipo estudio, NNNNN=correlativo, ddmmaa=fecha)
const _REPORT_ABBREVS = {
    espirometria: 'ES', holter: 'HL', test_marcha: 'TM', mapa: 'MP',
    pletismografia: 'PL', cinecoro: 'CI', oximetria_nocturna: 'OX', ecg: 'EG',
    campimetria: 'CM', eco_stress: 'EC', oct_retinal: 'OC', pap: 'PP',
    topografia_corneal: 'TC', colposcopia: 'CP', fondo_ojo: 'FO',
    electromiografia: 'EM', tac: 'TA', polisomnografia: 'PS', naso: 'NL',
    resonancia: 'RM', mamografia: 'MG', endoscopia_otologica: 'EO',
    densitometria: 'DX', protocolo_quirurgico: 'PQ', pet_ct: 'PT',
    ett: 'ET', radiografia: 'RX', ecografia_renal: 'ER',
    ecografia_abdominal: 'EA', ecografia_tiroidea: 'TI', gastroscopia: 'GS',
    ecografia_mamaria: 'MM', colonoscopia: 'CO', ecografia_obstetrica: 'OB',
    broncoscopia: 'BR', eco_doppler: 'ED', laringoscopia: 'LA',
    nota_evolucion: 'NE', gammagrafia_cardiaca: 'GC', epicrisis: 'EP',
    generico: 'IG'
};

window.generateReportNumber = function () {
    let tplKey = '';
    try {
        const cfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        tplKey = cfg.selectedTemplate || '';
    } catch(_) {}
    if (!tplKey) tplKey = (typeof window !== 'undefined' && window.selectedTemplate) ? window.selectedTemplate : '';
    const abbrev = _REPORT_ABBREVS[tplKey] || 'IG';
    const counterKey = 'report_counter_' + abbrev;
    let counter = parseInt(localStorage.getItem(counterKey) || '0');
    counter++;
    if (typeof appDB !== 'undefined') appDB.set(counterKey, counter);
    localStorage.setItem(counterKey, counter);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const aa = String(now.getFullYear()).slice(-2);
    return `${abbrev}-${String(counter).padStart(5, '0')}-${dd}${mm}${aa}`;
};

// ---- Reset / Edit botones de Informe Nº ----
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnResetReportNum')?.addEventListener('click', () => {
        let tplKey = '';
        try {
            const cfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
            tplKey = cfg.selectedTemplate || '';
        } catch(_) {}
        if (!tplKey) tplKey = (typeof window !== 'undefined' && window.selectedTemplate) ? window.selectedTemplate : '';
        const abbrev = _REPORT_ABBREVS[tplKey] || 'IG';
        localStorage.removeItem('report_counter_' + abbrev);
        if (typeof appDB !== 'undefined') appDB.set('report_counter_' + abbrev, 0);
        const el = document.getElementById('pdfReportNumber');
        if (el) el.value = '';
        if (typeof showToast === 'function') showToast(`Contador reiniciado — el próximo informe ${abbrev} será 00001`, 'info');
    });

    document.getElementById('btnEditReportNum')?.addEventListener('click', () => {
        const el = document.getElementById('btnEditReportNum');
        const inp = document.getElementById('pdfReportNumber');
        if (!inp) return;
        if (inp.readOnly) {
            inp.readOnly = false;
            inp.focus();
            inp.select();
            if (el) el.title = 'Bloquear edición';
            if (el) el.textContent = '🔒';
        } else {
            inp.readOnly = true;
            if (el) el.title = 'Editar número manualmente';
            if (el) el.textContent = '✏️';
        }
    });
});

// ---- Image upload handlers ----
window.handleImageUpload = function (inputId, previewId, storageKey) {
    document.getElementById(inputId)?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const preview = document.getElementById(previewId);
            if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="Preview" style="max-height:80px;">`;
            if (typeof appDB !== 'undefined') {
                appDB.set(storageKey, dataUrl);
            } else {
                try {
                    localStorage.setItem(storageKey, dataUrl);
                } catch (storageErr) {
                    console.error('Storage error:', storageErr);
                    if (typeof showToast === 'function') showToast('No se pudo guardar la imagen (almacenamiento lleno)', 'error');
                }
            }
        };
        reader.readAsDataURL(file);
    });
}

// ---- Save/Load configuration ----
window.savePdfConfiguration = function () {
    const val = (id) => document.getElementById(id)?.value || '';
    const chk = (id, def) => document.getElementById(id)?.checked ?? def;

    // Preservar datos del profesional activo que fueron seteados por business.js
    const existing = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');

    const config = {
        studyType: val('pdfStudyType'),
        selectedTemplate: window.selectedTemplate || '',
        studyDate: val('pdfStudyDate'),
        studyTime: val('pdfStudyTime'),
        studyReason: val('pdfStudyReason'),
        referringDoctor: val('pdfReferringDoctor'),
        equipment: val('pdfEquipment'),
        technique: val('pdfTechnique'),
        patientName: val('pdfPatientName'),
        patientDni: val('pdfPatientDni'),
        patientAge: val('pdfPatientAge'),
        patientSex: val('pdfPatientSex'),
        patientInsurance: val('pdfPatientInsurance'),
        patientAffiliateNum: val('pdfPatientAffiliateNum'),
        patientPhone: val('pdfPatientPhone'),
        patientBirthdate: val('pdfPatientBirthdate'),
        pageSize: val('pdfPageSize') || 'a4',
        orientation: val('pdfOrientation') || 'portrait',
        margins: val('pdfMargins') || 'normal',
        font: val('pdfFont') || 'helvetica',
        fontSize: val('pdfFontSize') || '11',
        lineSpacing: val('pdfLineSpacing') || '1.5',
        showHeader: chk('pdfShowHeader', true),
        showFooter: chk('pdfShowFooter', true),
        showPageNum: chk('pdfShowPageNum', true),
        showDate: chk('pdfShowDate', true),
        showQR: chk('pdfShowQR', true),
        showSignLine: chk('pdfShowSignLine', true),
        showSignName: chk('pdfShowSignName', true),
        showSignMatricula: chk('pdfShowSignMatricula', true),
        showSignImage: chk('pdfShowSignImage', true),
        logoSizePx: parseInt(document.getElementById('pdfLogoSize')?.value || '60'),
        firmaSizePx: parseInt(document.getElementById('pdfFirmaSize')?.value || '60'),
        footerText: val('pdfFooterText'),
        selectedWorkplace: val('pdfWorkplace'),
        workplaceAddress: val('pdfWorkplaceAddress'),
        workplacePhone: val('pdfWorkplacePhone'),
        workplaceEmail: val('pdfWorkplaceEmail')
    };

    // Preservar campos de profesional activo (seteados por business.js)
    if (existing.activeProfessional)      config.activeProfessional      = existing.activeProfessional;
    if (existing.activeProfessionalIndex !== undefined) config.activeProfessionalIndex = existing.activeProfessionalIndex;
    if (existing.activeWorkplaceIndex    !== undefined) config.activeWorkplaceIndex    = existing.activeWorkplaceIndex;

    window._pdfConfigCache = config;
    if (typeof appDB !== 'undefined') appDB.set('pdf_config', config);
    else localStorage.setItem('pdf_config', JSON.stringify(config));
    // Persistir tamaños de logo y firma en localStorage para acceso rápido
    localStorage.setItem('prof_logo_size_px', String(config.logoSizePx || 60));
    localStorage.setItem('firma_size_px', String(config.firmaSizePx || 60));
    if (typeof appDB !== 'undefined') {
        appDB.set('prof_logo_size_px', config.logoSizePx || 60);
        appDB.set('firma_size_px', config.firmaSizePx || 60);
    }
    if (typeof showToast === 'function') showToast('💾 Configuración PDF guardada', 'success');
}

window.loadPdfConfiguration = async function () {
    const config = (typeof appDB !== 'undefined' ? await appDB.get('pdf_config') : null)
        || window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
    window._pdfConfigCache = config;
    const set = (id, v) => { if (v !== undefined && v !== null) { const el = document.getElementById(id); if (el) el.value = v; } };
    const setChk = (id, v, def) => { const el = document.getElementById(id); if (el) el.checked = (v !== undefined) ? v : def; };

    set('pdfStudyType', config.studyType);
    set('pdfStudyDate', config.studyDate);
    set('pdfStudyTime', config.studyTime);
    set('pdfStudyReason', config.studyReason);
    set('pdfReferringDoctor', config.referringDoctor);
    set('pdfEquipment', config.equipment);
    set('pdfTechnique', config.technique);
    set('pdfPatientName', config.patientName);
    set('pdfPatientDni', config.patientDni);
    set('pdfPatientAge', config.patientAge);
    set('pdfPatientSex', config.patientSex);
    set('pdfPatientInsurance', config.patientInsurance);
    set('pdfPatientAffiliateNum', config.patientAffiliateNum);
    set('pdfPatientPhone', config.patientPhone);
    set('pdfPatientBirthdate', config.patientBirthdate);
    set('pdfPageSize', config.pageSize || 'a4');
    set('pdfOrientation', config.orientation || 'portrait');
    set('pdfMargins', config.margins || 'normal');
    set('pdfFont', config.font || 'helvetica');
    set('pdfFontSize', config.fontSize || '11');
    set('pdfLineSpacing', config.lineSpacing || '1.5');
    setChk('pdfShowHeader', config.showHeader, true);
    setChk('pdfShowFooter', config.showFooter, true);
    setChk('pdfShowPageNum', config.showPageNum, true);
    setChk('pdfShowDate', config.showDate, true);
    setChk('pdfShowQR', config.showQR, true);
    setChk('pdfShowSignLine', config.showSignLine, true);
    setChk('pdfShowSignName', config.showSignName, true);
    setChk('pdfShowSignMatricula', config.showSignMatricula, true);
    setChk('pdfShowSignImage', config.showSignImage, true);
    setChk('pdfShowPhone',     config.showPhone,  true);
    setChk('pdfShowEmail',     config.showEmail,  true);
    setChk('pdfShowSocial',    config.showSocial, false);
    // Sliders de tamaño
    const logoSlider = document.getElementById('pdfLogoSize');
    const firmaSlider = document.getElementById('pdfFirmaSize');
    const lsVal = config.logoSizePx || parseInt(localStorage.getItem('prof_logo_size_px') || '60');
    const fsVal = config.firmaSizePx || parseInt(localStorage.getItem('firma_size_px') || '60');
    if (logoSlider) { logoSlider.value = lsVal; const lbl = document.getElementById('logoSizeValue'); if (lbl) lbl.textContent = lsVal; }
    if (firmaSlider) { firmaSlider.value = fsVal; const lbl = document.getElementById('firmaSizeValue'); if (lbl) lbl.textContent = fsVal; }
    set('pdfFooterText', config.footerText);
    set('pdfWorkplace', config.selectedWorkplace);
    set('pdfWorkplaceAddress', config.workplaceAddress);
    set('pdfWorkplacePhone', config.workplacePhone);
    set('pdfWorkplaceEmail', config.workplaceEmail);

    // Restore logo preview
    const savedLogo = typeof appDB !== 'undefined' ? await appDB.get('pdf_logo') : localStorage.getItem('pdf_logo');
    if (savedLogo && savedLogo.startsWith('data:image/')) {
        const lp = document.getElementById('pdfLogoPreview');
        if (lp) lp.innerHTML = `<img src="${savedLogo}" alt="Logo" style="max-height:80px;">`;
    }
    const savedSig = typeof appDB !== 'undefined' ? await appDB.get('pdf_signature') : localStorage.getItem('pdf_signature');
    if (savedSig && savedSig.startsWith('data:image/')) {
        const sp = document.getElementById('pdfSignaturePreview');
        if (sp) sp.innerHTML = `<img src="${savedSig}" alt="Firma" style="max-height:80px;">`;
    }
};
