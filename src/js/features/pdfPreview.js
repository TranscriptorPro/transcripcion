// ============ PDF MODAL & PRINT PREVIEW HANDLER ============

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

    set('pdfProfName', profData.nombre);
    set('pdfProfMatricula', profData.matricula);
    const specs = Array.isArray(profData.specialties) ? profData.specialties.join(' / ') : (profData.especialidad || '');
    set('pdfProfEspecialidad', specs);

    if (typeof isAdminUser === 'function' && isAdminUser()) {
        const fields = ['pdfProfName', 'pdfProfMatricula', 'pdfProfEspecialidad'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.readOnly = false;
                el.disabled = false;
                el.style.backgroundColor = '';
                el.closest('.field-group')?.classList.remove('locked');
            }
        });
    }

    if (window.currentMode === 'pro' && window.selectedTemplate && window.MEDICAL_TEMPLATES?.[window.selectedTemplate]) {
        const studyTypeEl = document.getElementById('pdfStudyType');
        if (studyTypeEl && !studyTypeEl.value) {
            studyTypeEl.value = window.MEDICAL_TEMPLATES[window.selectedTemplate].name || '';
        }
    }

    if (window.currentMode === 'pro' && window.editor && window.editor.innerText.trim().length > 0) {
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

    const studyTimeEl = document.getElementById('pdfStudyTime');
    if (studyTimeEl && !studyTimeEl.value) {
        const now = new Date();
        studyTimeEl.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    updatePdfModalByMode();
    if (typeof populateWorkplaceDropdown === 'function') populateWorkplaceDropdown();
    if (typeof populatePatientDatalist === 'function') populatePatientDatalist();

    document.getElementById('pdfModalOverlay')?.classList.add('active');
}

window.openPrintPreview = function () {
    const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
    const config = JSON.parse(localStorage.getItem('pdf_config') || '{}');
    const esc = (text) => {
        if (!text) return '';
        return text.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const profName = esc(profData.nombre) || 'Dr. [Nombre]';
    const matricula = esc(profData.matricula) || '';
    const especialidad = esc(
        Array.isArray(profData.specialties) ? profData.specialties.join(' / ') : (profData.especialidad || '')
    );

    const patientName = esc(config.patientName) || '';
    const patientDni = esc(config.patientDni) || '';
    const patientAge = esc(config.patientAge) || '';
    const patientSex = config.patientSex === 'M' ? 'Masculino' : config.patientSex === 'F' ? 'Femenino' : (esc(config.patientSex) || '');
    const patientInsurance = esc(config.patientInsurance) || '';

    const studyType = esc(config.studyType) || '';
    const studyDate = esc(config.studyDate) || '';
    const studyReason = esc(config.studyReason) || '';
    const referringDoctor = esc(config.referringDoctor) || '';
    const footerText = esc(config.footerText) || '';
    const workplaceAddress = esc(config.workplaceAddress) || '';
    const workplacePhone = esc(config.workplacePhone) || '';
    const reportNum = document.getElementById('pdfReportNumber')?.value || '';

    const headerEl = document.getElementById('previewHeader');
    if (headerEl) {
        const logoSrc = localStorage.getItem('pdf_logo');
        const logoHtml = (logoSrc && logoSrc.startsWith('data:image/')) ? `<img src="${logoSrc}" style="max-height:60px; float:right;" alt="Logo">` : '';
        headerEl.innerHTML = `
            ${logoHtml}
            <h2 style="margin:0 0 4px 0; font-size:16pt;">${profName}</h2>
            <p style="margin:2px 0; font-size:10pt; color:#555;">${matricula}${especialidad ? ' &bull; ' + especialidad : ''}</p>
            ${workplaceAddress ? `<p style="margin:2px 0; font-size:9pt; color:#666;">📍 ${workplaceAddress}${workplacePhone ? ' &bull; 📞 ' + workplacePhone : ''}</p>` : ''}
        `;
    }

    const patientEl = document.getElementById('previewPatient');
    if (patientEl) {
        const rows = [];
        if (patientName) rows.push(`<strong>Paciente:</strong> ${patientName}`);
        if (patientDni) rows.push(`<strong>DNI:</strong> ${patientDni}`);
        if (patientAge) rows.push(`<strong>Edad:</strong> ${patientAge} años`);
        if (patientSex) rows.push(`<strong>Sexo:</strong> ${patientSex}`);
        if (patientInsurance) rows.push(`<strong>Obra Social:</strong> ${patientInsurance}`);
        patientEl.innerHTML = rows.length ? rows.map(r => `<p style="margin:3px 0;">${r}</p>`).join('') : '<p style="color:#999; margin:0;">Sin datos del paciente</p>';
    }

    const studyEl = document.getElementById('previewStudy');
    if (studyEl) {
        const rows = [];
        if (studyType) rows.push(`<strong>Estudio:</strong> ${studyType}`);
        if (studyDate) rows.push(`<strong>Fecha:</strong> ${studyDate}`);
        if (studyReason) rows.push(`<strong>Motivo:</strong> ${studyReason}`);
        if (referringDoctor) rows.push(`<strong>Médico solicitante:</strong> ${referringDoctor}`);
        if (reportNum) rows.push(`<strong>Informe Nº:</strong> ${esc(reportNum)}`);
        studyEl.innerHTML = rows.map(r => `<p style="margin:3px 0;">${r}</p>`).join('');
    }

    const contentEl = document.getElementById('previewContent');
    if (contentEl) {
        contentEl.innerHTML = window.editor ? window.editor.innerHTML : '';
    }

    const sigEl = document.getElementById('previewSignature');
    const showSignLine = config.showSignLine ?? true;
    const showSignName = config.showSignName ?? true;
    const showSignMatricula = config.showSignMatricula ?? true;
    if (sigEl) {
        const sigSrc = localStorage.getItem('pdf_signature');
        const validSig = sigSrc && sigSrc.startsWith('data:image/') ? sigSrc : null;
        let sigHtml = '';
        if (validSig) sigHtml += `<img src="${validSig}" style="max-height:60px; display:block; margin-bottom:4px;" alt="Firma">`;
        if (showSignLine) sigHtml += `<div style="border-top:1px solid #333; width:200px; margin-top:${validSig ? '0' : '40px'};"></div>`;
        if (showSignName) sigHtml += `<p style="margin:4px 0 2px 0; font-size:10pt;">${profName}</p>`;
        if (showSignMatricula && matricula) sigHtml += `<p style="margin:0; font-size:9pt; color:#555;">${matricula}</p>`;
        sigEl.innerHTML = sigHtml;
    }

    const footerEl = document.getElementById('previewFooter');
    if (footerEl) {
        let footerHtml = '';
        if (footerText) footerHtml += `<p>${footerText}</p>`;
        if (config.showDate) footerHtml += `<p>Impreso: ${new Date().toLocaleDateString('es-ES')}</p>`;
        footerEl.innerHTML = footerHtml;
        footerEl.style.display = footerHtml ? 'block' : 'none';
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
    document.getElementById('pdfWorkplace')?.addEventListener('change', (e) => {
        const idx = e.target.value;
        if (idx === "") return;
        const wp = window.workplaceProfiles[idx];
        if (wp) {
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
            set('pdfWorkplaceAddress', wp.address);
            set('pdfWorkplacePhone', wp.phone);
            set('pdfWorkplaceEmail', wp.email);
            set('pdfFooterText', wp.footer);
            // apply logo if exists
            if (wp.logo) {
                localStorage.setItem('pdf_logo', wp.logo);
                const lp = document.getElementById('pdfLogoPreview');
                if (lp) lp.innerHTML = `<img src="${wp.logo}" alt="Logo" style="max-height:80px;">`;
            }
        }
    });
});
