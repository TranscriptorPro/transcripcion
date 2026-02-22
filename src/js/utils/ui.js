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
        <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f1f5f9; font-family: sans-serif; text-align: center; padding: 2rem;">
            <h1 style="color: #0f766e; margin-bottom: 1rem;">💼 Suscripción</h1>
            <p style="font-size: 1.2rem; color: #475569; max-width: 500px;">${msg}</p>
            ${isContactRequired ? '<button onclick="window.location.reload()" class="btn btn-primary" style="margin-top: 2rem; padding: 1rem 2rem;">Reintentar</button>' : ''}
            <p style="margin-top: 2rem; font-size: 0.85rem; color: #94a3b8;">Contacta con el desarrollador para habilitar tu licencia.</p>
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

    // Workplace Modals (Basic Overlay Toggle)
    document.getElementById('btnAddWorkplace')?.addEventListener('click', () => {
        document.getElementById('workplaceModalOverlay')?.classList.add('active');
    });

    document.getElementById('btnCloseWorkplace')?.addEventListener('click', () => {
        document.getElementById('workplaceModalOverlay')?.classList.remove('active');
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

    if (btnSavePdfConfig) {
        btnSavePdfConfig.addEventListener('click', () => {
            if (typeof savePdfConfiguration === 'function') savePdfConfiguration();
        });
    }

    if (btnPreviewFromConfig) {
        btnPreviewFromConfig.addEventListener('click', () => {
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

    const closePrintPreviewModal = () => printPreviewOverlay?.classList.remove('active');

    if (closePrintPreview) closePrintPreview.addEventListener('click', closePrintPreviewModal);

    if (btnDownloadFromPreview) {
        btnDownloadFromPreview.addEventListener('click', () => {
            if (typeof downloadPDF === 'function') downloadPDF();
        });
    }

    if (printPreviewOverlay) {
        printPreviewOverlay.addEventListener('click', (e) => {
            if (e.target === printPreviewOverlay) closePrintPreviewModal();
        });
    }

    // Escape key — close any open modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (helpModal) helpModal.classList.remove('active');
            const wpModal = document.getElementById('workplaceModalOverlay');
            if (wpModal) wpModal.classList.remove('active');
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
    }

    // Guardar API Key
    if (saveApiKeyBtn && apiKeyInput) {
        saveApiKeyBtn.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (!key || key === '••••••••••••••••') {
                if (typeof showToast === 'function') showToast('⚠️ Ingresá una API Key válida', 'error');
                return;
            }
            if (!key.startsWith('gsk_')) {
                if (typeof showToast === 'function') showToast('❌ La API Key debe empezar con gsk_', 'error');
                return;
            }
            localStorage.setItem('groq_api_key', key);
            window.GROQ_API_KEY = key;
            if (typeof updateApiStatus === 'function') updateApiStatus(key);
            if (typeof showToast === 'function') showToast('✅ API Key guardada correctamente', 'success');
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

    // Header
    const welcomeName = document.getElementById('doctorWelcomeName');
    if (welcomeName) welcomeName.textContent = `Dr/a. ${nombre}`;

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
