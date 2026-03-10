// Settings API Utils
// Encapsulates API key actions and status rendering in settings modal.
(function () {
    'use strict';

    function setApiDot(ok) {
        const dot = document.getElementById('settingsApiDot');
        if (!dot) return;
        dot.className = 'stg-status ' + (ok ? 'ok' : 'fail');
    }

    function populateApiKeyStatus() {
        const key = (typeof window.getResolvedGroqApiKey === 'function')
            ? window.getResolvedGroqApiKey()
            : (window.GROQ_API_KEY || localStorage.getItem('groq_api_key') || '');
        const input = document.getElementById('settingsApiKeyInput');
        if (input && key) input.value = key;

        const statusEl = document.getElementById('settingsApiStatus');
        if (statusEl) {
            if (key) {
                statusEl.className = 'api-status connected';
                statusEl.innerHTML = '<span>✅ Configurada</span>';
            } else {
                statusEl.className = 'api-status disconnected';
                statusEl.innerHTML = '<span>❌ No configurada</span>';
            }
        }
        setApiDot(!!key);
    }

    function initApiKeySection() {
        const saveBtn = document.getElementById('settingsSaveApiKey');
        const testBtn = document.getElementById('settingsTestApiKey');
        const input = document.getElementById('settingsApiKeyInput');

        if (saveBtn && input) {
            saveBtn.addEventListener('click', () => {
                const key = input.value.trim();
                if (!key) {
                    if (typeof showToast === 'function') showToast('Ingresá una API key válida', 'error');
                    return;
                }
                if (typeof window.setGroqApiKey === 'function') {
                    window.setGroqApiKey(key, { source: 'settings-save' });
                } else {
                    // Fallback defensivo: state.js deberia exponer setGroqApiKey.
                    localStorage.setItem('groq_api_key', key);
                    if (typeof appDB !== 'undefined') appDB.set('groq_api_key', key);
                    window.GROQ_API_KEY = key;
                }
                if (typeof updateApiStatus === 'function') updateApiStatus(key);
                setApiDot(true);
                populateApiKeyStatus();
                if (typeof showToast === 'function') showToast('✅ API Key guardada', 'success');
            });
        }

        if (testBtn && input) {
            testBtn.addEventListener('click', async () => {
                const key = input.value.trim()
                    || (typeof window.getResolvedGroqApiKey === 'function' ? window.getResolvedGroqApiKey() : (window.GROQ_API_KEY || localStorage.getItem('groq_api_key')));
                if (!key) {
                    if (typeof showToast === 'function') showToast('Ingresá una API key primero', 'error');
                    return;
                }

                const resultEl = document.getElementById('settingsApiTestResult');
                if (resultEl) {
                    resultEl.style.display = 'block';
                    resultEl.innerHTML = '<span style="color: var(--text-secondary);">⏳ Probando conexión...</span>';
                }

                try {
                    const resp = await fetch('https://api.groq.com/openai/v1/models', {
                        headers: { 'Authorization': 'Bearer ' + key }
                    });
                    if (resp.ok) {
                        if (resultEl) resultEl.innerHTML = '<span style="color: #22c55e; font-weight: 600;">✅ Conexión exitosa</span>';
                        setApiDot(true);
                        if (typeof showToast === 'function') showToast('✅ Conexión con Groq OK', 'success');
                    } else {
                        if (resultEl) resultEl.innerHTML = '<span style="color: #ef4444; font-weight: 600;">❌ Key inválida o expirada</span>';
                        setApiDot(false);
                    }
                } catch (_) {
                    if (resultEl) resultEl.innerHTML = '<span style="color: #ef4444;">❌ Error de red</span>';
                    setApiDot(false);
                }
            });
        }
    }

    window.SettingsApiUtils = {
        initApiKeySection,
        populateApiKeyStatus
    };
})();
