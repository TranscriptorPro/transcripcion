// ============ PRICING CART — Upgrade de plan + plantillas ============
(function () {
    'use strict';

    // ── Definición de planes ──────────────────────────────────────────
    const PLANS = {
        trial:  { order: 0, label: 'Trial',      icon: '🧪', price: 'Gratis',     period: '7 días', features: ['Transcripción básica', '1 plantilla genérica', 'Exportar TXT'] },
        normal: { order: 1, label: 'Normal',      icon: '📝', price: '$4.990',      period: '/mes',   features: ['Transcripción ilimitada', '1 plantilla genérica', 'Exportar TXT y PDF básico', 'Diccionario médico'] },
        pro:    { order: 2, label: 'Pro',          icon: '⚡', price: '$9.990',      period: '/mes',   features: ['Todo de Normal', 'Modo Pro: estructurado IA', 'Todas las plantillas médicas', 'PDF profesional con firma', 'Historial de informes', 'Soporte prioritario'], recommended: true },
        clinic: { order: 3, label: 'Clínica',      icon: '🏥', price: '$24.990',     period: '/mes',   features: ['Todo de Pro', 'Multi-profesional', 'Multi-dispositivo', 'Generación de apps GIFT', 'Dashboard de métricas', 'Soporte dedicado'] },
    };

    // ── Templates disponibles como addons ─────────────────────────────
    function _getTemplateAddons() {
        const templates = window.MEDICAL_TEMPLATES || {};
        const addons = [];
        for (const [key, tpl] of Object.entries(templates)) {
            if (key === 'generico') continue;
            addons.push({
                key,
                name: tpl.name || key,
                category: tpl.category || 'General',
                price: '$990'
            });
        }
        return addons;
    }

    // ── Estado del carrito ────────────────────────────────────────────
    let _cart = {
        upgradePlan: null,       // 'pro' | 'clinic' | null
        addonTemplates: new Set() // set<templateKey>
    };

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

            plansHtml += `
                <div class="pricing-card ${isCurrent ? 'pricing-card-current' : ''} ${isSelected ? 'pricing-card-selected' : ''} ${isRecommended ? 'pricing-card-recommended' : ''}">
                    ${isRecommended ? '<div class="pricing-badge">Recomendado</div>' : ''}
                    <div class="pricing-icon">${plan.icon}</div>
                    <h3 class="pricing-plan-name">${plan.label}</h3>
                    <div class="pricing-price">${plan.price}<span class="pricing-period">${plan.period}</span></div>
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
            cartItems.push({ label: `Upgrade a ${p.label}`, price: p.price });
        }
        _cart.addonTemplates.forEach(key => {
            const tpl = (window.MEDICAL_TEMPLATES || {})[key];
            if (tpl) cartItems.push({ label: tpl.name, price: '$990' });
        });

        let summaryHtml = '';
        if (cartItems.length > 0) {
            summaryHtml = `
                <div class="pricing-summary">
                    <h4 class="pricing-summary-title">🛒 Tu selección</h4>
                    <ul class="pricing-summary-list">
                        ${cartItems.map(i => `<li><span>${i.label}</span><strong>${i.price}</strong></li>`).join('')}
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
                <div class="pricing-plans-row">${plansHtml}</div>
                ${addonsHtml}
                ${summaryHtml}
            `;
            _attachEvents(container);
        }
    }

    // ── Attachar eventos ─────────────────────────────────────────────
    function _attachEvents(container) {
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
        const payload = {
            action: 'upgrade_request',
            medicoId: cfg.medicoId || localStorage.getItem('medico_id') || '—',
            currentPlan: _getCurrentPlan(),
            requestedPlan: _cart.upgradePlan || _getCurrentPlan(),
            requestedTemplates: Array.from(_cart.addonTemplates),
            timestamp: new Date().toISOString(),
            deviceId: localStorage.getItem('device_id') || '—'
        };

        try {
            const backendUrl = cfg.backendUrl || localStorage.getItem('backend_url');
            if (backendUrl) {
                await fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    mode: 'no-cors'
                });
            }

            // Guardar solicitud localmente
            const requests = JSON.parse(localStorage.getItem('upgrade_requests') || '[]');
            requests.push(payload);
            localStorage.setItem('upgrade_requests', JSON.stringify(requests));

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
    window.openPricingCart = function () {
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
