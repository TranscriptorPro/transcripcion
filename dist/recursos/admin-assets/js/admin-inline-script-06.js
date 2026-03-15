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
    let _purchasesInitialized = false;

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

    function _getScriptUrl() {
        const cfg = (typeof window !== 'undefined' && window.CONFIG) ? window.CONFIG : null;
        const url = cfg && typeof cfg.scriptUrl === 'string' ? cfg.scriptUrl.trim() : '';
        if (!url || url === 'PASTE_APPS_SCRIPT_URL_HERE') return '';
        return url;
    }

    async function _fetchAddonsFromBackend() {
        try {
            const scriptUrl = _getScriptUrl();
            if (!scriptUrl) return null;
            const auth = (typeof _getSessionAuthParams === 'function') ? _getSessionAuthParams() : 'adminKey=ADMIN_SECRET_2026';
            const res = await fetch(`${scriptUrl}?action=admin_get_addons_config&${auth}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (data && !data.error && data.addons) return data.addons;
        } catch(_) {}
        return null;
    }

    async function _saveAddonsToBackend(addons) {
        const scriptUrl = _getScriptUrl();
        if (!scriptUrl) return { ok: false, reason: 'config' };
        try {
            const payload = Object.assign({ action: 'admin_save_addons_config', addons }, _authPayloadBase());
            const res = await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) return { ok: false, reason: `http_${res.status}` };
            const data = await res.json();
            if (data && !data.error) return { ok: true };
            const err = String((data && data.error) || '').toLowerCase();
            if (err.includes('unauthorized') || err.includes('session') || err.includes('token')) return { ok: false, reason: 'auth' };
            return { ok: false, reason: data && data.error ? String(data.error) : 'backend' };
        } catch(e) {
            // POST may have saved but CORS redirect blocked the response — verify with GET
            try {
                const verify = await _fetchAddonsFromBackend();
                if (verify) return { ok: true };
            } catch(_v) {}
            return { ok: false, reason: e && e.message ? String(e.message) : 'network' };
        }
    }

    async function _postBackend(payload) {
        const scriptUrl = _getScriptUrl();
        if (!scriptUrl) return { error: 'scriptUrl no configurada' };
        const body = Object.assign({}, payload, _authPayloadBase());
        const res = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(body)
        });
        if (!res.ok) return { error: `HTTP ${res.status}` };
        return await res.json();
    }

    async function _fetchPurchasesFromBackend() {
        const scriptUrl = _getScriptUrl();
        if (!scriptUrl) return [];
        const auth = (typeof _getSessionAuthParams === 'function') ? _getSessionAuthParams() : 'adminKey=ADMIN_SECRET_2026';
        const res = await fetch(`${scriptUrl}?action=admin_list_purchases&${auth}`);
        if (!res.ok) return [];
        const data = await res.json();
        if (data && !data.error && Array.isArray(data.purchases)) return data.purchases;
        return [];
    }

    function _renderPurchases(container, purchases) {
        const pending = purchases.filter(p => String(p.Estado || '').toLowerCase() !== 'aplicado');
        container.innerHTML = `
            <div style="margin-top:2rem;border-top:1px dashed var(--border);padding-top:1.2rem;">
                <h3 style="margin:0 0 .4rem;color:var(--text-primary);">🧾 Compras desde clones</h3>
                <p style="color:var(--text-secondary);margin:0 0 .8rem;font-size:.88rem;">Solicitudes de upgrade/add-ons. Flujo: pendiente pago → pago confirmado → aplicado.</p>
                <div id="extrasPurchasesList" style="display:flex;flex-direction:column;gap:.6rem;"></div>
            </div>
        `;

        const list = container.querySelector('#extrasPurchasesList');
        if (!list) return;

        if (!pending.length) {
            list.innerHTML = '<div style="padding:.8rem;border:1px solid var(--border);border-radius:10px;color:var(--text-secondary);">Sin compras pendientes por gestionar.</div>';
            return;
        }

        list.innerHTML = pending.map((p) => {
            const estado = String(p.Estado || '').toLowerCase();
            const canMarkPaid = estado === 'pendiente_pago';
            const canApprove = estado === 'pago_confirmado';
            const amount = Number(p.Importe_Estimado || 0);
            const estLabel = estado === 'pago_confirmado' ? '💳 Pago confirmado' : '⏳ Pendiente de pago';
            const date = p.Fecha_Solicitud ? new Date(p.Fecha_Solicitud).toLocaleString('es-AR') : '—';
            return `
                <div style="border:1px solid var(--border);border-radius:10px;padding:.75rem;background:var(--bg-secondary);">
                    <div style="display:flex;justify-content:space-between;gap:.5rem;align-items:center;">
                        <div>
                            <strong style="color:var(--text-primary);">${p.Nombre || p.ID_Medico || 'Usuario'}</strong>
                            <span style="font-size:.78rem;color:var(--text-secondary);margin-left:.5rem;">${estLabel}</span>
                        </div>
                        <div style="font-weight:700;color:var(--text-primary);">${amount.toFixed(2)} ${p.Moneda || 'USD'}</div>
                    </div>
                    <div style="font-size:.8rem;color:var(--text-secondary);margin-top:.35rem;">${p.ID_Compra || '—'} · ${date} · ${String(p.Plan_Actual || '').toUpperCase()} → ${String(p.Plan_Solicitado || '').toUpperCase()}</div>
                    <div style="display:flex;gap:.45rem;margin-top:.6rem;flex-wrap:wrap;">
                        ${canMarkPaid ? `<button class="btn-secondary" data-action="paid" data-purchase="${p.ID_Compra}" style="padding:6px 10px;">💳 Marcar pagado</button>` : ''}
                        ${canApprove ? `<button class="btn-primary" data-action="approve" data-purchase="${p.ID_Compra}" style="padding:6px 10px;">✅ Aprobar y aplicar</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async function _initPurchasesPanel() {
        if (_purchasesInitialized) return;
        _purchasesInitialized = true;
        const extrasTabContainer = document.querySelector('#tab-extras .container');
        if (!extrasTabContainer) return;

        let holder = document.getElementById('extrasPurchasesSection');
        if (!holder) {
            holder = document.createElement('div');
            holder.id = 'extrasPurchasesSection';
            extrasTabContainer.appendChild(holder);
        }

        const refresh = async () => {
            try {
                const purchases = await _fetchPurchasesFromBackend();
                _renderPurchases(holder, purchases);
            } catch (e) {
                holder.innerHTML = `<div style="margin-top:1rem;color:#ef4444;">Error cargando compras: ${String(e.message || e)}</div>`;
            }
        };

        holder.addEventListener('click', async (ev) => {
            const btn = ev.target && ev.target.closest ? ev.target.closest('button[data-action]') : null;
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const purchaseId = btn.getAttribute('data-purchase');
            if (!purchaseId) return;
            btn.disabled = true;
            try {
                let data = null;
                if (action === 'paid') {
                    data = await _postBackend({ action: 'admin_mark_purchase_paid', purchaseId });
                } else if (action === 'approve') {
                    data = await _postBackend({ action: 'admin_approve_purchase', purchaseId });
                }
                if (data && data.error) throw new Error(data.error);
                if (typeof dashAlert === 'function') dashAlert('✅ Acción aplicada en compra');
                await refresh();
            } catch (e) {
                if (typeof dashAlert === 'function') dashAlert('❌ ' + String(e.message || e));
            } finally {
                btn.disabled = false;
            }
        });

        await refresh();
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
        await _initPurchasesPanel();

        document.getElementById('btnSaveExtras')?.addEventListener('click', async () => {
            const addonsToSave = _collectAddonsFromForm();
            localStorage.setItem('admin_addons_config', JSON.stringify(addonsToSave));
            _addonsCache = _clone(addonsToSave);

            const backend = await _saveAddonsToBackend(addonsToSave);
            if (backend.ok) {
                if (typeof dashAlert === 'function') dashAlert('✅ Extras guardados en backend y local');
                else alert('Extras guardados');
            } else {
                let msg = '⚠️ Extras guardados solo en este navegador';
                if (backend.reason === 'auth') msg += ' (sesión admin expirada/no autorizada)';
                else if (backend.reason === 'config') msg += ' (scriptUrl no configurada)';
                else msg += ' (error backend/red)';
                if (typeof dashAlert === 'function') dashAlert(msg);
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
    