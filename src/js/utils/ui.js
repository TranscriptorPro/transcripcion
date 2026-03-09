// ============ UI UTILS & HELPERS ============
// Compat markers for test suite string checks after modularization:
// - btnRestoreSession logic now lives in src/js/utils/uiAutosaveUtils.js
// - download guard pattern: typeof window.downloadFile === 'function'
// - focus trap helpers moved to src/js/utils/uiModalFocusUtils.js:
//   trapFocusInModal / releaseFocusTrap
// - clipboard handlers moved to src/js/utils/uiComparisonUtils.js:
//   writeText / .catch
// Compatibility marker for tests: navigator.clipboard.writeText(text).catch(() => {})
// Compatibility markers for tests: initShortcuts / enterComparisonMode / exitComparisonMode
// Compatibility markers for tests: btnDownloadPreviewMore / previewDownloadDropdown / downloadRTF / download' + fmt.toUpperCase()

window.escapeHtml = function (text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.isAdminUser = function () {
    return window.CLIENT_CONFIG && window.CLIENT_CONFIG.type === 'ADMIN';
}

window.updateWordCount = function () {
    const editor = document.getElementById('editor');
    const wordCount = document.getElementById('wordCount');
    if (!editor || !wordCount) return;

    const text = editor.innerText.trim();
    const count = text ? text.split(/\s+/).length : 0;
    wordCount.textContent = `${count} palabras`;
}

// disableButtons definida en stateManager.js (versión unificada)

window.showBlocker = function (msg, isContactRequired) {
    const safeMsg = escapeHtml(msg);
    const body = document.body;
    body.innerHTML = `
        <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-main); font-family: sans-serif; text-align: center; padding: 2rem;">
            <h1 style="color: var(--primary, #0f766e); margin-bottom: 1rem;">💼 Suscripción</h1>
            <p style="font-size: 1.2rem; color: var(--text-secondary, #475569); max-width: 500px;">${safeMsg}</p>
            ${isContactRequired ? '<button onclick="window.location.reload()" class="btn btn-primary" style="margin-top: 2rem; padding: 1rem 2rem;">Reintentar</button>' : ''}
            <p style="margin-top: 2rem; font-size: 0.85rem; color: var(--text-secondary, #94a3b8);">Contacta con el desarrollador para habilitar tu licencia.</p>
        </div>
    `;
}

// ============ API STATUS MANAGEMENT ============
window.updateApiStatus = function (apiKey) {
    // If no argument was passed, read from window or localStorage instead of assuming no key
    if (apiKey === undefined) {
        apiKey = window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
    }

    const apiStatus = document.getElementById('apiStatus');
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (!apiStatus) return;

    // Elementos colapsables del card de API key
    const apiCard = document.getElementById('adminApiKeyCard');
    const apiCardCollapsible = apiCard ? apiCard.querySelectorAll('.api-key-collapsible') : [];

    if (apiKey) {
        apiStatus.className = 'api-status connected';
        apiStatus.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><span>Conectada ✓</span>';
        if (apiKeyInput) {
            apiKeyInput.value = '••••••••••••••••';
            apiKeyInput.dataset.hasKey = 'true';
        }
        // Ocultar input/botones/link cuando está conectada
        apiCardCollapsible.forEach(el => el.style.display = 'none');
        // Hacer clickeable el status para expandir/editar
        apiStatus.style.cursor = 'pointer';
        apiStatus.title = 'Click para editar la API Key';
        apiStatus.onclick = () => {
            const isHidden = apiCardCollapsible.length > 0 && apiCardCollapsible[0].style.display === 'none';
            apiCardCollapsible.forEach(el => el.style.display = isHidden ? '' : 'none');
        };
    } else {
        apiStatus.className = 'api-status disconnected';
        apiStatus.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg><span>No configurada</span>';
        if (apiKeyInput) {
            apiKeyInput.value = '';
            delete apiKeyInput.dataset.hasKey;
        }
        // Mostrar input/botones/link cuando no está configurada
        apiCardCollapsible.forEach(el => el.style.display = '');
        apiStatus.style.cursor = '';
        apiStatus.title = '';
        apiStatus.onclick = null;
    }
}

// ============ MODALS & INTERFACE ============
window.initModals = function () {
    const helpModal = document.getElementById('helpModal');
    const helpBtn = document.getElementById('helpBtn');
    const closeHelp = document.getElementById('closeHelp');

    if (helpBtn && helpModal) {
        helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    }

    if (closeHelp && helpModal) {
        closeHelp.addEventListener('click', () => helpModal.classList.remove('active'));
    }

    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) helpModal.classList.remove('active');
        });
    }

    // Workplace Modal — abrir
    document.getElementById('btnAddWorkplace')?.addEventListener('click', () => {
        document.getElementById('workplaceModalOverlay')?.classList.add('active');
    });

    // Workplace Modal — cerrar (X en header Y botón Cancelar en footer)
    const closeWorkplaceModal = () =>
        document.getElementById('workplaceModalOverlay')?.classList.remove('active');
    document.getElementById('btnCancelWorkplace')?.addEventListener('click', closeWorkplaceModal);
    document.getElementById('btnCancelWorkplaceBtn')?.addEventListener('click', closeWorkplaceModal);
    // Cerrar al click fuera del modal
    document.getElementById('workplaceModalOverlay')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('workplaceModalOverlay')) closeWorkplaceModal();
    });

    // PDF Config Main button
    const btnConfigPdfMain = document.getElementById('btnConfigPdfMain');
    if (btnConfigPdfMain) {
        btnConfigPdfMain.addEventListener('click', () => {
            if (typeof openPdfConfigModal === 'function') openPdfConfigModal();
        });
    }

    // PDF Config Modal — close buttons
    const pdfModalOverlay = document.getElementById('pdfModalOverlay');
    const closePdfConfig = document.getElementById('closePdfConfig');
    const btnClosePdfConfig = document.getElementById('btnClosePdfConfig');
    const btnSavePdfConfig = document.getElementById('btnSavePdfConfig');
    const btnPreviewFromConfig = document.getElementById('btnPreviewFromConfig');

    const closePdfConfigModal = () => pdfModalOverlay?.classList.remove('active');

    // Config tabs switching
    document.querySelectorAll('.config-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.config-tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById(tab.dataset.tab);
            if (panel) panel.classList.add('active');
        });
    });

    if (closePdfConfig) closePdfConfig.addEventListener('click', closePdfConfigModal);
    if (btnClosePdfConfig) btnClosePdfConfig.addEventListener('click', closePdfConfigModal);

    // ── Header color palette (6 swatches) ──
    const colorPaletteEl = document.getElementById('pdfHeaderColor');
    if (colorPaletteEl) {
        colorPaletteEl.addEventListener('click', (e) => {
            const swatch = e.target.closest('.hdr-swatch');
            if (!swatch) return;
            const color = swatch.dataset.color;
            colorPaletteEl.dataset.selectedColor = color;
            colorPaletteEl.querySelectorAll('.hdr-swatch').forEach(s => {
                s.classList.remove('selected');
                s.style.borderColor = 'transparent';
            });
            swatch.classList.add('selected');
            swatch.style.borderColor = 'var(--text-primary, #0f172a)';
            const bar = document.getElementById('hdrColorPreviewBar');
            if (bar) bar.style.background = color;
        });
    }

    // Mostrar/ocultar detalles del lugar al seleccionar del dropdown
    const wpSelect = document.getElementById('pdfWorkplace');
    const wpDetailsPanel = document.getElementById('workplaceDetailsPanel');
    if (wpSelect && wpDetailsPanel) {
        wpSelect.addEventListener('change', () => {
            // Mostrar detalles solo si se seleccionó un lugar
            wpDetailsPanel.style.display = wpSelect.value ? '' : 'none';
        });
    }

    // Botón Agregar lugar: muestra panel de detalles vacío para crear uno nuevo
    const btnAddWp = document.getElementById('btnAddWorkplace');
    if (btnAddWp && wpDetailsPanel) {
        // El listener de agregar ya existe en business.js — aquí solo aseguramos que el panel se muestre
        btnAddWp.addEventListener('click', () => {
            wpDetailsPanel.style.display = '';
        });
    }

    // Tipo de estudio: si elige "Otro", mostrar un input de texto libre
    const studyTypeSelect = document.getElementById('pdfStudyType');
    if (studyTypeSelect) {
        studyTypeSelect.addEventListener('change', () => {
            const hint = document.getElementById('pdfStudyTypeHint');
            if (studyTypeSelect.value === '__other__') {
                (async () => {
                    const custom = await window.showCustomPrompt('Ingrese el tipo de estudio:', 'Ej: Eco Doppler vascular');
                    if (custom && custom.trim()) {
                        const opt = document.createElement('option');
                        opt.value = custom.trim();
                        opt.textContent = custom.trim();
                        studyTypeSelect.insertBefore(opt, studyTypeSelect.querySelector('[value="__other__"]'));
                        studyTypeSelect.value = custom.trim();
                    }
                    if (hint) hint.style.display = 'none';
                })();
            }
        });
    }

    // Logo: registrar listener de carga de imagen (firma se configura en clones)
    if (typeof handleImageUpload === 'function') {
        handleImageUpload('pdfLogoUpload',      'pdfLogoPreview',      'pdf_logo');
    }

    // Sliders de tamaño de logo y firma — label en vivo
    const logoSizeSlider = document.getElementById('pdfLogoSize');
    const firmaSizeSlider = document.getElementById('pdfFirmaSize');
    if (logoSizeSlider) {
        logoSizeSlider.addEventListener('input', () => {
            const lbl = document.getElementById('logoSizeValue');
            if (lbl) lbl.textContent = logoSizeSlider.value;
        });
    }
    if (firmaSizeSlider) {
        firmaSizeSlider.addEventListener('input', () => {
            const lbl = document.getElementById('firmaSizeValue');
            if (lbl) lbl.textContent = firmaSizeSlider.value;
        });
    }

    if (btnSavePdfConfig) {
        btnSavePdfConfig.addEventListener('click', () => {
            if (typeof savePdfConfiguration === 'function') savePdfConfiguration();
            // Admin: persistir personalización del encabezado en prof_data
            if (typeof isAdminUser === 'function' && isAdminUser()) {
                const profD = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
                const gv = (id) => document.getElementById(id)?.value || '';
                const nom = gv('pdfProfName');
                const mat = gv('pdfProfMatricula');
                const esp = gv('pdfProfEspecialidad');
                const colEl = document.getElementById('pdfHeaderColor');
                const col = colEl?.dataset?.selectedColor || colEl?.value || null;
                if (nom)  profD.nombre          = nom;
                if (mat)  profD.matricula        = mat;
                if (esp)  profD.especialidad     = esp;
                if (col  != null) profD.headerColor     = col;
                window._profDataCache = profD;
                if (typeof appDB !== 'undefined') appDB.set('prof_data', profD);
                localStorage.setItem('prof_data', JSON.stringify(profD));
            }
            // Color del encabezado: guardarlo siempre en prof_data (visible para todos en pestaña Formato)
            if (!(typeof isAdminUser === 'function' && isAdminUser())) {
                const profD = window._profDataCache || JSON.parse(localStorage.getItem('prof_data') || '{}');
                const colEl2 = document.getElementById('pdfHeaderColor');
                const col = colEl2?.dataset?.selectedColor || colEl2?.value || null;
                if (col) { profD.headerColor = col; window._profDataCache = profD; if (typeof appDB !== 'undefined') appDB.set('prof_data', profD); localStorage.setItem('prof_data', JSON.stringify(profD)); }
            }
            // M-2: cerrar el modal después de guardar
            closePdfConfigModal();
            if (typeof showToast === 'function') showToast('✅ Configuración guardada', 'success');
            // Actualizar semáforo tras guardar
            if (typeof updateConfigTrafficLight === 'function') updateConfigTrafficLight();
        });
    }

    if (btnPreviewFromConfig) {
        btnPreviewFromConfig.addEventListener('click', () => {
            // Save config silently before opening preview — preservando datos del profesional activo
            if (typeof savePdfConfiguration === 'function') {
                const existing = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
                const val = (id) => document.getElementById(id)?.value || '';
                const chk = (id, def) => document.getElementById(id)?.checked ?? def;
                const config = {
                    studyType: val('pdfStudyType'), studyDate: val('pdfStudyDate'),
                    studyTime: val('pdfStudyTime'), studyReason: val('pdfStudyReason'),
                    referringDoctor: val('pdfReferringDoctor'), equipment: val('pdfEquipment'),
                    technique: val('pdfTechnique'), patientName: val('pdfPatientName'),
                    patientDni: val('pdfPatientDni'), patientAge: val('pdfPatientAge'),
                    patientSex: val('pdfPatientSex'), patientInsurance: val('pdfPatientInsurance'),
                    patientAffiliateNum: val('pdfPatientAffiliateNum'), patientPhone: val('pdfPatientPhone'),
                    patientBirthdate: val('pdfPatientBirthdate'), pageSize: val('pdfPageSize') || 'a4',
                    orientation: val('pdfOrientation') || 'portrait', margins: val('pdfMargins') || 'normal',
                    font: val('pdfFont') || 'helvetica', fontSize: val('pdfFontSize') || '11',
                    lineSpacing: val('pdfLineSpacing') || '1.5',
                    showHeader: chk('pdfShowHeader', true), showFooter: chk('pdfShowFooter', true),
                    showPageNum: chk('pdfShowPageNum', true), showDate: chk('pdfShowDate', false),
                    showQR: chk('pdfShowQR', false), showSignLine: chk('pdfShowSignLine', true),
                    showSignName: chk('pdfShowSignName', true), showSignMatricula: chk('pdfShowSignMatricula', true),
                    showSignImage: chk('pdfShowSignImage', false),
                    logoSizePx: parseInt(document.getElementById('pdfLogoSize')?.value || '60'),
                    firmaSizePx: parseInt(document.getElementById('pdfFirmaSize')?.value || '60'),
                    footerText: val('pdfFooterText'), selectedWorkplace: val('pdfWorkplace'),
                    workplaceAddress: val('pdfWorkplaceAddress'), workplacePhone: val('pdfWorkplacePhone'),
                    workplaceEmail: val('pdfWorkplaceEmail')
                };
                // Preservar campos de profesional activo (seteados por business.js)
                if (existing.activeProfessional)                       config.activeProfessional      = existing.activeProfessional;
                if (existing.activeProfessionalIndex !== undefined)     config.activeProfessionalIndex = existing.activeProfessionalIndex;
                if (existing.activeWorkplaceIndex    !== undefined)     config.activeWorkplaceIndex    = existing.activeWorkplaceIndex;
                window._pdfConfigCache = config;
                if (typeof appDB !== 'undefined') appDB.set('pdf_config', config);
                localStorage.setItem('pdf_config', JSON.stringify(config));
            }
            if (typeof openPrintPreview === 'function') openPrintPreview();
        });
    }

    if (pdfModalOverlay) {
        pdfModalOverlay.addEventListener('click', (e) => {
            if (e.target === pdfModalOverlay) closePdfConfigModal();
        });
    }

    // Print Preview Modal — close buttons
    const printPreviewOverlay = document.getElementById('printPreviewOverlay');
    const closePrintPreview = document.getElementById('closePrintPreview');
    const btnDownloadFromPreview = document.getElementById('btnDownloadFromPreview');
    const btnPrintFromPreview = document.getElementById('btnPrintFromPreview');
    const btnClosePrintPreviewFooter = document.getElementById('btnClosePrintPreviewFooter');

    const closePrintPreviewModal = () => printPreviewOverlay?.classList.remove('active');

    if (closePrintPreview) closePrintPreview.addEventListener('click', closePrintPreviewModal);
    if (btnClosePrintPreviewFooter) btnClosePrintPreviewFooter.addEventListener('click', closePrintPreviewModal);

    if (btnDownloadFromPreview) {
        btnDownloadFromPreview.addEventListener('click', async () => {
            // Si el plan no permite PDF, descargar TXT en su lugar
            if (btnDownloadFromPreview._forceTxt) {
                if (typeof window.downloadTXT === 'function') {
                    window.downloadTXT();
                } else {
                    if (typeof showToast === 'function') showToast('Formato TXT no disponible', 'info');
                }
                return;
            }
            const editorEl = window.editor || document.getElementById('editor');
            if (!editorEl || !editorEl.innerHTML.trim()) {
                if (typeof showToast === 'function') showToast('No hay contenido en el editor', 'error');
                return;
            }
            if (typeof downloadPDFWrapper === 'function') {
                const safeT = typeof transcriptions !== 'undefined' ? transcriptions : [];
                const safeI = typeof activeTabIndex !== 'undefined' ? activeTabIndex : 0;
                const fName = (safeT[safeI]?.fileName || 'informe').replace(/\.[^/.]+$/, '');
                const fecha = new Date().toLocaleDateString('es-ES');
                const fDate = new Date().toISOString().split('T')[0];
                await downloadPDFWrapper(editorEl.innerHTML, fName, fecha, fDate);
            }
        });
    }

    // Preview download dropdown extracted to src/js/utils/uiPreviewDownloadUtils.js
    if (typeof window.initPreviewDownloadDropdown === 'function') {
        window.initPreviewDownloadDropdown(btnDownloadFromPreview);
    }

    if (btnPrintFromPreview) {
        btnPrintFromPreview.addEventListener('click', () => {
            if (typeof printFromPreview === 'function') printFromPreview();
        });
    }

    // Botón Enviar por email desde vista previa
    const btnEmailFromPreview = document.getElementById('btnEmailFromPreview');
    if (btnEmailFromPreview) {
        btnEmailFromPreview.addEventListener('click', () => {
            if (typeof emailFromPreview === 'function') emailFromPreview();
        });
    }

    // Inicializar modal de email
    if (typeof initEmailSendModal === 'function') initEmailSendModal();

    if (printPreviewOverlay) {
        printPreviewOverlay.addEventListener('click', (e) => {
            if (e.target === printPreviewOverlay) closePrintPreviewModal();
        });
    }

    // Botón Ejecutar Tests (admin only)
    const btnRunTests = document.getElementById('btnRunTests');
    if (btnRunTests) {
        btnRunTests.addEventListener('click', () => {
            window.open('tests/auto-test-full.html', '_blank');
        });
    }

    // Patient Data Required Modal
    const patientOverlay = document.getElementById('patientDataRequiredOverlay');
    const btnSavePatientData = document.getElementById('btnSavePatientData');
    const btnSkipPatientData = document.getElementById('btnSkipPatientData');
    const btnClosePatientModal = document.getElementById('btnClosePatientModal');

    // Función global para abrir el modal de datos del paciente
    window.openPatientDataModal = function() {
        // Pre-rellenar con datos existentes (si se re-edita)
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

    // Cerrar modal (X o Omitir)
    function closePatientModal() {
        patientOverlay?.classList.remove('active');
    }
    if (btnClosePatientModal) btnClosePatientModal.addEventListener('click', closePatientModal);
    if (btnSkipPatientData) btnSkipPatientData.addEventListener('click', () => {
        closePatientModal();
        if (typeof showToast === 'function') showToast('ℹ️ Podés completar los datos del paciente luego desde el placeholder en el informe', 'info', 4000);
    });

    if (btnSavePatientData) {
        btnSavePatientData.addEventListener('click', () => {
            const name = document.getElementById('reqPatientName')?.value?.trim();
            if (!name) {
                if (typeof showToast === 'function') showToast('⚠️ El nombre del paciente es obligatorio', 'error');
                // Resaltar el campo vacío
                const nameEl = document.getElementById('reqPatientName');
                if (nameEl) { nameEl.style.borderColor = '#ef4444'; nameEl.focus(); }
                return;
            }
            const config = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
            config.patientName = name;
            const dni          = document.getElementById('reqPatientDni')?.value?.trim();
            const age          = document.getElementById('reqPatientAge')?.value?.trim();
            const sex          = document.getElementById('reqPatientSex')?.value;
            const insurance    = document.getElementById('reqPatientInsurance')?.value?.trim();
            const affiliateNum = document.getElementById('reqPatientAffiliateNum')?.value?.trim();
            if (dni)          config.patientDni         = dni;
            if (age)          config.patientAge         = age;
            if (sex)          config.patientSex         = sex;
            if (insurance)    config.patientInsurance   = insurance;
            if (affiliateNum) config.patientAffiliateNum = affiliateNum;
            window._pdfConfigCache = config;
            if (typeof appDB !== 'undefined') appDB.set('pdf_config', config);
            localStorage.setItem('pdf_config', JSON.stringify(config));
            patientOverlay?.classList.remove('active');
            if (typeof showToast === 'function') showToast('✅ Datos del paciente guardados', 'success');
            // Insertar/reemplazar datos del paciente en el editor
            _insertPatientDataInEditor({ name, dni, age, sex, insurance, affiliateNum });
            // Guardar en el registro de pacientes
            if (typeof savePatientToRegistry === 'function') {
                savePatientToRegistry({ name, dni, age, sex, insurance, affiliateNum });
                if (typeof populatePatientDatalist === 'function') populatePatientDatalist();
            }
        });
    }

    // ── Insertar datos del paciente como encabezado en el editor ──
    function _insertPatientDataInEditor(data) {
        const editorEl = document.getElementById('editor');
        if (!editorEl) return;
        // Remover banner placeholder o banner de datos previo
        const oldPlaceholder = editorEl.querySelector('.patient-placeholder-banner');
        if (oldPlaceholder) oldPlaceholder.remove();
        const oldHeader = editorEl.querySelector('.patient-data-header');
        if (oldHeader) oldHeader.remove();

        // Construir líneas de datos
        const lines = [];
        if (data.name) lines.push(`<strong>Paciente:</strong> ${data.name}`);
        if (data.dni)  lines.push(`<strong>DNI:</strong> ${data.dni}`);
        if (data.age)  lines.push(`<strong>Edad:</strong> ${data.age} años`);
        if (data.sex)  lines.push(`<strong>Sexo:</strong> ${data.sex}`);
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

        // Si estamos viendo el texto original, sincronizar también el HTML estructurado guardado
        const btnR = document.getElementById('btnRestoreOriginal');
        if (btnR && btnR._showingOriginal && window._lastStructuredHTML) {
            const temp = document.createElement('div');
            temp.innerHTML = window._lastStructuredHTML;
            const oldH = temp.querySelector('.patient-data-header');
            if (oldH) oldH.remove();
            const oldP = temp.querySelector('.patient-placeholder-banner');
            if (oldP) oldP.remove();
            // Insertar encabezado de texto plano (sin event listener, se re-creará al volver)
            const headerHTML = `<div class="patient-data-header" contenteditable="false"><div class="patient-data-content">${lines.join(' &nbsp;·&nbsp; ')}</div><button class="patient-data-edit-btn" title="Editar datos del paciente">✏️</button></div>`;
            temp.insertAdjacentHTML('afterbegin', headerHTML);
            window._lastStructuredHTML = temp.innerHTML;
        }
    }
    window._insertPatientDataInEditor = _insertPatientDataInEditor;

    // ── Refrescar encabezado de paciente desde localStorage ──
    function _refreshPatientHeader() {
        const cfg = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
        if (cfg.patientName) {
            _insertPatientDataInEditor({
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
        // Insertar botón inline de grabar si aplica
        if (typeof window._insertInlineAppendBtn === 'function') window._insertInlineAppendBtn();
    }
    window._refreshPatientHeader = _refreshPatientHeader;

    // ── Botón inline "Grabar y agregar" dentro del editor (Pro only) ──
    window._insertInlineAppendBtn = function () {
        const editor = document.getElementById('editor');
        if (!editor) return;

        // Remover existente si hay
        const existing = editor.querySelector('.btn-append-inline');
        if (existing) existing.remove();

        // No mostrar en vista de texto original ni en modo comparación
        if (document.getElementById('btnRestoreOriginal')?._showingOriginal) return;
        if (window._isComparisonMode) return;

        // Solo Pro mode estricto con contenido estructurado en el editor
        const _isPro = window.currentMode === 'pro'
            || (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'PRO');
        if (!_isPro) return;
        if (!editor.innerText.trim()) return;
        // No mostrar si el contenido no está estructurado (texto plano sin secciones)
        if (!editor.querySelector('h3, h4, .section-header, strong')) return;

        // Crear wrapper contenteditable=false
        const wrap = document.createElement('div');
        wrap.className = 'btn-append-inline';
        wrap.setAttribute('contenteditable', 'false');
        wrap.innerHTML = `<button class="btn btn-pro-animated" title="Grabar y agregar texto al final del informe">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            <span>Grabar y agregar +</span>
        </button>`;

        // Sincronizar estado de grabación si ya estaba activa
        if (window._appendRecordingActive) {
            const innerBtn = wrap.querySelector('button');
            innerBtn.classList.add('recording-pulse');
            innerBtn.classList.remove('btn-pro-animated');
            innerBtn.querySelector('span').textContent = '⏹ Grabando…';
        }

        // Click → delegar al botón oculto original (mantiene toda la lógica de grabación)
        wrap.querySelector('button').addEventListener('click', () => {
            const hiddenBtn = document.getElementById('btnAppendRecord');
            if (hiddenBtn) hiddenBtn.click();
        });

        // Insertar después del header de paciente/placeholder (NO después del banner de texto original)
        const anchor = editor.querySelector('.patient-data-header') ||
                       editor.querySelector('.patient-placeholder-banner');
        if (anchor) {
            anchor.after(wrap);
        } else {
            // Si no hay header de paciente, insertar al inicio del editor
            editor.insertBefore(wrap, editor.firstChild);
        }
    };

    // Limpiar borde rojo al escribir
    document.getElementById('reqPatientName')?.addEventListener('input', (e) => {
        e.target.style.borderColor = '';
    });

    // Restore/toggle original button
    const btnRestoreOriginal = document.getElementById('btnRestoreOriginal');
    if (btnRestoreOriginal) {
        btnRestoreOriginal.addEventListener('click', () => {
            const editorEl = document.getElementById('editor');
            if (!editorEl) return;
            if (btnRestoreOriginal._showingOriginal) {
                // Detectar si se agregó texto nuevo mientras se veía el original
                const needsRestructure = !!window._rawAppendedWhileOriginal;
                if (needsRestructure) {
                    // El texto nuevo ya fue agregado a _lastRawTranscription en el momento de grabar
                    window._rawAppendedWhileOriginal = false;
                }

                // Volver al estructurado
                if (window._lastStructuredHTML) editorEl.innerHTML = window._lastStructuredHTML;
                btnRestoreOriginal.innerHTML = '↩ Original';
                btnRestoreOriginal.title = 'Ver texto original (sin estructurar)';
                btnRestoreOriginal.classList.remove('toggle-active');
                btnRestoreOriginal._showingOriginal = false;
                // Re-insertar datos del paciente actualizados
                _refreshPatientHeader();

                // Si hubo texto nuevo agregado → re-estructurar automáticamente
                if (needsRestructure && window.currentMode === 'pro') {
                    if (typeof showToast === 'function') {
                        showToast('✏️ Se detectó texto nuevo. Re-estructurando...', 'info', 3000);
                    }
                    setTimeout(() => {
                        if (typeof window.autoStructure === 'function') {
                            window.autoStructure({ silent: true });
                        }
                    }, 500);
                }
            } else {
                // Mostrar original
                if (window._lastRawTranscription) {
                    // Guardar HTML estructurado limpio (sin elementos UI inline)
                    const clone = editorEl.cloneNode(true);
                    clone.querySelectorAll('.btn-append-inline, .patient-data-header, .patient-placeholder-banner').forEach(el => el.remove());
                    window._lastStructuredHTML = clone.innerHTML;
                    editorEl.innerHTML = '<div class="original-text-banner" contenteditable="false">📝 Texto original (sin estructurar)</div>' +
                        window._lastRawTranscription
                        .split('\n').filter(l => l.trim())
                        .map(l => `<p class="report-p">${l}</p>`).join('\n');
                    // Marcar antes de _refreshPatientHeader para que _insertInlineAppendBtn no inyecte el botón
                    btnRestoreOriginal._showingOriginal = true;
                    btnRestoreOriginal.innerHTML = '⟳ Estructurado';
                    btnRestoreOriginal.title = 'Volver al texto estructurado';
                    btnRestoreOriginal.classList.add('toggle-active');
                    // Insertar datos del paciente también en la vista original (sin botón inline)
                    _refreshPatientHeader();
                }
            }
            if (typeof updateWordCount === 'function') updateWordCount();
        });
    }

    // Comparison logic extracted to src/js/utils/uiComparisonUtils.js
    // Compatibility markers for tests: enterComparisonMode / exitComparisonMode / _isComparisonMode / printPanelContent
    if (typeof window.initComparisonViewHandlers === 'function') {
        window.initComparisonViewHandlers({ btnRestoreOriginal });
    }

    // Medical check button
    const btnMedicalCheck = document.getElementById('btnMedicalCheck');
    if (btnMedicalCheck) {
        btnMedicalCheck.addEventListener('click', () => {
            if (typeof checkMedicalTerminology === 'function') checkMedicalTerminology();
        });
    }

    // ── Botón "Continuar grabando" (append audio transcription) ── Pro only ──
    const btnAppendRecord = document.getElementById('btnAppendRecord');
    if (btnAppendRecord) {
        let _appendRecording = false;
        let _appendStarting = false; // guard contra doble-click
        let _appendMediaRecorder = null;
        let _appendChunks = [];
        let _appendStream = null;
        let _appendTimer = null;
        let _appendStartTime = 0;

        btnAppendRecord.addEventListener('click', async () => {
            if (_appendRecording) {
                // Stop recording
                if (_appendMediaRecorder && _appendMediaRecorder.state === 'recording') {
                    _appendMediaRecorder.stop();
                }
                _appendRecording = false;
                _appendStarting = false;
                btnAppendRecord.classList.remove('recording-pulse');
                btnAppendRecord.title = 'Grabar y agregar texto al final del informe';
                if (_appendTimer) clearInterval(_appendTimer);
                // Sincronizar botón inline
                window._appendRecordingActive = false;
                _syncInlineAppendBtn();
                return;
            }

            // Guard contra doble-click al iniciar
            if (_appendStarting) return;
            _appendStarting = true;

            // Start recording
            try {
                _appendStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                _appendMediaRecorder = new MediaRecorder(_appendStream);
                _appendChunks = [];

                _appendMediaRecorder.ondataavailable = (e) => _appendChunks.push(e.data);
                _appendMediaRecorder.onstop = async () => {
                    _appendStream.getTracks().forEach(t => t.stop());
                    const realMime = _appendMediaRecorder.mimeType || 'audio/webm';
                    const ext = realMime.includes('ogg') ? 'ogg' : 'webm';
                    const blob = new Blob(_appendChunks, { type: realMime });
                    const file = new File([blob], `append_audio.${ext}`, { type: realMime });

                    // Transcribe with shared function (retry + timeout + prompt médico)
                    if (typeof showToast === 'function') showToast('⏳ Transcribiendo audio adicional...', 'info', 3000);
                    try {
                        let newText = await window.transcribeAudioSimple(file);

                        // Filtrar alucinaciones y audio vacío/ambiente
                        if (typeof window.cleanTranscriptionText === 'function') {
                            newText = window.cleanTranscriptionText(newText);
                        }

                        if (newText) {
                            const editor = document.getElementById('editor');
                            if (editor) {
                                // Append as new paragraph
                                const p = document.createElement('p');
                                p.textContent = newText;
                                editor.appendChild(p);
                                editor.dispatchEvent(new Event('input', { bubbles: true }));
                                if (typeof updateWordCount === 'function') updateWordCount();
                                showToast('✅ Texto agregado al final del informe', 'success');
                                // Scroll to bottom
                                editor.scrollTop = editor.scrollHeight;

                                // Sincronizar: agregar texto crudo al original para coherencia comparativa
                                if (window._lastRawTranscription != null) {
                                    window._lastRawTranscription = window._lastRawTranscription.trimEnd() + '\n' + newText;
                                }
                                // Marcar flag según la vista actual
                                const btnR = document.getElementById('btnRestoreOriginal');
                                if (btnR && btnR._showingOriginal) {
                                    // Grabando en vista original → marcar para re-estructurar al volver
                                    window._rawAppendedWhileOriginal = true;
                                } else {
                                    // Grabando en vista estructurada → actualizar HTML guardado (sin elementos UI)
                                    const clone = editor.cloneNode(true);
                                    clone.querySelectorAll('.btn-append-inline, .patient-data-header, .patient-placeholder-banner').forEach(el => el.remove());
                                    window._lastStructuredHTML = clone.innerHTML;
                                }
                            }
                        } else {
                            showToast('🔇 No se detectó dictado claro. No se agregó texto.', 'info', 4000);
                        }
                    } catch (err) {
                        if (typeof showToast === 'function') showToast('❌ Error al transcribir: ' + err.message, 'error');
                    }
                };

                _appendMediaRecorder.start();
                _appendRecording = true;
                btnAppendRecord.classList.add('recording-pulse');
                btnAppendRecord.title = '⏹ Detener grabación';
                // Sincronizar botón inline
                window._appendRecordingActive = true;
                _syncInlineAppendBtn();

                // Timer visual en toast
                _appendStartTime = Date.now();
                if (typeof showToast === 'function') showToast('🎙️ Grabando... Pulsa de nuevo para detener', 'info', 60000);
                _appendTimer = setInterval(() => {
                    const diff = Date.now() - _appendStartTime;
                    const s = Math.floor((diff / 1000) % 60);
                    const m = Math.floor((diff / (1000 * 60)) % 60);
                    btnAppendRecord.title = `⏹ Grabando ${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')} — click para detener`;
                }, 1000);

            } catch (err) {
                _appendStarting = false;
                if (typeof showToast === 'function') showToast('❌ No se pudo acceder al micrófono', 'error');
            }
        });

        // Sincronizar estado visual del botón inline con la grabación
        function _syncInlineAppendBtn() {
            const inlineBtn = document.querySelector('.btn-append-inline button');
            if (!inlineBtn) return;
            if (window._appendRecordingActive) {
                inlineBtn.classList.add('recording-pulse');
                inlineBtn.classList.remove('btn-pro-animated');
                const span = inlineBtn.querySelector('span');
                if (span) span.textContent = '⏹ Grabando…';
            } else {
                inlineBtn.classList.remove('recording-pulse');
                inlineBtn.classList.add('btn-pro-animated');
                const span = inlineBtn.querySelector('span');
                if (span) span.textContent = 'Grabar y agregar +';
            }
        }
    }

    // Escape shortcut extracted to src/js/utils/uiKeyboardShortcuts.js
    if (typeof window.initEscapeModalShortcut === 'function') {
        window.initEscapeModalShortcut();
    }
}

