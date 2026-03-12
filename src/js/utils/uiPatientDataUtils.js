// ============ UI PATIENT DATA MODAL UTILS ============

window.initPatientDataModalHandlers = function () {
    const patientOverlay = document.getElementById('patientDataRequiredOverlay');
    const btnSavePatientData = document.getElementById('btnSavePatientData');
    const btnSkipPatientData = document.getElementById('btnSkipPatientData');
    const btnClosePatientModal = document.getElementById('btnClosePatientModal');

    window.openPatientDataModal = function () {
        const cfg = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
        const extracted = (typeof extractPatientDataFromText === 'function')
            ? extractPatientDataFromText((document.getElementById('editor')?.innerText || ''))
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
            reqReferringDoctor: cfg.referringDoctor || extracted.referringDoctor || '',
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

            const config = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
            if (name) config.patientName = name;
            else delete config.patientName;
            const dni = document.getElementById('reqPatientDni')?.value?.trim();
            const age = document.getElementById('reqPatientAge')?.value?.trim();
            const sex = document.getElementById('reqPatientSex')?.value;
            const insurance = document.getElementById('reqPatientInsurance')?.value?.trim();
            const affiliateNum = document.getElementById('reqPatientAffiliateNum')?.value?.trim();
            const showStudyDate = document.getElementById('reqShowStudyDate')?.checked !== false;
            const studyDate = document.getElementById('reqStudyDate')?.value?.trim() || '';
            const studyTime = document.getElementById('reqStudyTime')?.value?.trim();
            const referringDoctor = document.getElementById('reqReferringDoctor')?.value?.trim();
            const studyReason = document.getElementById('reqStudyReason')?.value?.trim();
            const studyType = document.getElementById('reqStudyType')?.value?.trim();

            if (dni) config.patientDni = dni;
            if (age) config.patientAge = age;
            if (sex) config.patientSex = sex;
            if (insurance) config.patientInsurance = insurance;
            if (affiliateNum) config.patientAffiliateNum = affiliateNum;
            config.showStudyDate = showStudyDate;
            if (showStudyDate && studyDate) config.studyDate = studyDate;
            else delete config.studyDate;
            if (studyTime) config.studyTime = studyTime; else delete config.studyTime;
            if (referringDoctor) config.referringDoctor = referringDoctor; else delete config.referringDoctor;
            if (studyReason) config.studyReason = studyReason; else delete config.studyReason;
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

        const oldPlaceholder = editorEl.querySelector('.patient-placeholder-banner');
        if (oldPlaceholder) oldPlaceholder.remove();
        const oldHeader = editorEl.querySelector('.patient-data-header');
        if (oldHeader) oldHeader.remove();

        const lines = [];
        if (data.name) lines.push(`<strong>Paciente:</strong> ${data.name}`);
        if (data.dni) lines.push(`<strong>DNI:</strong> ${data.dni}`);
        if (data.age) lines.push(`<strong>Edad:</strong> ${data.age} años`);
        if (data.sex) lines.push(`<strong>Sexo:</strong> ${data.sex}`);
        if (data.weight) lines.push(`<strong>Peso:</strong> ${data.weight} kg`);
        if (data.height) lines.push(`<strong>Altura:</strong> ${data.height}`);
        if (data.insurance) lines.push(`<strong>Obra Social:</strong> ${data.insurance}`);
        if (data.affiliateNum) lines.push(`<strong>Nº Afiliado:</strong> ${data.affiliateNum}`);

        const studyLines = [];
        if (data.showStudyDate !== false && data.studyDate) {
            const dateForDisplay = new Date(data.studyDate + 'T12:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            studyLines.push(`<strong>Fecha:</strong> ${dateForDisplay}${data.studyTime ? ' ' + data.studyTime : ''}`);
        }
        if (data.studyType) studyLines.push(`<strong>Estudio:</strong> ${data.studyType}`);
        if (data.referringDoctor) studyLines.push(`<strong>Médico solicitante:</strong> ${data.referringDoctor}`);
        if (data.studyReason) studyLines.push(`<strong>Motivo:</strong> ${data.studyReason}`);

        if (lines.length === 0 && studyLines.length === 0) return;

        const header = document.createElement('div');
        header.className = 'patient-data-header';
        header.setAttribute('contenteditable', 'false');
        const patientHtml = lines.length ? `<div class="patient-data-content">${lines.join(' &nbsp;·&nbsp; ')}</div>` : '';
        const studyHtml = studyLines.length ? `<div class="patient-data-content study-data-content">${studyLines.join(' &nbsp;·&nbsp; ')}</div>` : '';
        header.innerHTML = `${patientHtml}${studyHtml}<button class="patient-data-edit-btn" title="Editar datos del paciente y estudio">✏️</button>`;
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
            const patientHTML = lines.length ? `<div class="patient-data-content">${lines.join(' &nbsp;·&nbsp; ')}</div>` : '';
            const studyHTML = studyLines.length ? `<div class="patient-data-content study-data-content">${studyLines.join(' &nbsp;·&nbsp; ')}</div>` : '';
            const headerHTML = `<div class="patient-data-header" contenteditable="false">${patientHTML}${studyHTML}<button class="patient-data-edit-btn" title="Editar datos del paciente y estudio">✏️</button></div>`;
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

    // ── Autocomplete en el campo Nombre y Apellido ──
    (function _initNameFieldAutocomplete() {
        const nameInput = document.getElementById('reqPatientName');
        if (!nameInput) return;

        nameInput.addEventListener('input', (e) => {
            e.target.style.borderColor = '';
        });

        // Crear dropdown personalizado para el campo nombre
        let nameDropdown = document.getElementById('patientNameAutocompleteDropdown');
        if (!nameDropdown) {
            nameDropdown = document.createElement('div');
            nameDropdown.id = 'patientNameAutocompleteDropdown';
            Object.assign(nameDropdown.style, {
                position: 'absolute', zIndex: '9999',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                maxHeight: '220px', overflowY: 'auto',
                width: '100%', display: 'none', marginTop: '2px'
            });
            const wrap = nameInput.parentElement;
            if (wrap) { wrap.style.position = 'relative'; wrap.appendChild(nameDropdown); }
        }

        function hideNameDropdown() { nameDropdown.style.display = 'none'; }

        function showNameResults(results) {
            if (!results.length) { hideNameDropdown(); return; }
            const esc = typeof escapeHtml === 'function' ? escapeHtml : (s => (s||"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"));
            nameDropdown.innerHTML = results.map((p, i) => {
                const label = esc(p.name) + (p.dni ? ` — DNI ${esc(p.dni)}` : '') + (p.age ? `, ${esc(String(p.age))}a` : '');
                return `<div data-idx="${i}" style="padding:0.5rem 0.85rem;cursor:pointer;font-size:0.82rem;border-bottom:1px solid var(--border);"
                    onmouseenter="this.style.background='var(--bg-hover,#2a2a2a)'"
                    onmouseleave="this.style.background=''">${label}</div>`;
            }).join('');
            nameDropdown.style.display = 'block';

            nameDropdown.querySelectorAll('[data-idx]').forEach(el => {
                el.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const p = results[parseInt(el.dataset.idx)];
                    const setVal = (id, v) => { const el2 = document.getElementById(id); if (el2 && v != null) el2.value = v; };
                    setVal('reqPatientName',        p.name);
                    setVal('reqPatientDni',         p.dni);
                    setVal('reqPatientAge',         p.age);
                    setVal('reqPatientInsurance',   p.insurance);
                    setVal('reqPatientAffiliateNum',p.affiliateNum);
                    setVal('reqPatientSearch',      p.name + (p.dni ? ` — DNI ${p.dni}` : ''));
                    const sexEl = document.getElementById('reqPatientSex');
                    if (sexEl && p.sex) sexEl.value = p.sex;
                    hideNameDropdown();
                    if (typeof showToast === 'function') showToast(`✅ ${p.name}`, 'success');
                });
            });
        }

        let nameDebounce;
        nameInput.addEventListener('input', () => {
            clearTimeout(nameDebounce);
            const query = nameInput.value.trim();
            if (query.length < 2) { hideNameDropdown(); return; }
            nameDebounce = setTimeout(() => {
                const results = (typeof searchPatientRegistry === 'function')
                    ? searchPatientRegistry(query) : [];
                showNameResults(results);
            }, 120);
        });

        nameInput.addEventListener('blur', () => {
            setTimeout(hideNameDropdown, 200);
        });

        document.addEventListener('click', (e) => {
            if (!nameInput.contains(e.target) && !nameDropdown.contains(e.target)) hideNameDropdown();
        });
    })();
};
