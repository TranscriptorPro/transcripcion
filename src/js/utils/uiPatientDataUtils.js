// ============ UI PATIENT DATA MODAL UTILS ============

window.initPatientDataModalHandlers = function () {
    const patientOverlay = document.getElementById('patientDataRequiredOverlay');
    const btnSavePatientData = document.getElementById('btnSavePatientData');
    const btnSkipPatientData = document.getElementById('btnSkipPatientData');
    const btnClosePatientModal = document.getElementById('btnClosePatientModal');

    const _cleanReferringDoctorName = (v) => String(v || '')
        .replace(/^\s*(?:dr\.?|dra\.?)\s+/i, '')
        .trim();

    window.openPatientDataModal = function () {
        const cfg = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
        // Clonar editor sin la caja de metadatos para no confundir la extracción
        let editorText = '';
        const editorEl = document.getElementById('editor');
        if (editorEl) {
            const clone = editorEl.cloneNode(true);
            clone.querySelectorAll('.patient-data-header, .patient-placeholder-banner').forEach(el => el.remove());
            editorText = clone.innerText || '';
        }
        const extracted = (typeof extractPatientDataFromText === 'function')
            ? extractPatientDataFromText(editorText)
            : {};
        const prefill = {
            reqPatientName: cfg.patientName || extracted.name || '',
            reqPatientDni: cfg.patientDni || extracted.dni || '',
            reqPatientAge: cfg.patientAge || extracted.age || '',
            reqPatientSex: cfg.patientSex || extracted.sex || '',
            reqPatientInsurance: cfg.patientInsurance || extracted.insurance || '',
            reqPatientAffiliateNum: cfg.patientAffiliateNum || extracted.affiliateNum || '',
            reqStudyDate: cfg.studyDate || extracted.studyDate || '',
            reqStudyTime: cfg.studyTime || extracted.studyTime || '',
            reqReferringDoctor: _cleanReferringDoctorName(cfg.referringDoctor || extracted.referringDoctor || ''),
            reqStudyReason: cfg.studyReason || extracted.studyReason || '',
            reqStudyType: cfg.studyType || extracted.studyType || '',
            reqPatientSearch: ''
        };
        Object.entries(prefill).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) { el.value = val; el.style.borderColor = ''; }
        });
        const showDateChk = document.getElementById('reqShowStudyDate');
        if (showDateChk) showDateChk.checked = cfg.showStudyDate !== false;
        const showTimeChk = document.getElementById('reqShowStudyTime');
        if (showTimeChk) showTimeChk.checked = cfg.showStudyTime !== false;

        // Default hora actual si está vacía
        const timeInput = document.getElementById('reqStudyTime');
        if (timeInput && !timeInput.value && !cfg.studyTime) {
            const now = new Date();
            timeInput.value = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
        }

        // Toggle visibilidad fecha/hora
        _applyToggleVisibility('reqShowStudyDate', 'reqStudyDate');
        _applyToggleVisibility('reqShowStudyTime', 'reqStudyTime');

        patientOverlay?.classList.add('active');
        if (typeof initPatientRegistrySearch === 'function') initPatientRegistrySearch();
        if (typeof initReferringDoctorSearch === 'function') initReferringDoctorSearch();
        if (typeof initStudyReasonSearch === 'function') initStudyReasonSearch();
    };

    function closePatientModal() {
        patientOverlay?.classList.remove('active');
    }

    if (btnClosePatientModal) btnClosePatientModal.addEventListener('click', closePatientModal);

    // Fallback robusto: si el header se re-renderiza, el botón ✏️ sigue abriendo el modal.
    if (!window._patientEditDelegationBound) {
        document.addEventListener('click', (ev) => {
            const btn = ev.target && ev.target.closest ? ev.target.closest('.patient-data-edit-btn') : null;
            if (!btn) return;
            ev.preventDefault();
            if (typeof window.openPatientDataModal === 'function') window.openPatientDataModal();
        });
        window._patientEditDelegationBound = true;
    }
    if (btnSkipPatientData) {
        btnSkipPatientData.addEventListener('click', () => {
            closePatientModal();
            if (typeof showToast === 'function') {
                showToast('Podés completar los datos del paciente luego desde el placeholder en el informe', 'info', 4000);
            }
        });
    }

    if (btnSavePatientData) {
        btnSavePatientData.addEventListener('click', () => {
            const name = document.getElementById('reqPatientName')?.value?.trim();

            const config = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
            if (name) config.patientName = name;
            else delete config.patientName;
            const dni = document.getElementById('reqPatientDni')?.value?.trim();
            const age = document.getElementById('reqPatientAge')?.value?.trim();
            const sex = document.getElementById('reqPatientSex')?.value;
            const insurance = document.getElementById('reqPatientInsurance')?.value?.trim();
            const affiliateNum = document.getElementById('reqPatientAffiliateNum')?.value?.trim();
            const showStudyDate = document.getElementById('reqShowStudyDate')?.checked !== false;
            const showStudyTime = document.getElementById('reqShowStudyTime')?.checked !== false;
            const studyDate = document.getElementById('reqStudyDate')?.value?.trim() || '';
            const studyTime = document.getElementById('reqStudyTime')?.value?.trim();
            const referringDoctor = _cleanReferringDoctorName(document.getElementById('reqReferringDoctor')?.value?.trim());
            const studyReason = document.getElementById('reqStudyReason')?.value?.trim();
            const studyType = document.getElementById('reqStudyType')?.value?.trim();

            if (dni) config.patientDni = dni;
            if (age) config.patientAge = age;
            if (sex) config.patientSex = sex;
            if (insurance) config.patientInsurance = insurance;
            if (affiliateNum) config.patientAffiliateNum = affiliateNum;
            config.showStudyDate = showStudyDate;
            config.showStudyTime = showStudyTime;
            if (showStudyDate && studyDate) config.studyDate = studyDate;
            else delete config.studyDate;
            if (showStudyTime && studyTime) config.studyTime = studyTime; else delete config.studyTime;
            if (referringDoctor) config.referringDoctor = referringDoctor; else delete config.referringDoctor;
            delete config.referringDoctorSex;
            if (studyReason) config.studyReason = studyReason; else delete config.studyReason;
            // Guardar en historiales para autocompletado futuro
            if (referringDoctor && typeof saveReferringDoctor === 'function') saveReferringDoctor(referringDoctor);
            if (studyReason && typeof saveStudyReason === 'function') saveStudyReason(studyReason);
            if (studyType) config.studyType = studyType; else delete config.studyType;

            window._pdfConfigCache = config;
            if (typeof appDB !== 'undefined') appDB.set('pdf_config', config);
            localStorage.setItem('pdf_config', JSON.stringify(config));

            patientOverlay?.classList.remove('active');
            if (typeof showToast === 'function') showToast('Datos del paciente guardados', 'success');

            window._insertPatientDataInEditor({
                name,
                dni,
                age,
                sex,
                insurance,
                affiliateNum,
                showStudyDate,
                studyDate,
                studyTime,
                referringDoctor,
                studyReason,
                studyType
            });
            if (typeof savePatientToRegistry === 'function') {
                savePatientToRegistry({ name, dni, age, sex, insurance, affiliateNum });
                if (typeof populatePatientDatalist === 'function') populatePatientDatalist();
            }
        });
    }

    window._insertPatientDataInEditor = function (data) {
        const editorEl = document.getElementById('editor');
        if (!editorEl) return;

        const esc = (v) => String(v ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const oldPlaceholder = editorEl.querySelector('.patient-placeholder-banner');
        if (oldPlaceholder) oldPlaceholder.remove();
        const oldHeader = editorEl.querySelector('.patient-data-header');
        if (oldHeader) oldHeader.remove();

        const lines = [];
        if (data.name) lines.push(`<strong>Paciente:</strong> ${esc(data.name)}`);
        if (data.dni) lines.push(`<strong>DNI:</strong> ${esc(data.dni)}`);
        if (data.age) lines.push(`<strong>Edad:</strong> ${esc(data.age)} años`);
        if (data.sex) lines.push(`<strong>Sexo:</strong> ${esc(data.sex)}`);
        if (data.weight) lines.push(`<strong>Peso:</strong> ${esc(data.weight)} kg`);
        if (data.height) lines.push(`<strong>Altura:</strong> ${esc(data.height)}`);
        if (data.insurance) lines.push(`<strong>Obra Social:</strong> ${esc(data.insurance)}`);
        if (data.affiliateNum) lines.push(`<strong>Nº Afiliado:</strong> ${esc(data.affiliateNum)}`);

        const studyLines = [];
        if (data.showStudyDate !== false && data.studyDate) {
            const dateForDisplay = new Date(data.studyDate + 'T12:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            studyLines.push(`<strong>Fecha:</strong> ${esc(dateForDisplay)}${data.studyTime ? ' ' + esc(data.studyTime) + ' hs.' : ''}`);
        }
        if (data.studyType) studyLines.push(`<strong>Estudio:</strong> ${esc(data.studyType)}`);
        if (data.referringDoctor) studyLines.push(`<strong>Médico solicitante:</strong> ${esc(data.referringDoctor)}`);
        if (data.studyReason) studyLines.push(`<strong>Motivo:</strong> ${esc(data.studyReason)}`);

        if (lines.length === 0 && studyLines.length === 0) return;

        const header = document.createElement('div');
        header.className = 'patient-data-header';
        header.setAttribute('contenteditable', 'false');
        const patientHtml = lines.length ? `<div class="patient-data-content">${lines.join(' &nbsp;·&nbsp; ')}</div>` : '';
        const studyHtml = studyLines.length ? `<div class="patient-data-content study-data-content">${studyLines.join(' &nbsp;·&nbsp; ')}</div>` : '';
        header.innerHTML = `<div class="patient-data-title">📋 Datos del Paciente y Estudio</div>${patientHtml}${studyHtml}<button class="patient-data-edit-btn" title="Editar datos del paciente y estudio">✏️</button>`;
        header.querySelector('.patient-data-edit-btn')?.addEventListener('click', () => {
            if (typeof window.openPatientDataModal === 'function') window.openPatientDataModal();
        });
        editorEl.insertBefore(header, editorEl.firstChild);

        const btnR = document.getElementById('btnRestoreOriginal');
        if (btnR && btnR._showingOriginal && window._lastStructuredHTML) {
            const temp = document.createElement('div');
            temp.innerHTML = window._lastStructuredHTML;
            const oldH = temp.querySelector('.patient-data-header');
            if (oldH) oldH.remove();
            const oldP = temp.querySelector('.patient-placeholder-banner');
            if (oldP) oldP.remove();
            const patientHTML = lines.length ? `<div class="patient-data-content">${lines.join(' &nbsp;·&nbsp; ')}</div>` : '';
            const studyHTML = studyLines.length ? `<div class="patient-data-content study-data-content">${studyLines.join(' &nbsp;·&nbsp; ')}</div>` : '';
            const headerHTML = `<div class="patient-data-header" contenteditable="false"><div class="patient-data-title">📋 Datos del Paciente y Estudio</div>${patientHTML}${studyHTML}<button class="patient-data-edit-btn" title="Editar datos del paciente y estudio">✏️</button></div>`;
            temp.insertAdjacentHTML('afterbegin', headerHTML);
            window._lastStructuredHTML = temp.innerHTML;
        }
    };

    window._refreshPatientHeader = function () {
        const cfg = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
        const hasAnyPatientData = !!(
            cfg.patientName || cfg.patientDni || cfg.patientAge || cfg.patientSex ||
            cfg.patientWeight || cfg.patientHeight || cfg.patientInsurance || cfg.patientAffiliateNum ||
            cfg.studyDate || cfg.studyTime || cfg.referringDoctor || cfg.studyReason || cfg.studyType
        );
        if (hasAnyPatientData) {
            window._insertPatientDataInEditor({
                name: cfg.patientName,
                dni: cfg.patientDni,
                age: cfg.patientAge,
                sex: cfg.patientSex,
                weight: cfg.patientWeight,
                height: cfg.patientHeight,
                insurance: cfg.patientInsurance,
                affiliateNum: cfg.patientAffiliateNum,
                showStudyDate: cfg.showStudyDate,
                studyDate: cfg.studyDate,
                studyTime: cfg.studyTime,
                referringDoctor: cfg.referringDoctor,
                studyReason: cfg.studyReason,
                studyType: cfg.studyType
            });
        } else if (typeof insertPatientPlaceholder === 'function') {
            insertPatientPlaceholder();
        }
        if (typeof window._insertInlineAppendBtn === 'function') window._insertInlineAppendBtn();
    };

    // ── Toggle visibilidad de campos fecha/hora ──
    function _applyToggleVisibility(checkId, inputId) {
        const chk = document.getElementById(checkId);
        const inp = document.getElementById(inputId);
        if (!chk || !inp) return;
        const wrap = inp.closest('.field-group') || inp.parentElement;
        const container = inputId === 'reqStudyDate' ? inp.parentElement : inp; // date has wrapper div with Hoy btn
        const target = inputId === 'reqStudyDate' ? wrap : wrap;
        function applyVis() {
            if (inputId === 'reqStudyDate') {
                const row = inp.closest('div[style*="display:flex"]');
                if (row) row.style.opacity = chk.checked ? '1' : '0.4';
            }
            inp.disabled = !chk.checked;
        }
        applyVis();
        chk.addEventListener('change', applyVis);
    }

    // ── Botón "Hoy" para fecha ──
    const btnToday = document.getElementById('btnStudyDateToday');
    if (btnToday) {
        btnToday.addEventListener('click', () => {
            const dateInput = document.getElementById('reqStudyDate');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
                dateInput.dispatchEvent(new Event('change'));
            }
        });
    }

    // ── Toggle listeners para fecha y hora ──
    document.getElementById('reqShowStudyDate')?.addEventListener('change', () => {
        _applyToggleVisibility('reqShowStudyDate', 'reqStudyDate');
    });
    document.getElementById('reqShowStudyTime')?.addEventListener('change', () => {
        _applyToggleVisibility('reqShowStudyTime', 'reqStudyTime');
    });

    // Limpiar borde de validación al escribir en nombre de paciente
    document.getElementById('reqPatientName')?.addEventListener('input', (e) => {
        e.target.style.borderColor = '';
    });
};
