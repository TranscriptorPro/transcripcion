// ============ UI UTILS & HELPERS ============

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

window.disableButtons = function () {
    const buttons = ['structureBtn', 'downloadPdfBtn', 'btnConfigPdfMain', 'btnPreviewPdfMain'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = true;
    });
}

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

// ============ THEME MANAGEMENT ============
window.updateThemeIcon = function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const themeIcon = document.getElementById('themeIcon');
    if (!themeIcon) return;

    themeIcon.innerHTML = isDark
        ? '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>'
        : '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>';
}

window.initTheme = function () {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcon();

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon();
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    });

    window.addEventListener('themeChanged', (e) => {
        document.documentElement.setAttribute('data-theme', e.detail.theme);
        updateThemeIcon();
    });
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

    // PDF Preview Main button
    const btnPreviewPdfMain = document.getElementById('btnPreviewPdfMain');
    if (btnPreviewPdfMain) {
        btnPreviewPdfMain.addEventListener('click', () => {
            if (typeof openPrintPreview === 'function') openPrintPreview();
        });
    }

    // PDF Config Modal — close buttons
    const pdfModalOverlay = document.getElementById('pdfModalOverlay');
    const closePdfConfig = document.getElementById('closePdfConfig');
    const btnClosePdfConfig = document.getElementById('btnClosePdfConfig');
    const btnSavePdfConfig = document.getElementById('btnSavePdfConfig');
    const btnPreviewFromConfig = document.getElementById('btnPreviewFromConfig');

    const closePdfConfigModal = () => pdfModalOverlay?.classList.remove('active');

    if (closePdfConfig) closePdfConfig.addEventListener('click', closePdfConfigModal);
    if (btnClosePdfConfig) btnClosePdfConfig.addEventListener('click', closePdfConfigModal);

    // Logo y firma: registrar listeners de carga de imagen
    if (typeof handleImageUpload === 'function') {
        handleImageUpload('pdfLogoUpload',      'pdfLogoPreview',      'pdf_logo');
        handleImageUpload('pdfSignatureUpload', 'pdfSignaturePreview', 'pdf_signature');
    }

    if (btnSavePdfConfig) {
        btnSavePdfConfig.addEventListener('click', () => {
            if (typeof savePdfConfiguration === 'function') savePdfConfiguration();
            // Admin: persistir personalización del encabezado en prof_data
            if (typeof isAdminUser === 'function' && isAdminUser()) {
                const profD = JSON.parse(localStorage.getItem('prof_data') || '{}');
                const gv = (id) => document.getElementById(id)?.value || '';
                const nom = gv('pdfProfName');
                const mat = gv('pdfProfMatricula');
                const esp = gv('pdfProfEspecialidad');
                const inst = document.getElementById('pdfInstitutionName')?.value;
                const col  = document.getElementById('pdfHeaderColor')?.value;
                if (nom)  profD.nombre          = nom;
                if (mat)  profD.matricula        = mat;
                if (esp)  profD.especialidad     = esp;
                if (inst != null) profD.institutionName = inst;
                if (col  != null) profD.headerColor     = col;
                localStorage.setItem('prof_data', JSON.stringify(profD));
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
                const existing = JSON.parse(localStorage.getItem('pdf_config') || '{}');
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
                    footerText: val('pdfFooterText'), selectedWorkplace: val('pdfWorkplace'),
                    workplaceAddress: val('pdfWorkplaceAddress'), workplacePhone: val('pdfWorkplacePhone'),
                    workplaceEmail: val('pdfWorkplaceEmail')
                };
                // Preservar campos de profesional activo (seteados por business.js)
                if (existing.activeProfessional)                       config.activeProfessional      = existing.activeProfessional;
                if (existing.activeProfessionalIndex !== undefined)     config.activeProfessionalIndex = existing.activeProfessionalIndex;
                if (existing.activeWorkplaceIndex    !== undefined)     config.activeWorkplaceIndex    = existing.activeWorkplaceIndex;
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

    if (btnPrintFromPreview) {
        btnPrintFromPreview.addEventListener('click', () => {
            if (typeof printFromPreview === 'function') printFromPreview();
        });
    }

    if (printPreviewOverlay) {
        printPreviewOverlay.addEventListener('click', (e) => {
            if (e.target === printPreviewOverlay) closePrintPreviewModal();
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
        const cfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
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
            const config = JSON.parse(localStorage.getItem('pdf_config') || '{}');
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
    }
    window._insertPatientDataInEditor = _insertPatientDataInEditor;

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
                // Volver al estructurado
                if (window._lastStructuredHTML) editorEl.innerHTML = window._lastStructuredHTML;
                btnRestoreOriginal.innerHTML = '↩ Original';
                btnRestoreOriginal.title = 'Ver texto original (sin estructurar)';
                btnRestoreOriginal.classList.remove('toggle-active');
                btnRestoreOriginal._showingOriginal = false;
            } else {
                // Mostrar original
                if (window._lastRawTranscription) {
                    window._lastStructuredHTML = editorEl.innerHTML;
                    editorEl.innerHTML = '<div class="original-text-banner" contenteditable="false">📝 Texto original (sin estructurar)</div>' +
                        window._lastRawTranscription
                        .split('\n').filter(l => l.trim())
                        .map(l => `<p class="report-p">${l}</p>`).join('\n');
                    btnRestoreOriginal.innerHTML = '⟳ Estructurado';
                    btnRestoreOriginal.title = 'Volver al texto estructurado';
                    btnRestoreOriginal.classList.add('toggle-active');
                    btnRestoreOriginal._showingOriginal = true;
                }
            }
            if (typeof updateWordCount === 'function') updateWordCount();
        });
    }

    // ── Comparison side-by-side view ──────────────────────────────────────
    const btnCompareView = document.getElementById('btnCompareView');
    const comparisonContainer = document.getElementById('comparisonContainer');
    const editorForCompare = document.getElementById('editor');

    window._isComparisonMode = false;

    function enterComparisonMode() {
        if (!window._lastRawTranscription || !window._lastStructuredHTML) {
            if (typeof showToast === 'function') showToast('Se necesita texto original y estructurado para comparar', 'error');
            return;
        }
        // Save current structured state if editor has been edited
        window._lastStructuredHTML = editorForCompare ? editorForCompare.innerHTML : window._lastStructuredHTML;

        // Populate panels
        const compOriginal = document.getElementById('comparisonOriginal');
        const compStructured = document.getElementById('comparisonStructured');
        if (compOriginal) {
            compOriginal.innerHTML = window._lastRawTranscription
                .split('\n').filter(l => l.trim())
                .map(l => `<p style="margin:0.4em 0;">${l}</p>`).join('');
        }
        if (compStructured) {
            compStructured.innerHTML = window._lastStructuredHTML;
        }

        // Show comparison, hide editor
        if (editorForCompare) editorForCompare.style.display = 'none';
        if (comparisonContainer) comparisonContainer.style.display = 'flex';

        // Update button state
        if (btnCompareView) {
            btnCompareView.innerHTML = '✕ Cerrar';
            btnCompareView.classList.add('toggle-active');
        }
        // Disable main copy/print while in comparison
        const mainCopy = document.getElementById('copyBtn');
        const mainPrint = document.getElementById('printBtn');
        if (mainCopy) { mainCopy.disabled = true; mainCopy.title = 'Usá los botones de cada panel en modo comparación'; }
        if (mainPrint) { mainPrint.disabled = true; mainPrint.title = 'Usá los botones de cada panel en modo comparación'; }

        // Hide toggle original button (mutually exclusive)
        if (btnRestoreOriginal) btnRestoreOriginal.style.display = 'none';

        window._isComparisonMode = true;
    }

    function exitComparisonMode() {
        if (editorForCompare) editorForCompare.style.display = '';
        if (comparisonContainer) comparisonContainer.style.display = 'none';

        if (btnCompareView) {
            btnCompareView.innerHTML = '⧉ Comparar';
            btnCompareView.classList.remove('toggle-active');
        }
        // Re-enable main copy/print
        const mainCopy = document.getElementById('copyBtn');
        const mainPrint = document.getElementById('printBtn');
        if (mainCopy) { mainCopy.disabled = false; mainCopy.title = 'Copiar todo'; }
        if (mainPrint) { mainPrint.disabled = false; mainPrint.title = 'Imprimir'; }

        // Show toggle original button again
        if (btnRestoreOriginal) btnRestoreOriginal.style.display = '';

        window._isComparisonMode = false;
    }

    if (btnCompareView) {
        btnCompareView.addEventListener('click', () => {
            if (window._isComparisonMode) {
                exitComparisonMode();
            } else {
                // If showing original, go back to structured first
                if (btnRestoreOriginal && btnRestoreOriginal._showingOriginal) {
                    btnRestoreOriginal.click();
                }
                enterComparisonMode();
            }
        });
    }

    // Panel-level copy buttons
    document.getElementById('btnCopyOriginal')?.addEventListener('click', () => {
        if (!window._lastRawTranscription) return;
        navigator.clipboard.writeText(window._lastRawTranscription).then(() => {
            if (typeof showToast === 'function') showToast('📋 Texto original copiado', 'success');
        }).catch(() => {
            if (typeof showToast === 'function') showToast('❌ No se pudo copiar al portapapeles', 'error');
        });
    });
    document.getElementById('btnCopyStructured')?.addEventListener('click', () => {
        const compStructured = document.getElementById('comparisonStructured');
        const text = compStructured ? compStructured.innerText : '';
        if (!text.trim()) return;
        navigator.clipboard.writeText(text).then(() => {
            if (typeof showToast === 'function') showToast('📋 Texto estructurado copiado', 'success');
        }).catch(() => {
            if (typeof showToast === 'function') showToast('❌ No se pudo copiar al portapapeles', 'error');
        });
    });

    // Panel-level print buttons
    function printPanelContent(htmlContent, title) {
        const printWin = window.open('', '_blank', 'width=800,height=600');
        if (!printWin) { if (typeof showToast === 'function') showToast('No se pudo abrir ventana de impresión', 'error'); return; }
        printWin.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
            <style>body{font-family:Georgia,serif;line-height:1.7;padding:2rem;color:#1a1a1a;max-width:800px;margin:0 auto;}
            h1,h2,h3{color:#0f766e;}p{margin:0.5em 0;}.no-data-field{color:#888;font-style:italic;}</style>
            </head><body>${htmlContent}</body></html>`);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => { printWin.print(); printWin.close(); }, 300);
    }

    document.getElementById('btnPrintOriginal')?.addEventListener('click', () => {
        if (!window._lastRawTranscription) return;
        const html = window._lastRawTranscription
            .split('\n').filter(l => l.trim())
            .map(l => `<p>${l}</p>`).join('');
        printPanelContent(html, 'Texto Original');
    });
    document.getElementById('btnPrintStructured')?.addEventListener('click', () => {
        const compStructured = document.getElementById('comparisonStructured');
        if (!compStructured || !compStructured.innerHTML.trim()) return;
        printPanelContent(compStructured.innerHTML, 'Informe Estructurado');
    });

    // Expose exit for reset handler
    window.exitComparisonMode = exitComparisonMode;

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

                    // Transcribe with Groq
                    if (typeof showToast === 'function') showToast('⏳ Transcribiendo audio adicional...', 'info', 3000);
                    try {
                        const apiKey = window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
                        if (!apiKey) {
                            showToast('❌ No hay API key configurada', 'error');
                            return;
                        }
                        const form = new FormData();
                        form.append('file', file);
                        form.append('model', 'whisper-large-v3');
                        form.append('language', 'es');
                        form.append('response_format', 'text');

                        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                            method: 'POST',
                            headers: { 'Authorization': 'Bearer ' + apiKey },
                            body: form
                        });

                        if (!res.ok) throw new Error('Error ' + res.status);
                        const newText = (await res.text()).trim();

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
                            }
                        }
                    } catch (err) {
                        if (typeof showToast === 'function') showToast('❌ Error al transcribir: ' + err.message, 'error');
                    }
                };

                _appendMediaRecorder.start();
                _appendRecording = true;
                btnAppendRecord.classList.add('recording-pulse');
                btnAppendRecord.title = '⏹ Detener grabación';

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
    }

    // Escape key — close any open modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (helpModal) helpModal.classList.remove('active');
            const wpModal = document.getElementById('workplaceModalOverlay');
            if (wpModal) wpModal.classList.remove('active');
            if (patientOverlay) patientOverlay.classList.remove('active');
            closePdfConfigModal();
            closePrintPreviewModal();
        }
    });
}

window.initShortcuts = function () {
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                document.getElementById('toggleFindReplace')?.click();
            }
        }
    });
}

window.initApiManagement = function () {
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const testApiKeyBtn = document.getElementById('testApiKey');
    const apiKeyInput   = document.getElementById('apiKeyInput');
    const apiTestResult = document.getElementById('apiTestResult');

    // Restaurar API key guardada al cargar la página
    const savedKey = localStorage.getItem('groq_api_key') || window.GROQ_API_KEY || '';
    if (savedKey) {
        window.GROQ_API_KEY = savedKey;
        if (apiKeyInput) {
            apiKeyInput.value = '••••••••••••••••';
            apiKeyInput.type = 'password';
            apiKeyInput.dataset.hasKey = 'true';
        }
        // Actualizar el status indicator
        if (typeof updateApiStatus === 'function') updateApiStatus(savedKey);

        // Validación silenciosa al inicio (2.5 s de delay para no bloquear el init)
        setTimeout(async () => {
            try {
                const res = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { 'Authorization': 'Bearer ' + savedKey }
                });
                if (res.status === 401) {
                    // Key almacenada pero inválida (revocada o expirada)
                    const banner = document.getElementById('apiKeyWarningBanner');
                    if (banner) banner.style.display = 'flex';
                    if (typeof updateApiStatus === 'function') updateApiStatus('');
                }
            } catch (_) {
                // Sin internet al inicio → no mostrar nada, la app funciona igual
            }
        }, 2500);
    }

    // Guardar API Key (con validación real contra Groq)
    if (saveApiKeyBtn && apiKeyInput) {
        saveApiKeyBtn.addEventListener('click', async () => {
            const key = apiKeyInput.value.trim();
            if (!key || key === '••••••••••••••••') {
                if (typeof showToast === 'function') showToast('⚠️ Ingresá una API Key válida', 'error');
                return;
            }
            if (!key.startsWith('gsk_')) {
                if (typeof showToast === 'function') showToast('❌ La API Key debe empezar con gsk_', 'error');
                return;
            }

            const origText = saveApiKeyBtn.textContent;
            saveApiKeyBtn.disabled = true;
            saveApiKeyBtn.textContent = '⏳ Validando...';

            try {
                const res = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { 'Authorization': 'Bearer ' + key }
                });

                if (res.status === 401) {
                    if (typeof showToast === 'function') showToast('❌ API Key inválida. No fue guardada.', 'error');
                    return;
                }

                if (res.ok) {
                    localStorage.setItem('groq_api_key', key);
                    window.GROQ_API_KEY = key;
                    if (typeof updateApiStatus === 'function') updateApiStatus(key);
                    if (typeof showToast === 'function') showToast('✅ Clave válida y guardada.', 'success');
                    return;
                }

                // Otro código HTTP inesperado
                throw new Error('HTTP ' + res.status);

            } catch (err) {
                if (err.message && err.message.startsWith('HTTP')) {
                    if (typeof showToast === 'function') showToast('⚠️ Error inesperado (' + err.message + '). Intentá de nuevo.', 'error');
                    return;
                }
                // Error de red / sin conexión
                const guardar = window.confirm('⚠️ No se pudo verificar la clave (sin conexión a internet).\n\n¿Guardar de todas formas?');
                if (guardar) {
                    localStorage.setItem('groq_api_key', key);
                    window.GROQ_API_KEY = key;
                    if (typeof updateApiStatus === 'function') updateApiStatus(key);
                    if (typeof showToast === 'function') showToast('💾 Clave guardada sin verificar (sin conexión).', 'warning');
                }
            } finally {
                saveApiKeyBtn.disabled = false;
                saveApiKeyBtn.textContent = origText;
            }
        });
    }

    // Probar conexión
    if (testApiKeyBtn) {
        testApiKeyBtn.addEventListener('click', async () => {
            if (typeof window.testGroqConnection !== 'function') return;

            testApiKeyBtn.disabled = true;
            testApiKeyBtn.textContent = '⏳';
            if (apiTestResult) {
                apiTestResult.style.display = 'block';
                apiTestResult.textContent = '⌛ Probando conexión...';
                apiTestResult.style.color = 'var(--text-secondary)';
            }

            try {
                const success = await window.testGroqConnection();
                if (apiTestResult) {
                    if (success) {
                        apiTestResult.textContent = '✅ Conexión exitosa';
                        apiTestResult.style.color = '#10b981';
                        if (typeof showToast === 'function') showToast('✅ Conexión exitosa con Groq', 'success');
                    } else {
                        apiTestResult.textContent = '❌ Error de conexión';
                        apiTestResult.style.color = '#ef4444';
                        if (typeof showToast === 'function') showToast('❌ Error de conexión', 'error');
                    }
                    setTimeout(() => { apiTestResult.style.display = 'none'; }, 5000);
                }
            } catch (error) {
                if (apiTestResult) {
                    apiTestResult.textContent = '❌ Error: ' + error.message;
                    apiTestResult.style.color = '#ef4444';
                }
            } finally {
                testApiKeyBtn.disabled = false;
                testApiKeyBtn.textContent = '🔌';
            }
        });
    }

    if (apiKeyInput) {
        apiKeyInput.addEventListener('focus', () => {
            if (apiKeyInput.dataset.hasKey) {
                apiKeyInput.value = '';
                apiKeyInput.type = 'text';
            }
        });

        apiKeyInput.addEventListener('blur', () => {
            if (apiKeyInput.value === '' && window.GROQ_API_KEY) {
                apiKeyInput.value = '••••••••••••••••';
                apiKeyInput.type = 'password';
            }
        });
    }
}

// ============ PROFESSIONAL PERSONALIZATION ============
window.applyProfessionalData = function (data) {
    if (!data) return;
    const { nombre, matricula, specialties } = data;

    // Header: ADMIN siempre mantiene su banner intacto
    const isAdmin = (typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN');
    const welcomeName = document.getElementById('doctorWelcomeName');
    if (welcomeName && !isAdmin) welcomeName.textContent = `Dr/a. ${nombre}`;

    // Locked display in metadata card
    const lockName = document.getElementById('lockNameDisplay');
    const lockMatricula = document.getElementById('lockMatriculaDisplay');
    if (lockName) lockName.textContent = nombre;
    if (lockMatricula) lockMatricula.textContent = matricula;

    // PDF Config Modal fields
    const pdfName = document.getElementById('pdfProfName');
    const pdfMatricula = document.getElementById('pdfProfMatricula');
    const pdfSpecialty = document.getElementById('pdfProfEspecialidad');

    if (pdfName) pdfName.value = nombre;
    if (pdfMatricula) pdfMatricula.value = matricula;
    if (pdfSpecialty) pdfSpecialty.value = Array.isArray(specialties) ? specialties.join(', ') : specialties;
}

window.updatePersonalization = function (data) {
    window.applyProfessionalData(data);
}

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+R: Re-estructurar con IA
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        const states = ['TRANSCRIBED', 'STRUCTURED', 'PREVIEWED'];
        if (states.includes(window.appState) && typeof autoStructure === 'function') {
            autoStructure({ silent: false });
        }
        return;
    }

    // Ctrl+Shift+S: Guardar configuración de impresión
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (typeof savePdfConfiguration === 'function') {
            savePdfConfiguration();
            if (typeof showToast === 'function') showToast('✅ Configuración guardada', 'success');
        }
        return;
    }

    // Ctrl+Shift+P: Previsualizar PDF
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        const states = ['TRANSCRIBED', 'STRUCTURED', 'PREVIEWED'];
        if (states.includes(window.appState) && typeof openPrintPreview === 'function') {
            openPrintPreview();
        }
        return;
    }

    // Ctrl+Shift+D: Descargar formato favorito
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const states = ['TRANSCRIBED', 'STRUCTURED', 'PREVIEWED'];
        if (states.includes(window.appState) && typeof window.downloadFile === 'function') {
            const fav = localStorage.getItem('preferred_download_format') || 'pdf';
            if (window.downloadPDF && fav === 'pdf') window.downloadPDF();
            else if (window.downloadRTF && fav === 'rtf') window.downloadRTF();
            else if (window.downloadTXT && fav === 'txt') window.downloadTXT();
            else if (window.downloadHTML && fav === 'html') window.downloadHTML();
        }
        return;
    }
});

// ============ AUTO-SAVE (cada 30s) ============
(function initAutoSave() {
    const AUTOSAVE_KEY = 'editor_autosave';
    const AUTOSAVE_META_KEY = 'editor_autosave_meta';
    const INTERVAL_MS = 30000;
    let _autoSaveTimer = null;

    function saveEditorContent() {
        const editor = document.getElementById('editor');
        if (!editor) return;
        const content = editor.innerHTML;
        if (!content || content.trim() === '' || content === '<br>') return;
        localStorage.setItem(AUTOSAVE_KEY, content);
        localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify({
            timestamp: Date.now(),
            mode: window.currentMode || 'normal',
            template: window.selectedTemplate || '',
            tabIndex: window.activeTabIndex || 0
        }));
    }

    function startAutoSave() {
        if (_autoSaveTimer) clearInterval(_autoSaveTimer);
        _autoSaveTimer = setInterval(saveEditorContent, INTERVAL_MS);
    }

    function restoreAutoSave() {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        let meta;
        try { meta = JSON.parse(localStorage.getItem(AUTOSAVE_META_KEY) || '{}'); }
        catch (_) { meta = {}; }
        if (!saved || !meta.timestamp) return;

        // Solo restaurar si tiene menos de 2 horas
        const ageMs = Date.now() - meta.timestamp;
        if (ageMs > 2 * 60 * 60 * 1000) {
            localStorage.removeItem(AUTOSAVE_KEY);
            localStorage.removeItem(AUTOSAVE_META_KEY);
            return;
        }

        const editor = document.getElementById('editor');
        if (!editor) return;
        // Solo ofrecer si el editor está vacío
        if (editor.innerText.trim().length > 0) return;

        const mins = Math.floor(ageMs / 60000);
        const timeLabel = mins < 1 ? 'menos de 1 min' : mins + ' min';

        // Mostrar botón de restaurar sesión
        const restoreBtn = document.getElementById('btnRestoreSession');
        if (restoreBtn) {
            restoreBtn.textContent = `♻️ Restaurar sesión anterior (hace ${timeLabel})`;
            restoreBtn.style.display = '';
            restoreBtn.onclick = () => {
                editor.innerHTML = saved;
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');
                if (typeof showToast === 'function') showToast('✅ Borrador restaurado', 'success', 2000);
                restoreBtn.style.display = 'none';
            };
        }

        // También mostrar toast discreto
        if (typeof showToast === 'function') {
            showToast(`♻️ Hay un borrador guardado (hace ${timeLabel}). Usá el botón para restaurarlo.`, 'info', 5000);
        }
    }

    // Exponer globalmente
    window.autoSaveEditorContent = saveEditorContent;

    // Intentar restaurar al cargar
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(restoreAutoSave, 500);
        startAutoSave();
    });

    // Guardar al cerrar/salir
    window.addEventListener('beforeunload', saveEditorContent);

    // Limpiar autosave al resetear
    const resetBtnEl = document.getElementById('resetBtn');
    if (resetBtnEl) {
        resetBtnEl.addEventListener('click', () => {
            localStorage.removeItem(AUTOSAVE_KEY);
            localStorage.removeItem(AUTOSAVE_META_KEY);
            // Ocultar botón restaurar si estaba visible
            const restoreBtn = document.getElementById('btnRestoreSession');
            if (restoreBtn) restoreBtn.style.display = 'none';
        });
    }
})();
