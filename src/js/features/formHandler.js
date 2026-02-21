// ============ FORM & PATIENT DATA HANDLER ============

// ---- Patient History ----
const MAX_PATIENT_HISTORY = 50;
window.patientHistory = JSON.parse(localStorage.getItem('patient_history') || '[]');

window.savePatientToHistory = function (patient) {
    if (!patient || !patient.name) return;
    window.patientHistory = window.patientHistory.filter(p => !(patient.dni && p.dni === patient.dni));
    window.patientHistory.unshift(patient);
    if (window.patientHistory.length > MAX_PATIENT_HISTORY) window.patientHistory.pop();
    localStorage.setItem('patient_history', JSON.stringify(window.patientHistory));
}

window.populatePatientDatalist = function () {
    const datalist = document.getElementById('patientHistoryList');
    if (!datalist) return;
    datalist.innerHTML = '';
    window.patientHistory.forEach((p, i) => {
        const option = document.createElement('option');
        option.value = p.dni ? `${p.name} - DNI: ${p.dni}` : p.name;
        option.dataset.index = i;
        datalist.appendChild(option);
    });
}

// Initial binding for patient search
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('patientSearch')?.addEventListener('input', (e) => {
        const val = e.target.value;
        const selected = window.patientHistory.find(p =>
            (p.dni && val.includes(p.dni)) || (p.name && val.includes(p.name))
        );
        if (selected) {
            const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
            set('pdfPatientName', selected.name);
            set('pdfPatientDni', selected.dni);
            set('pdfPatientAge', selected.age);
            set('pdfPatientSex', selected.sex);
            set('pdfPatientInsurance', selected.insurance);
            set('pdfPatientPhone', selected.phone);
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
const DNI_REGEX = /(?:DNI|documento|D\.N\.I\.?)\s*(?:N[°º]?\s*)?(\d{1,3}\.?\d{3}\.?\d{3})/i;
const AGE_REGEX = /(\d{1,3})\s*años/i;
const SEX_REGEX = /(?:sexo|género)\s*(?::|,)?\s*(masculino|femenino|masc|fem)/i;

window.extractPatientDataFromText = function (text) {
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
window.generateReportNumber = function () {
    const year = new Date().getFullYear();
    let counter = parseInt(localStorage.getItem('report_counter_' + year) || '0');
    counter++;
    localStorage.setItem('report_counter_' + year, counter);
    return `${year}-${String(counter).padStart(4, '0')}`;
}

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
            try {
                localStorage.setItem(storageKey, dataUrl);
            } catch (storageErr) {
                console.error('Storage error:', storageErr);
                if (typeof showToast === 'function') showToast('No se pudo guardar la imagen (almacenamiento lleno)', 'error');
            }
        };
        reader.readAsDataURL(file);
    });
}

// ---- Save/Load configuration ----
window.savePdfConfiguration = function () {
    const val = (id) => document.getElementById(id)?.value || '';
    const chk = (id, def) => document.getElementById(id)?.checked ?? def;
    const config = {
        studyType: val('pdfStudyType'),
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
        showDate: chk('pdfShowDate', false),
        showQR: chk('pdfShowQR', false),
        showSignLine: chk('pdfShowSignLine', true),
        showSignName: chk('pdfShowSignName', true),
        showSignMatricula: chk('pdfShowSignMatricula', true),
        footerText: val('pdfFooterText'),
        selectedWorkplace: val('pdfWorkplace'),
        workplaceAddress: val('pdfWorkplaceAddress'),
        workplacePhone: val('pdfWorkplacePhone'),
        workplaceEmail: val('pdfWorkplaceEmail')
    };
    localStorage.setItem('pdf_config', JSON.stringify(config));
    if (typeof showToast === 'function') showToast('💾 Configuración PDF guardada', 'success');
}

window.loadPdfConfiguration = function () {
    const config = JSON.parse(localStorage.getItem('pdf_config') || '{}');
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
    setChk('pdfShowDate', config.showDate, false);
    setChk('pdfShowQR', config.showQR, false);
    setChk('pdfShowSignLine', config.showSignLine, true);
    setChk('pdfShowSignName', config.showSignName, true);
    setChk('pdfShowSignMatricula', config.showSignMatricula, true);
    set('pdfFooterText', config.footerText);
    set('pdfWorkplace', config.selectedWorkplace);
    set('pdfWorkplaceAddress', config.workplaceAddress);
    set('pdfWorkplacePhone', config.workplacePhone);
    set('pdfWorkplaceEmail', config.workplaceEmail);

    // Restore logo preview
    const savedLogo = localStorage.getItem('pdf_logo');
    if (savedLogo && savedLogo.startsWith('data:image/')) {
        const lp = document.getElementById('pdfLogoPreview');
        if (lp) lp.innerHTML = `<img src="${savedLogo}" alt="Logo" style="max-height:80px;">`;
    }
    const savedSig = localStorage.getItem('pdf_signature');
    if (savedSig && savedSig.startsWith('data:image/')) {
        const sp = document.getElementById('pdfSignaturePreview');
        if (sp) sp.innerHTML = `<img src="${savedSig}" alt="Firma" style="max-height:80px;">`;
    }
}
