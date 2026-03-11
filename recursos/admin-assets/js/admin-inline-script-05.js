(function() {
    'use strict';

    const DEFAULT_PLANS = {
        trial:  { key: 'trial', label: 'Trial', icon: '🧪', price: 'Gratis', period: '15 días', monthly: 0, annual: 0, features: ['Todo de Pro por 15 días'], type: 'TRIAL', hasProMode: true, hasDashboard: false, canGenerateApps: false, maxDevices: 3, durationDays: 15, historial: 30, workplaces: 2, outputProfiles: 3, maxProfessionals: 1, templateMode: 'manual', templateLimit: 3, packLimit: 0, specialtyExtraLimit: 0, pdfLogo: true, pdfColor: false },
        normal: { key: 'normal', label: 'Normal', icon: '📝', price: '$102.99', period: 'pago único + $10/mes', monthly: 10, annual: 100, features: ['Transcripción de audio'], type: 'NORMAL', hasProMode: false, hasDashboard: false, canGenerateApps: false, maxDevices: 1, durationDays: 30, historial: 10, workplaces: 1, outputProfiles: 1, maxProfessionals: 1, templateMode: 'manual', templateLimit: 3, packLimit: 0, specialtyExtraLimit: 0, pdfLogo: false, pdfColor: false },
        pro:    { key: 'pro', label: 'Pro', icon: '⚡', price: '$152.99', period: 'pago único + $15/mes', monthly: 15, annual: 150, features: ['Estructuración automática con IA'], type: 'PRO', hasProMode: true, hasDashboard: true, canGenerateApps: false, maxDevices: 3, durationDays: 30, historial: 30, workplaces: 2, outputProfiles: 3, maxProfessionals: 1, templateMode: 'specialty', templateLimit: -1, packLimit: 0, specialtyExtraLimit: 10, pdfLogo: true, pdfColor: false },
        clinic: { key: 'clinic', label: 'Clínica', icon: '🏥', price: '$352.99', period: 'pago único + $30/mes', monthly: 30, annual: 300, features: ['Todo de Pro más:'], type: 'PRO', hasProMode: true, hasDashboard: true, canGenerateApps: true, maxDevices: 5, durationDays: 365, historial: -1, workplaces: 1, outputProfiles: -1, maxProfessionals: 5, templateMode: 'packs', templateLimit: -1, packLimit: 3, specialtyExtraLimit: 0, pdfLogo: true, pdfColor: true },
        gift:   { key: 'gift', label: 'Gift', icon: '🎁', price: '$0', period: 'regalo', monthly: 0, annual: 0, features: ['Acceso total'], type: 'PRO', hasProMode: true, hasDashboard: true, canGenerateApps: false, maxDevices: 10, durationDays: 365, historial: -1, workplaces: 3, outputProfiles: -1, maxProfessionals: 1, templateMode: 'all', templateLimit: -1, packLimit: 0, specialtyExtraLimit: 0, pdfLogo: true, pdfColor: true },
        enterprise: { key: 'enterprise', label: 'Enterprise', icon: '🏢', price: '$999', period: 'mensual', monthly: 999, annual: 9999, features: ['Configuración corporativa'], type: 'PRO', hasProMode: true, hasDashboard: true, canGenerateApps: true, maxDevices: 999, durationDays: 365, historial: -1, workplaces: 999, outputProfiles: -1, maxProfessionals: 999, templateMode: 'all', templateLimit: -1, packLimit: 0, specialtyExtraLimit: 0, pdfLogo: true, pdfColor: true }
    };

    let _plansInitialized = false;
    let _plansCache = null;

    function _clone(v) { return JSON.parse(JSON.stringify(v)); }

    function _merge(base, ext) {
        const out = _clone(base);
        if (!ext || typeof ext !== 'object') return out;
        Object.keys(ext).forEach((key) => {
            const val = ext[key];
            if (val && typeof val === 'object' && !Array.isArray(val)) {
                out[key] = Object.assign({}, out[key] || {}, val);
            } else {
                out[key] = val;
            }
        });
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

    function _getScriptUrl() {
        const cfg = (typeof window !== 'undefined' && window.CONFIG) ? window.CONFIG : null;
        const url = cfg && typeof cfg.scriptUrl === 'string' ? cfg.scriptUrl.trim() : '';
        if (!url || url === 'PASTE_APPS_SCRIPT_URL_HERE') return '';
        return url;
    }

    async function _fetchPlansFromBackend() {
        try {
            const scriptUrl = _getScriptUrl();
            if (!scriptUrl) return null;
            const auth = (typeof _getSessionAuthParams === 'function') ? _getSessionAuthParams() : 'adminKey=ADMIN_SECRET_2026';
            const res = await fetch(`${scriptUrl}?action=admin_get_plans_config&${auth}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (data && !data.error && data.plans) return data.plans;
        } catch(_) {}
        return null;
    }

    async function _savePlansToBackend(plans) {
        const scriptUrl = _getScriptUrl();
        if (!scriptUrl) return { ok: false, reason: 'config' };
        try {
            const payload = Object.assign({ action: 'admin_save_plans_config', plans }, _authPayloadBase());
            const res = await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) return { ok: false, reason: `http_${res.status}` };
            const data = await res.json();
            if (data && !data.error) return { ok: true };
            const err = String((data && data.error) || '').toLowerCase();
            if (err.includes('unauthorized') || err.includes('session') || err.includes('token')) return { ok: false, reason: 'auth' };
            return { ok: false, reason: data && data.error ? String(data.error) : 'backend' };
        } catch(e) {
            return { ok: false, reason: e && e.message ? String(e.message) : 'network' };
        }
    }

    async function _loadPlans() {
        const serverPlans = await _fetchPlansFromBackend();
        if (serverPlans) {
            const merged = _merge(DEFAULT_PLANS, serverPlans);
            localStorage.setItem('admin_plans_config', JSON.stringify(merged));
            _plansCache = merged;
            window.__ADMIN_PLANS_CONFIG = _clone(merged);
            return merged;
        }

        try {
            const stored = localStorage.getItem('admin_plans_config');
            if (stored) {
                const merged = _merge(DEFAULT_PLANS, JSON.parse(stored));
                _plansCache = merged;
                window.__ADMIN_PLANS_CONFIG = _clone(merged);
                return merged;
            }
        } catch(_) {}

        _plansCache = _clone(DEFAULT_PLANS);
        window.__ADMIN_PLANS_CONFIG = _clone(DEFAULT_PLANS);
        return _clone(DEFAULT_PLANS);
    }

    window._getAdminPlansConfig = function() {
        if (_plansCache) return _clone(_plansCache);
        try {
            const stored = localStorage.getItem('admin_plans_config');
            if (stored) return _merge(DEFAULT_PLANS, JSON.parse(stored));
        } catch(_) {}
        return _clone(DEFAULT_PLANS);
    };

    window._initPlansEditor = async function() {
        if (_plansInitialized) return;
        _plansInitialized = true;
        const grid = document.getElementById('plansEditorGrid');
        if (!grid) return;

        const plans = await _loadPlans();
        _renderPlansEditor(grid, plans);

        document.getElementById('btnSavePlans')?.addEventListener('click', async () => {
            const plansToSave = _collectPlansFromForm();
            localStorage.setItem('admin_plans_config', JSON.stringify(plansToSave));
            _plansCache = _clone(plansToSave);
            window.__ADMIN_PLANS_CONFIG = _clone(plansToSave);

            const backend = await _savePlansToBackend(plansToSave);
            if (backend.ok) {
                if (typeof dashAlert === 'function') dashAlert('✅ Planes guardados en backend y local');
                else alert('Planes guardados');
            } else {
                let msg = '⚠️ Planes guardados solo en este navegador';
                if (backend.reason === 'auth') msg += ' (sesión admin expirada/no autorizada)';
                else if (backend.reason === 'config') msg += ' (scriptUrl no configurada)';
                else msg += ' (error backend/red)';
                if (typeof dashAlert === 'function') dashAlert(msg);
                else alert('Planes guardados localmente');
            }
        });

        document.getElementById('btnResetPlans')?.addEventListener('click', async () => {
            localStorage.removeItem('admin_plans_config');
            _plansCache = _clone(DEFAULT_PLANS);
            window.__ADMIN_PLANS_CONFIG = _clone(DEFAULT_PLANS);
            _renderPlansEditor(grid, _clone(DEFAULT_PLANS));
            await _savePlansToBackend(_clone(DEFAULT_PLANS));
        });
    };

    function _renderPlansEditor(grid, plans) {
        grid.innerHTML = '';
        for (const [key, plan] of Object.entries(plans)) {
            const card = document.createElement('div');
            card.style.cssText = 'background:var(--bg-card,#1e293b);border:1px solid var(--border,#334155);border-radius:12px;padding:1.5rem;';
            card.innerHTML = `
                <h3 style="margin:0 0 1rem;color:var(--text-primary);">${plan.icon || '📌'} ${plan.label || key}</h3>
                <div style="display:flex;flex-direction:column;gap:0.75rem;">
                    <label style="font-size:.85rem;color:var(--text-secondary);">Nombre visible
                        <input type="text" data-plan="${key}" data-field="label" value="${plan.label || ''}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Ícono
                        <input type="text" data-plan="${key}" data-field="icon" value="${plan.icon || ''}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Tipo técnico (TRIAL/NORMAL/PRO)
                        <input type="text" data-plan="${key}" data-field="type" value="${plan.type || ''}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Precio principal
                        <input type="text" data-plan="${key}" data-field="price" value="${plan.price || ''}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Período texto
                        <input type="text" data-plan="${key}" data-field="period" value="${plan.period || ''}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Mensual (USD)
                        <input type="number" step="0.01" data-plan="${key}" data-field="monthly" value="${plan.monthly ?? 0}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Anual (USD)
                        <input type="number" step="0.01" data-plan="${key}" data-field="annual" value="${plan.annual ?? 0}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Max dispositivos
                        <input type="number" data-plan="${key}" data-field="maxDevices" value="${plan.maxDevices ?? 1}" min="1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Duración (días)
                        <input type="number" data-plan="${key}" data-field="durationDays" value="${plan.durationDays ?? 30}" min="1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Historial (-1 = ilimitado)
                        <input type="number" data-plan="${key}" data-field="historial" value="${plan.historial ?? 10}" min="-1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Lugares de trabajo
                        <input type="number" data-plan="${key}" data-field="workplaces" value="${plan.workplaces ?? 1}" min="1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Perfiles de salida (-1 = ilimitado)
                        <input type="number" data-plan="${key}" data-field="outputProfiles" value="${plan.outputProfiles ?? 1}" min="-1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Máx profesionales
                        <input type="number" data-plan="${key}" data-field="maxProfessionals" value="${plan.maxProfessionals ?? 1}" min="1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Modo templates
                        <select data-plan="${key}" data-field="templateMode" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                            <option value="manual" ${plan.templateMode === 'manual' ? 'selected' : ''}>manual (selección directa)</option>
                            <option value="specialty" ${plan.templateMode === 'specialty' ? 'selected' : ''}>specialty (por especialidad)</option>
                            <option value="packs" ${plan.templateMode === 'packs' ? 'selected' : ''}>packs (categorías)</option>
                            <option value="all" ${plan.templateMode === 'all' ? 'selected' : ''}>all (todas)</option>
                        </select>
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Límite templates directos (-1 = ilimitado)
                        <input type="number" data-plan="${key}" data-field="templateLimit" value="${plan.templateLimit ?? -1}" min="-1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Límite packs
                        <input type="number" data-plan="${key}" data-field="packLimit" value="${plan.packLimit ?? 0}" min="0" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Extras sobre especialidad
                        <input type="number" data-plan="${key}" data-field="specialtyExtraLimit" value="${plan.specialtyExtraLimit ?? 0}" min="0" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" data-plan="${key}" data-field="hasProMode" ${plan.hasProMode ? 'checked' : ''}> Incluye Modo Pro
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" data-plan="${key}" data-field="hasDashboard" ${plan.hasDashboard ? 'checked' : ''}> Incluye Dashboard
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" data-plan="${key}" data-field="canGenerateApps" ${plan.canGenerateApps ? 'checked' : ''}> Puede generar apps clone
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" data-plan="${key}" data-field="pdfLogo" ${plan.pdfLogo !== false ? 'checked' : ''}> PDF con logo
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" data-plan="${key}" data-field="pdfColor" ${plan.pdfColor ? 'checked' : ''}> PDF con color personalizado
                    </label>
                    <label style="font-size:.85rem;color:var(--text-secondary);">Features (una por línea)
                        <textarea data-plan="${key}" data-field="features" rows="5" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;resize:vertical;font-family:inherit;font-size:.85rem;">${(plan.features || []).join('\n')}</textarea>
                    </label>
                </div>
            `;
            grid.appendChild(card);
        }
    }

    function _num(planKey, field, fallback) {
        const el = document.querySelector(`[data-plan="${planKey}"][data-field="${field}"]`);
        if (!el) return fallback;
        const n = Number(el.value);
        return Number.isFinite(n) ? n : fallback;
    }

    function _str(planKey, field, fallback) {
        const el = document.querySelector(`[data-plan="${planKey}"][data-field="${field}"]`);
        if (!el) return fallback;
        return String(el.value || fallback || '').trim();
    }

    function _bool(planKey, field, fallback) {
        const el = document.querySelector(`[data-plan="${planKey}"][data-field="${field}"]`);
        if (!el) return fallback;
        return !!el.checked;
    }

    function _collectPlansFromForm() {
        const plans = _getAdminPlansConfig();
        Object.keys(plans).forEach((key) => {
            plans[key].label = _str(key, 'label', plans[key].label || key);
            plans[key].icon = _str(key, 'icon', plans[key].icon || '📌');
            plans[key].type = _str(key, 'type', plans[key].type || 'NORMAL').toUpperCase();
            plans[key].price = _str(key, 'price', plans[key].price || '');
            plans[key].period = _str(key, 'period', plans[key].period || '');
            plans[key].monthly = _num(key, 'monthly', plans[key].monthly || 0);
            plans[key].annual = _num(key, 'annual', plans[key].annual || 0);
            plans[key].maxDevices = _num(key, 'maxDevices', plans[key].maxDevices || 1);
            plans[key].durationDays = _num(key, 'durationDays', plans[key].durationDays || 30);
            plans[key].historial = _num(key, 'historial', plans[key].historial || 10);
            plans[key].workplaces = _num(key, 'workplaces', plans[key].workplaces || 1);
            plans[key].outputProfiles = _num(key, 'outputProfiles', plans[key].outputProfiles || 1);
            plans[key].maxProfessionals = _num(key, 'maxProfessionals', plans[key].maxProfessionals || 1);
            plans[key].templateMode = _str(key, 'templateMode', plans[key].templateMode || 'manual').toLowerCase();
            plans[key].templateLimit = _num(key, 'templateLimit', plans[key].templateLimit ?? -1);
            plans[key].packLimit = _num(key, 'packLimit', plans[key].packLimit || 0);
            plans[key].specialtyExtraLimit = _num(key, 'specialtyExtraLimit', plans[key].specialtyExtraLimit || 0);
            plans[key].hasProMode = _bool(key, 'hasProMode', !!plans[key].hasProMode);
            plans[key].hasDashboard = _bool(key, 'hasDashboard', !!plans[key].hasDashboard);
            plans[key].canGenerateApps = _bool(key, 'canGenerateApps', !!plans[key].canGenerateApps);
            plans[key].pdfLogo = _bool(key, 'pdfLogo', plans[key].pdfLogo !== false);
            plans[key].pdfColor = _bool(key, 'pdfColor', !!plans[key].pdfColor);
            const featEl = document.querySelector(`[data-plan="${key}"][data-field="features"]`);
            plans[key].features = featEl ? featEl.value.split('\n').map(s => s.trim()).filter(Boolean) : (plans[key].features || []);
        });
        return plans;
    }
})();
    