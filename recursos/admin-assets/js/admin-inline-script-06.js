(function() {
    'use strict';

    const DEFAULT_ADDONS = {
        device_extra:        { key: 'device_extra', label: 'Dispositivo extra',           price: 8.99,  icon: '💻' },
        workplace_extra:     { key: 'workplace_extra', label: 'Lugar de trabajo extra',   price: 12.99, icon: '🏥' },
        professional_extra:  { key: 'professional_extra', label: 'Profesional extra',     price: 19.99, icon: '👨‍⚕️' },
        branding_normal:     { key: 'branding_normal', label: 'Branding (plan Normal)',   price: 14.99, icon: '🎨' },
        branding_pro:        { key: 'branding_pro', label: 'Branding (plan Pro)',         price: 9.99,  icon: '🎨' },
        template_individual: { key: 'template_individual', label: 'Plantilla individual', price: 3,     icon: '📄' },
        pack_small:          { key: 'pack_small', label: 'Pack pequeño (5 plantillas)',   price: 7,     icon: '📦' },
        pack_large:          { key: 'pack_large', label: 'Pack grande (todas)',           price: 12,    icon: '📦' }
    };

    let _extrasInitialized = false;
    let _addonsCache = null;

    function _clone(v) { return JSON.parse(JSON.stringify(v)); }
    function _merge(base, ext) {
        const out = _clone(base);
        if (!ext || typeof ext !== 'object') return out;
        Object.keys(ext).forEach((k) => out[k] = Object.assign({}, out[k] || {}, ext[k] || {}));
        return out;
    }

    function _authPayloadBase() {
        const base = {};
        try {
            const authStr = (typeof _getSessionAuthParams === 'function') ? _getSessionAuthParams() : '';
            authStr.split('&').filter(Boolean).forEach((pair) => {
                const parts = pair.split('=');
                const k = parts[0];
                const v = parts.slice(1).join('=');
                if (k) base[k] = decodeURIComponent(v || '');
            });
        } catch(_) {}
        if (!base.adminKey && !base.sessionToken) base.adminKey = 'ADMIN_SECRET_2026';
        return base;
    }

    async function _fetchAddonsFromBackend() {
        try {
            if (!window.CONFIG || !CONFIG.scriptUrl || CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') return null;
            const auth = (typeof _getSessionAuthParams === 'function') ? _getSessionAuthParams() : 'adminKey=ADMIN_SECRET_2026';
            const res = await fetch(`${CONFIG.scriptUrl}?action=admin_get_addons_config&${auth}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (data && !data.error && data.addons) return data.addons;
        } catch(_) {}
        return null;
    }

    async function _saveAddonsToBackend(addons) {
        if (!window.CONFIG || !CONFIG.scriptUrl || CONFIG.scriptUrl === 'PASTE_APPS_SCRIPT_URL_HERE') return false;
        try {
            const payload = Object.assign({ action: 'admin_save_addons_config', addons }, _authPayloadBase());
            const res = await fetch(CONFIG.scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            return !!(data && !data.error);
        } catch(_) {
            return false;
        }
    }

    async function _loadAddons() {
        const server = await _fetchAddonsFromBackend();
        if (server) {
            const merged = _merge(DEFAULT_ADDONS, server);
            localStorage.setItem('admin_addons_config', JSON.stringify(merged));
            _addonsCache = merged;
            return merged;
        }
        try {
            const raw = localStorage.getItem('admin_addons_config');
            if (raw) {
                const merged = _merge(DEFAULT_ADDONS, JSON.parse(raw));
                _addonsCache = merged;
                return merged;
            }
        } catch(_) {}
        _addonsCache = _clone(DEFAULT_ADDONS);
        return _clone(DEFAULT_ADDONS);
    }

    window._initExtrasEditor = async function() {
        if (_extrasInitialized) return;
        _extrasInitialized = true;

        const grid = document.getElementById('extrasEditorGrid');
        if (!grid) return;

        const addons = await _loadAddons();
        _renderExtrasEditor(grid, addons);

        document.getElementById('btnSaveExtras')?.addEventListener('click', async () => {
            const addonsToSave = _collectAddonsFromForm();
            localStorage.setItem('admin_addons_config', JSON.stringify(addonsToSave));
            _addonsCache = _clone(addonsToSave);

            const backendOk = await _saveAddonsToBackend(addonsToSave);
            if (backendOk) {
                if (typeof dashAlert === 'function') dashAlert('✅ Extras guardados en backend y local');
                else alert('Extras guardados');
            } else {
                if (typeof dashAlert === 'function') dashAlert('⚠️ Extras guardados solo en este navegador (backend no disponible)');
                else alert('Extras guardados localmente');
            }
        });

        document.getElementById('btnResetExtras')?.addEventListener('click', async () => {
            localStorage.removeItem('admin_addons_config');
            _addonsCache = _clone(DEFAULT_ADDONS);
            _renderExtrasEditor(grid, _clone(DEFAULT_ADDONS));
            await _saveAddonsToBackend(_clone(DEFAULT_ADDONS));
        });
    };

    function _renderExtrasEditor(grid, addons) {
        grid.innerHTML = '';
        for (const [key, addon] of Object.entries(addons)) {
            const card = document.createElement('div');
            card.style.cssText = 'background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:1.2rem;';
            card.innerHTML = `
                <h3 style="margin:0 0 .8rem;font-size:1rem;color:var(--text-primary);">${addon.icon || '📦'} ${addon.label || key}</h3>
                <label style="display:block;margin-bottom:.3rem;font-size:.85rem;color:var(--text-secondary);">Precio (USD)</label>
                <input type="number" step="0.01" min="0" data-addon="${key}" value="${addon.price ?? 0}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:1rem;">
            `;
            grid.appendChild(card);
        }
    }

    function _collectAddonsFromForm() {
        const addons = _addonsCache ? _clone(_addonsCache) : _clone(DEFAULT_ADDONS);
        for (const key of Object.keys(addons)) {
            const input = document.querySelector(`[data-addon="${key}"]`);
            if (input) addons[key].price = Number(input.value) || 0;
        }
        return addons;
    }
})();
    