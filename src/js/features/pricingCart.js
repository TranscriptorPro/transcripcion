// ============ PRICING CART — Upgrade de plan + plantillas ============
(function () {
    'use strict';

    // ── Definición de planes (con soporte de config dinámica del admin) ──────
    const DEFAULT_PLANS = {
        trial:  { order: 0, label: 'Trial',      icon: '🧪', price: 'Gratis',     period: '15 días', features: ['Transcripción básica', 'Todas las plantillas', 'Exportar TXT'] },
        normal: { order: 1, label: 'Normal',      icon: '📝', price: '$15',         period: 'USD/mes', features: ['Transcripción ilimitada', 'Plantillas estáticas', 'Exportar TXT y PDF básico', 'Diccionario médico'] },
        pro:    { order: 2, label: 'Pro',          icon: '⚡', price: '$25',         period: 'USD/mes', features: ['Todo de Normal', 'Modo Pro: estructurado IA', 'Todas las plantillas médicas', 'PDF profesional con firma', 'Historial de informes', 'Soporte prioritario'], recommended: true },
        clinic: { order: 3, label: 'Clínica',      icon: '🏥', price: 'Consultar',   period: '',        features: ['Todo de Pro', 'Multi-profesional', 'Multi-dispositivo', 'Generación de apps GIFT', 'Dashboard de métricas', 'Soporte dedicado'] },
    };

    // Intentar cargar configuración dinámica del admin
    function _loadDynamicPlans() {
        try {
            const stored = localStorage.getItem('admin_plans_config');
            if (stored) {
                const dynamic = JSON.parse(stored);
                const merged = JSON.parse(JSON.stringify(DEFAULT_PLANS));
                for (const [key, dynPlan] of Object.entries(dynamic)) {
                    if (merged[key]) {
                        if (dynPlan.price) merged[key].price = dynPlan.price;
                        if (dynPlan.period !== undefined) merged[key].period = dynPlan.period;
                        if (dynPlan.features && dynPlan.features.length) merged[key].features = dynPlan.features;
                    }
                }
                return merged;
            }
        } catch(_) {}
        return JSON.parse(JSON.stringify(DEFAULT_PLANS));
    }

    // PLANS se carga lazy cada vez que se abre el modal
    let PLANS = _loadDynamicPlans();
    let ADDONS_CONFIG = null;

    function _toNumberPrice(v, fallback) {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    }

    function _getTemplateAddonUsd() {
        const cfg = ADDONS_CONFIG || JSON.parse(localStorage.getItem('admin_addons_config') || '{}');
        const price = cfg && cfg.template_individual ? cfg.template_individual.price : 3;
        return _toNumberPrice(price, 3);
    }

    async function _refreshPlansFromBackend() {
        try {
            const cfg = window.CLIENT_CONFIG || JSON.parse(localStorage.getItem('client_config_stored') || '{}');
            const backendUrl = cfg.backendUrl
                || (typeof appDB !== 'undefined' ? await appDB.get('backend_url') : null)
                || localStorage.getItem('backend_url');
            if (!backendUrl) return;

            const res = await fetch(`${backendUrl}?action=public_get_plans_config`, { method: 'GET' });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.plans) {
                localStorage.setItem('admin_plans_config', JSON.stringify(data.plans));
                PLANS = _loadDynamicPlans();
            }
            if (data && data.addons) {
                localStorage.setItem('admin_addons_config', JSON.stringify(data.addons));
                ADDONS_CONFIG = data.addons;
            }
        } catch (_) {
            // Fallback silencioso: localStorage/defaults
        }
    }

    // ── Templates disponibles como addons ─────────────────────────────
    function _getTemplateAddons() {
        const templates = window.MEDICAL_TEMPLATES || {};
        const addons = [];
        const templateAddonUsd = _getTemplateAddonUsd();
        for (const [key, tpl] of Object.entries(templates)) {
            if (key === 'generico') continue;
            addons.push({
                key,
                name: tpl.name || key,
                category: tpl.category || 'General',
                priceUsd: templateAddonUsd,
                price: `$${templateAddonUsd}`
            });
        }
        return addons;
    }

    // ── Estado del carrito ────────────────────────────────────────────
    let _cart = {
        upgradePlan: null,       // 'pro' | 'clinic' | null
        addonTemplates: new Set() // set<templateKey>
    };

    // ── Moneda y tipo de cambio ──────────────────────────────────────
    let _currency = 'USD'; // 'USD' | 'ARS'
    const _DEFAULT_EXCHANGE_RATE = 1200; // ARS por 1 USD (fallback)

    function _getExchangeRate() {
        try {
            const stored = localStorage.getItem('admin_plans_config');
            if (stored) {
                const cfg = JSON.parse(stored);
                if (cfg._exchangeRate) return Number(cfg._exchangeRate);
            }
        } catch(_) {}
        return _DEFAULT_EXCHANGE_RATE;
    }

    function _convertPrice(priceStr) {
        if (_currency === 'USD') return priceStr;
        // Extraer número del precio (ej: "$15" → 15)
        const match = priceStr.match(/\$\s*(\d+(?:[.,]\d+)?)/);
        if (!match) return priceStr; // "Gratis", "Consultar" no se convierten
        const usdAmount = parseFloat(match[1].replace(',', '.'));
        const arsAmount = Math.round(usdAmount * _getExchangeRate());
        return `$${arsAmount.toLocaleString('es-AR')}`;
    }

    function _getPeriodLabel() {
        return _currency === 'ARS' ? 'ARS/mes' : null; // null = usar el del plan
    }

    // ── Obtener plan actual ──────────────────────────────────────────
    function _getCurrentPlan() {
        try {
            const cfg = window.CLIENT_CONFIG || JSON.parse(localStorage.getItem('client_config_stored') || '{}');
            const type = (cfg.type || cfg.plan || 'trial').toLowerCase();
            // Mapeo: el backend usa PRO para gift también
            if (type === 'pro') return 'pro';
            if (type === 'clinic') return 'clinic';
            if (type === 'normal') return 'normal';
            return 'trial';
        } catch (_) { return 'trial'; }
    }

    // ── Renderizar modal ─────────────────────────────────────────────
    function _renderPricingModal() {
        const currentPlan = _getCurrentPlan();
        const currentOrder = PLANS[currentPlan]?.order || 0;

        // Selector de moneda
        let currencyHtml = `
            <div class="pricing-currency-selector" style="text-align:right;margin-bottom:1rem;">
                <label style="font-size:.85rem;color:var(--text-secondary);margin-right:6px;">Moneda:</label>
                <select id="pricingCurrencySelect" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);color:var(--text-primary);font-size:.85rem;">
                    <option value="USD" ${_currency === 'USD' ? 'selected' : ''}>🇺🇸 USD</option>
                    <option value="ARS" ${_currency === 'ARS' ? 'selected' : ''}>🇦🇷 ARS</option>
                </select>
            </div>
        `;

        // Plans HTML
        let plansHtml = '';
        for (const [key, plan] of Object.entries(PLANS)) {
            const isCurrent = key === currentPlan;
            const isUpgrade = plan.order > currentOrder;
            const isRecommended = plan.recommended && isUpgrade;
            const isSelected = _cart.upgradePlan === key;

            let btnHtml = '';
            if (isCurrent) {
                btnHtml = `<button class="pricing-btn pricing-btn-current" disabled>✓ Plan actual</button>`;
            } else if (isUpgrade) {
                btnHtml = `<button class="pricing-btn ${isSelected ? 'pricing-btn-selected' : 'pricing-btn-upgrade'}" data-plan="${key}">
                    ${isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                </button>`;
            } else {
                btnHtml = `<button class="pricing-btn pricing-btn-lower" disabled>—</button>`;
            }

            const displayPrice = _convertPrice(plan.price);
            const displayPeriod = _getPeriodLabel() || plan.period;

            plansHtml += `
                <div class="pricing-card ${isCurrent ? 'pricing-card-current' : ''} ${isSelected ? 'pricing-card-selected' : ''} ${isRecommended ? 'pricing-card-recommended' : ''}">
                    ${isRecommended ? '<div class="pricing-badge">Recomendado</div>' : ''}
                    <div class="pricing-icon">${plan.icon}</div>
                    <h3 class="pricing-plan-name">${plan.label}</h3>
                    <div class="pricing-price">${displayPrice}<span class="pricing-period">${displayPeriod}</span></div>
                    <ul class="pricing-features">
                        ${plan.features.map(f => `<li>✓ ${f}</li>`).join('')}
                    </ul>
                    ${btnHtml}
                </div>
            `;
        }

        // Addons (solo si plan actual es normal o elegiste normal/pro → puedes agregar templates individuales)
        const showAddons = currentPlan === 'normal' || currentPlan === 'trial';
        let addonsHtml = '';
        if (showAddons) {
            const addons = _getTemplateAddons();
            const categories = {};
            addons.forEach(a => {
                if (!categories[a.category]) categories[a.category] = [];
                categories[a.category].push(a);
            });

            addonsHtml = `
                <div class="pricing-addons-section">
                    <h3 class="pricing-addons-title">📋 Plantillas individuales</h3>
                    <p class="pricing-addons-subtitle">Agregá plantillas específicas a tu plan actual</p>
                    <div class="pricing-addons-grid">
                        ${Object.entries(categories).map(([cat, items]) => `
                            <div class="pricing-addon-category">
                                <h4 class="pricing-addon-cat-label">${cat}</h4>
                                ${items.map(item => {
                                    const checked = _cart.addonTemplates.has(item.key);
                                    return `
                                    <label class="pricing-addon-item ${checked ? 'pricing-addon-checked' : ''}">
                                        <input type="checkbox" data-addon="${item.key}" ${checked ? 'checked' : ''}>
                                        <span class="pricing-addon-name">${item.name}</span>
                                        <span class="pricing-addon-price">${item.price}</span>
                                    </label>`;
                                }).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Cart summary
        const cartItems = [];
        if (_cart.upgradePlan) {
            const p = PLANS[_cart.upgradePlan];
            cartItems.push({ label: `Upgrade a ${p.label}`, price: p.price, displayPrice: _convertPrice(p.price) });
        }
        _cart.addonTemplates.forEach(key => {
            const tpl = (window.MEDICAL_TEMPLATES || {})[key];
            const tplUsd = _getTemplateAddonUsd();
            if (tpl) cartItems.push({ label: tpl.name, price: `$${tplUsd}`, displayPrice: _currency === 'ARS' ? _convertPrice(`$${tplUsd}`) : `$${tplUsd}` });
        });

        let summaryHtml = '';
        if (cartItems.length > 0) {
            summaryHtml = `
                <div class="pricing-summary">
                    <h4 class="pricing-summary-title">🛒 Tu selección</h4>
                    <ul class="pricing-summary-list">
                        ${cartItems.map(i => `<li><span>${i.label}</span><strong>${i.displayPrice || i.price}</strong></li>`).join('')}
                    </ul>
                    <button class="btn btn-primary btn-full pricing-submit" id="pricingSubmitRequest">
                        📩 Solicitar upgrade
                    </button>
                    <p class="pricing-summary-note">Tu solicitud será revisada por el administrador. Recibirás confirmación por email.</p>
                </div>
            `;
        }

        // Compose
        const container = document.getElementById('pricingModalBody');
        if (container) {
            container.innerHTML = `
                ${currencyHtml}
                <div class="pricing-plans-row">${plansHtml}</div>
                ${addonsHtml}
                ${summaryHtml}
            `;
            _attachEvents(container);
        }
    }

    // ── Attachar eventos ─────────────────────────────────────────────
    function _attachEvents(container) {
        // Selector de moneda
        const currencySelect = document.getElementById('pricingCurrencySelect');
        if (currencySelect) {
            currencySelect.addEventListener('change', () => {
                _currency = currencySelect.value;
                _renderPricingModal();
            });
        }

        // Plan buttons
        container.querySelectorAll('.pricing-btn-upgrade, .pricing-btn-selected').forEach(btn => {
            btn.addEventListener('click', () => {
                const plan = btn.dataset.plan;
                if (_cart.upgradePlan === plan) {
                    _cart.upgradePlan = null;
                } else {
                    _cart.upgradePlan = plan;
                    // Si seleccionó pro o clinic, no necesita addons
                    if (plan === 'pro' || plan === 'clinic') {
                        _cart.addonTemplates.clear();
                    }
                }
                _renderPricingModal();
            });
        });

        // Addon checkboxes
        container.querySelectorAll('input[data-addon]').forEach(cb => {
            cb.addEventListener('change', () => {
                const key = cb.dataset.addon;
                if (cb.checked) {
                    _cart.addonTemplates.add(key);
                } else {
                    _cart.addonTemplates.delete(key);
                }
                _renderPricingModal();
            });
        });

        // Submit
        const submitBtn = document.getElementById('pricingSubmitRequest');
        if (submitBtn) {
            submitBtn.addEventListener('click', _submitUpgradeRequest);
        }
    }

    // ── Enviar solicitud ─────────────────────────────────────────────
    async function _submitUpgradeRequest() {
        const btn = document.getElementById('pricingSubmitRequest');
        if (!btn) return;
        btn.disabled = true;
        btn.textContent = '⏳ Enviando solicitud...';

        const cfg = window.CLIENT_CONFIG || {};
        const templateAddonUsd = _getTemplateAddonUsd();
        const estimatedAmount = (_cart.upgradePlan ? _toNumberPrice(String(PLANS[_cart.upgradePlan]?.price || '').replace(/[^0-9.,]/g, '').replace(',', '.'), 0) : 0)
            + (Array.from(_cart.addonTemplates).length * templateAddonUsd);

        const payload = {
            action: 'upgrade_request',
            medicoId: cfg.medicoId
                || (typeof appDB !== 'undefined' ? await appDB.get('medico_id') : null)
                || localStorage.getItem('medico_id') || '—',
            email: cfg.email || '',
            nombre: cfg.doctorName || cfg.nombre || '',
            currentPlan: _getCurrentPlan(),
            requestedPlan: _cart.upgradePlan || _getCurrentPlan(),
            requestedTemplates: Array.from(_cart.addonTemplates),
            requestedAddons: {
                templates: Array.from(_cart.addonTemplates),
                templateUnitPriceUsd: templateAddonUsd
            },
            estimatedAmount: Number(estimatedAmount.toFixed(2)),
            currency: _currency,
            exchangeRate: _currency === 'ARS' ? _getExchangeRate() : null,
            timestamp: new Date().toISOString(),
            deviceId: (typeof appDB !== 'undefined' ? await appDB.get('device_id') : null)
                || localStorage.getItem('device_id') || '—'
        };

        try {
            const backendUrl = cfg.backendUrl
                || (typeof appDB !== 'undefined' ? await appDB.get('backend_url') : null)
                || localStorage.getItem('backend_url');
            if (backendUrl) {
                const response = await fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (!data.ok && !data.success) console.warn('Upgrade request server response:', data);
            }

            // Guardar solicitud localmente
            const requests = (typeof appDB !== 'undefined' ? await appDB.get('upgrade_requests') : null)
                || JSON.parse(localStorage.getItem('upgrade_requests') || '[]');
            requests.push(payload);
            if (typeof appDB !== 'undefined') appDB.set('upgrade_requests', requests);
            else localStorage.setItem('upgrade_requests', JSON.stringify(requests));

            if (typeof showToast === 'function') {
                showToast('✅ Solicitud de upgrade enviada. Te notificaremos cuando sea aprobada.', 'success', 5000);
            }

            // Cerrar modal
            document.getElementById('pricingModalOverlay')?.classList.remove('active');
            _cart = { upgradePlan: null, addonTemplates: new Set() };

        } catch (err) {
            btn.disabled = false;
            btn.textContent = '📩 Solicitar upgrade';
            if (typeof showToast === 'function') {
                showToast('Error al enviar la solicitud. Intentá más tarde.', 'error');
            }
        }
    }

    // ── API pública ──────────────────────────────────────────────────
    window.openPricingCart = async function () {
        await _refreshPlansFromBackend();
        PLANS = _loadDynamicPlans(); // Refrescar precios dinámicos
        _cart = { upgradePlan: null, addonTemplates: new Set() };
        _renderPricingModal();
        document.getElementById('pricingModalOverlay')?.classList.add('active');
    };

    window.initPricingCart = function () {
        // Cerrar
        const closeBtn = document.getElementById('closePricingModal');
        const overlay = document.getElementById('pricingModalOverlay');
        if (closeBtn) closeBtn.addEventListener('click', () => overlay?.classList.remove('active'));
        if (overlay) {
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
            overlay.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('active'); });
        }
    };
})();
