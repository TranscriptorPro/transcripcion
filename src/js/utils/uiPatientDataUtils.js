// ============ UI PATIENT DATA MODAL UTILS ============

window.initPatientDataModalHandlers = function () {
    const patientOverlay = document.getElementById('patientDataRequiredOverlay');
    const btnSavePatientData = document.getElementById('btnSavePatientData');
    const btnSkipPatientData = document.getElementById('btnSkipPatientData');
    const btnClosePatientModal = document.getElementById('btnClosePatientModal');

    window.openPatientDataModal = function () {
        const cfg = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
        const prefill = {
            reqPatientName: cfg.patientName || '',
            reqPatientDni: cfg.patientDni || '',
            reqPatientAge: cfg.patientAge || '',
            reqPatientSex: cfg.patientSex || '',
            reqPatientInsurance: cfg.patientInsurance || '',
            reqPatientAffiliateNum: cfg.patientAffiliateNum || '',
            reqPatientSearch: ''
        };
        Object.entries(prefill).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) { el.value = val; el.style.borderColor = ''; }
        });
        patientOverlay?.classList.add('active');
        if (typeof initPatientRegistrySearch === 'function') initPatientRegistrySearch();
    };

    function closePatientModal() {
        patientOverlay?.classList.remove('active');
    }

    if (btnClosePatientModal) btnClosePatientModal.addEventListener('click', closePatientModal);
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
            if (!name) {
                if (typeof showToast === 'function') showToast('El nombre del paciente es obligatorio', 'error');
                const nameEl = document.getElementById('reqPatientName');
                if (nameEl) { nameEl.style.borderColor = '#dc2626'; nameEl.focus(); }
                return;
            }

            const config = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
            config.patientName = name;
            const dni = document.getElementById('reqPatientDni')?.value?.trim();
            const age = document.getElementById('reqPatientAge')?.value?.trim();
            const sex = document.getElementById('reqPatientSex')?.value;
            const insurance = document.getElementById('reqPatientInsurance')?.value?.trim();
            const affiliateNum = document.getElementById('reqPatientAffiliateNum')?.value?.trim();

            if (dni) config.patientDni = dni;
            if (age) config.patientAge = age;
            if (sex) config.patientSex = sex;
            if (insurance) config.patientInsurance = insurance;
            if (affiliateNum) config.patientAffiliateNum = affiliateNum;

            window._pdfConfigCache = config;
            if (typeof appDB !== 'undefined') appDB.set('pdf_config', config);
            localStorage.setItem('pdf_config', JSON.stringify(config));

            patientOverlay?.classList.remove('active');
            if (typeof showToast === 'function') showToast('Datos del paciente guardados', 'success');

            window._insertPatientDataInEditor({ name, dni, age, sex, insurance, affiliateNum });
            if (typeof savePatientToRegistry === 'function') {
                savePatientToRegistry({ name, dni, age, sex, insurance, affiliateNum });
                if (typeof populatePatientDatalist === 'function') populatePatientDatalist();
            }
        });
    }

    window._insertPatientDataInEditor = function (data) {
        const editorEl = document.getElementById('editor');
        if (!editorEl) return;

        const oldPlaceholder = editorEl.querySelector('.patient-placeholder-banner');
        if (oldPlaceholder) oldPlaceholder.remove();
        const oldHeader = editorEl.querySelector('.patient-data-header');
        if (oldHeader) oldHeader.remove();

        const lines = [];
        if (data.name) lines.push(`<strong>Paciente:</strong> ${data.name}`);
        if (data.dni) lines.push(`<strong>DNI:</strong> ${data.dni}`);
        if (data.age) lines.push(`<strong>Edad:</strong> ${data.age} años`);
        if (data.sex) lines.push(`<strong>Sexo:</strong> ${data.sex}`);
        if (data.insurance) lines.push(`<strong>Obra Social:</strong> ${data.insurance}`);
        if (data.affiliateNum) lines.push(`<strong>Nº Afiliado:</strong> ${data.affiliateNum}`);
        if (lines.length === 0) return;

        const header = document.createElement('div');
        header.className = 'patient-data-header';
        header.setAttribute('contenteditable', 'false');
        header.innerHTML = `<div class="patient-data-content">${lines.join(' &nbsp;·&nbsp; ')}</div>`
            + `<button class="patient-data-edit-btn" title="Editar datos del paciente">✏️</button>`;
        header.querySelector('.patient-data-edit-btn').addEventListener('click', () => {
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
            const headerHTML = `<div class="patient-data-header" contenteditable="false"><div class="patient-data-content">${lines.join(' &nbsp;·&nbsp; ')}</div><button class="patient-data-edit-btn" title="Editar datos del paciente">✏️</button></div>`;
            temp.insertAdjacentHTML('afterbegin', headerHTML);
            window._lastStructuredHTML = temp.innerHTML;
        }
    };

    window._refreshPatientHeader = function () {
        const cfg = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
        if (cfg.patientName) {
            window._insertPatientDataInEditor({
                name: cfg.patientName,
                dni: cfg.patientDni,
                age: cfg.patientAge,
                sex: cfg.patientSex,
                insurance: cfg.patientInsurance,
                affiliateNum: cfg.patientAffiliateNum
            });
        } else if (typeof insertPatientPlaceholder === 'function') {
            insertPatientPlaceholder();
        }
        if (typeof window._insertInlineAppendBtn === 'function') window._insertInlineAppendBtn();
    };

    document.getElementById('reqPatientName')?.addEventListener('input', (e) => {
        e.target.style.borderColor = '';
    });
};
