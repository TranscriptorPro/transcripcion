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
    const body = document.body;
    body.innerHTML = `
        <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-main); font-family: sans-serif; text-align: center; padding: 2rem;">
            <h1 style="color: var(--primary, #0f766e); margin-bottom: 1rem;">💼 Suscripción</h1>
            <p style="font-size: 1.2rem; color: var(--text-secondary, #475569); max-width: 500px;">${msg}</p>
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

    if (apiKey) {
        apiStatus.className = 'api-status connected';
        apiStatus.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><span>Conectada ✓</span>';
        if (apiKeyInput) {
            apiKeyInput.value = '••••••••••••••••';
            apiKeyInput.dataset.hasKey = 'true';
        }
    } else {
        apiStatus.className = 'api-status disconnected';
        apiStatus.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg><span>No configurada</span>';
        if (apiKeyInput) {
            apiKeyInput.value = '';
            delete apiKeyInput.dataset.hasKey;
        }
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
        });
    }

    if (btnPreviewFromConfig) {
        btnPreviewFromConfig.addEventListener('click', () => {
            // Save config silently before opening preview
            if (typeof savePdfConfiguration === 'function') {
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
            // Guardar en el registro de pacientes
            if (typeof savePatientToRegistry === 'function') {
                savePatientToRegistry({ name, dni, age, sex, insurance, affiliateNum });
                if (typeof populatePatientDatalist === 'function') populatePatientDatalist();
            }
        });
    }

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
                btnRestoreOriginal.textContent = '↩';
                btnRestoreOriginal.title = 'Ver texto original';
                btnRestoreOriginal._showingOriginal = false;
            } else {
                // Mostrar original
                if (window._lastRawTranscription) {
                    window._lastStructuredHTML = editorEl.innerHTML;
                    editorEl.innerHTML = window._lastRawTranscription
                        .split('\n').filter(l => l.trim())
                        .map(l => `<p class="report-p">${l}</p>`).join('\n');
                    btnRestoreOriginal.textContent = '⟳';
                    btnRestoreOriginal.title = 'Volver al texto estructurado';
                    btnRestoreOriginal._showingOriginal = true;
                }
            }
            if (typeof updateWordCount === 'function') updateWordCount();
        });
    }

    // Medical check button
    const btnMedicalCheck = document.getElementById('btnMedicalCheck');
    if (btnMedicalCheck) {
        btnMedicalCheck.addEventListener('click', () => {
            if (typeof checkMedicalTerminology === 'function') checkMedicalTerminology();
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
                const guardar = window.confirm('⚠️ No se pudo verificar la clave (sin conexión a internet).\n\n¿Gauardar de todas formas?');
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
