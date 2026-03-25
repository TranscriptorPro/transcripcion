// ============ UI API STATUS/KEY MANAGEMENT ============
window.initApiManagement = function () {
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const testApiKeyBtn = document.getElementById('testApiKey');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiTestResult = document.getElementById('apiTestResult');

    function isClinicManagedRuntime() {
        try {
            const url = new URL(window.location.href);
            if (String(url.searchParams.get('id') || '').trim()) return true;
        } catch (_) {}

        try {
            const cfg = JSON.parse(localStorage.getItem('client_config_stored') || '{}') || {};
            const planCode = String(cfg.planCode || cfg.plan || '').trim().toLowerCase();
            const type = String(cfg.type || '').trim().toLowerCase();
            if (planCode === 'clinic' || type === 'clinic' || cfg.canGenerateApps === true) return true;
        } catch (_) {}

        return false;
    }

    function normalizeKey(key) {
        if (typeof window.normalizeGroqApiKey === 'function') {
            return window.normalizeGroqApiKey(key);
        }
        const raw = String(key || '').trim();
        return /^gsk_/i.test(raw) ? ('gsk_' + raw.slice(4)) : raw;
    }

    // Restaurar API key guardada al cargar la pagina
    const savedKey = (typeof window.getResolvedGroqApiKey === 'function')
        ? window.getResolvedGroqApiKey()
        : (window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '');
    if (savedKey) {
        window.GROQ_API_KEY = savedKey;
        if (apiKeyInput) {
            apiKeyInput.value = '••••••••••••••••';
            apiKeyInput.type = 'password';
            apiKeyInput.dataset.hasKey = 'true';
        }
        // Actualizar el status indicator
        if (typeof updateApiStatus === 'function') updateApiStatus(savedKey);

        // Validacion silenciosa al inicio (2.5 s de delay para no bloquear el init)
        setTimeout(async () => {
            try {
                const res = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { Authorization: 'Bearer ' + savedKey }
                });
                if (res.status === 401) {
                    // Key almacenada pero invalida (revocada o expirada).
                    // En modo CLINIC la key es gestionada por el admin de la clínica
                    // (viene del backend), no por el usuario final. Si hay una key
                    // stale inválida, la eliminamos silenciosamente en lugar de
                    // mostrar el banner de configuración al usuario.
                    if (isClinicManagedRuntime()) {
                        if (typeof window.clearGroqApiKey === 'function') {
                            window.clearGroqApiKey('clinic-invalid-stale-key');
                        } else {
                            localStorage.removeItem('groq_api_key');
                            window.GROQ_API_KEY = '';
                        }
                        const banner = document.getElementById('apiKeyWarningBanner');
                        if (banner) banner.style.display = 'none';
                        if (typeof updateApiStatus === 'function') updateApiStatus('');
                        return; // no mostrar banner en CLINIC/clone
                    }
                    // Key almacenada pero invalida (revocada o expirada)
                    const banner = document.getElementById('apiKeyWarningBanner');
                    if (banner) banner.style.display = 'flex';
                    if (typeof updateApiStatus === 'function') updateApiStatus('');
                }
            } catch (_) {
                // Sin internet al inicio: no mostrar nada, la app funciona igual
            }
        }, 2500);
    }

    // Guardar API Key (con validacion real contra Groq)
    if (saveApiKeyBtn && apiKeyInput) {
        saveApiKeyBtn.addEventListener('click', async () => {
            const key = normalizeKey(apiKeyInput.value);
            apiKeyInput.value = key;
            if (!key || key === '••••••••••••••••') {
                if (typeof showToast === 'function') showToast('⚠️ Ingresá una API Key válida', 'error');
                return;
            }
            if (!/^gsk_/i.test(key)) {
                if (typeof showToast === 'function') showToast('❌ La API Key debe empezar con gsk_', 'error');
                return;
            }

            const origText = saveApiKeyBtn.textContent;
            saveApiKeyBtn.disabled = true;
            saveApiKeyBtn.textContent = '⏳ Validando...';
            saveApiKeyBtn.style.fontSize = '0.7rem';

            try {
                const res = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { Authorization: 'Bearer ' + key }
                });

                if (res.status === 401) {
                    if (typeof showToast === 'function') showToast('❌ API Key inválida. No fue guardada.', 'error');
                    return;
                }

                if (res.ok) {
                    if (typeof window.setGroqApiKey === 'function') {
                        window.setGroqApiKey(key, { source: 'ui-api-save-verified' });
                    } else {
                        // Fallback defensivo: state.js deberia exponer setGroqApiKey.
                        if (typeof appDB !== 'undefined') appDB.set('groq_api_key', key);
                        localStorage.setItem('groq_api_key', key);
                        window.GROQ_API_KEY = key;
                    }
                    if (typeof updateApiStatus === 'function') updateApiStatus(key);
                    if (typeof showToast === 'function') showToast('✅ Clave válida y guardada.', 'success');
                    return;
                }

                // Otro codigo HTTP inesperado
                throw new Error('HTTP ' + res.status);
            } catch (err) {
                if (err.message && err.message.startsWith('HTTP')) {
                    if (typeof showToast === 'function') showToast('⚠️ Error inesperado (' + err.message + '). Intentá de nuevo.', 'error');
                    return;
                }
                // Error de red / sin conexion
                const guardar = await window.showCustomConfirm('⚠️ Sin conexión', 'No se pudo verificar la clave (sin conexión a internet).\n\n¿Guardar de todas formas?');
                if (guardar) {
                    if (typeof window.setGroqApiKey === 'function') {
                        window.setGroqApiKey(key, { source: 'ui-api-save-offline' });
                    } else {
                        // Fallback defensivo: state.js deberia exponer setGroqApiKey.
                        if (typeof appDB !== 'undefined') appDB.set('groq_api_key', key);
                        localStorage.setItem('groq_api_key', key);
                        window.GROQ_API_KEY = key;
                    }
                    if (typeof updateApiStatus === 'function') updateApiStatus(key);
                    if (typeof showToast === 'function') showToast('💾 Clave guardada sin verificar (sin conexión).', 'warning');
                }
            } finally {
                saveApiKeyBtn.disabled = false;
                saveApiKeyBtn.textContent = origText;
                saveApiKeyBtn.style.fontSize = '';
            }
        });
    }

    // Probar conexion
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
        apiKeyInput.setAttribute('autocapitalize', 'none');
        apiKeyInput.setAttribute('autocorrect', 'off');
        apiKeyInput.setAttribute('spellcheck', 'false');

        apiKeyInput.addEventListener('input', () => {
            const v = apiKeyInput.value;
            if (/^gsk_/i.test(v) && !v.startsWith('gsk_')) {
                apiKeyInput.value = normalizeKey(v);
            }
        });

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
};
