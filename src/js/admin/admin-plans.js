/* ═══════════════════════════════════════════════════════════
   Admin Dashboard — Editor de Planes
   Extraído de recursos/admin.html (líneas 6858-6949)
═══════════════════════════════════════════════════════════ */

    (function() {
        'use strict';
        const DEFAULT_PLANS = {
            trial:  { label: 'Trial',    icon: 'ðŸ§ª', price: 'Gratis',   period: '15 dÃ­as', features: ['TranscripciÃ³n bÃ¡sica','Todas las plantillas','Exportar TXT'], hasProMode: false, maxDevices: 1, durationDays: 15 },
            normal: { label: 'Normal',   icon: 'ðŸ“', price: '$15',      period: 'USD/mes', features: ['TranscripciÃ³n ilimitada','Plantillas estÃ¡ticas','Exportar TXT y PDF bÃ¡sico','Diccionario mÃ©dico'], hasProMode: false, maxDevices: 2, durationDays: 30 },
            pro:    { label: 'Pro',      icon: 'âš¡', price: '$25',      period: 'USD/mes', features: ['Todo de Normal','Modo Pro: estructurado IA','Todas las plantillas mÃ©dicas','PDF profesional con firma','Historial de informes','Soporte prioritario'], hasProMode: true, maxDevices: 3, durationDays: 30 },
            clinic: { label: 'ClÃ­nica',  icon: 'ðŸ¥', price: 'Consultar',period: '',        features: ['Todo de Pro','Multi-profesional','Multi-dispositivo','GeneraciÃ³n de apps GIFT','Dashboard de mÃ©tricas','Soporte dedicado'], hasProMode: true, maxDevices: 10, durationDays: 365 }
        };
        let _plansInitialized = false;

        function _loadPlans() {
            try {
                const stored = localStorage.getItem('admin_plans_config');
                if (stored) return JSON.parse(stored);
            } catch(_) {}
            return JSON.parse(JSON.stringify(DEFAULT_PLANS));
        }

        window._initPlansEditor = function() {
            if (_plansInitialized) return;
            _plansInitialized = true;
            const grid = document.getElementById('plansEditorGrid');
            if (!grid) return;
            _renderPlansEditor(grid);

            document.getElementById('btnSavePlans')?.addEventListener('click', () => {
                const plans = _collectPlansFromForm();
                localStorage.setItem('admin_plans_config', JSON.stringify(plans));
                if (typeof dashAlert === 'function') dashAlert('âœ… Planes guardados correctamente');
                else alert('Planes guardados');
            });
            document.getElementById('btnResetPlans')?.addEventListener('click', () => {
                localStorage.removeItem('admin_plans_config');
                _plansInitialized = false;
                _initPlansEditor();
            });
        };

        function _renderPlansEditor(grid) {
            const plans = _loadPlans();
            grid.innerHTML = '';
            for (const [key, plan] of Object.entries(plans)) {
                const card = document.createElement('div');
                card.style.cssText = 'background:var(--bg-card,#1e293b);border:1px solid var(--border,#334155);border-radius:12px;padding:1.5rem;';
                card.innerHTML = `
                    <h3 style="margin:0 0 1rem;color:var(--text-primary);">${plan.icon} ${plan.label}</h3>
                    <div style="display:flex;flex-direction:column;gap:0.75rem;">
                        <label style="font-size:.85rem;color:var(--text-secondary);">Precio
                            <input type="text" data-plan="${key}" data-field="price" value="${plan.price}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);">PerÃ­odo
                            <input type="text" data-plan="${key}" data-field="period" value="${plan.period}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);">Max Devices
                            <input type="number" data-plan="${key}" data-field="maxDevices" value="${plan.maxDevices}" min="1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);">DuraciÃ³n (dÃ­as)
                            <input type="number" data-plan="${key}" data-field="durationDays" value="${plan.durationDays}" min="1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                            <input type="checkbox" data-plan="${key}" data-field="hasProMode" ${plan.hasProMode ? 'checked' : ''}> Incluye Modo Pro
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);">Features (una por lÃ­nea)
                            <textarea data-plan="${key}" data-field="features" rows="5" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;resize:vertical;font-family:inherit;font-size:.85rem;">${plan.features.join('\n')}</textarea>
                        </label>
                    </div>
                `;
                grid.appendChild(card);
            }
        }

        function _collectPlansFromForm() {
            const plans = _loadPlans();
            for (const key of Object.keys(plans)) {
                const priceEl = document.querySelector(`[data-plan="${key}"][data-field="price"]`);
                const periodEl = document.querySelector(`[data-plan="${key}"][data-field="period"]`);
                const maxDevEl = document.querySelector(`[data-plan="${key}"][data-field="maxDevices"]`);
                const durEl = document.querySelector(`[data-plan="${key}"][data-field="durationDays"]`);
                const proEl = document.querySelector(`[data-plan="${key}"][data-field="hasProMode"]`);
                const featEl = document.querySelector(`[data-plan="${key}"][data-field="features"]`);
                if (priceEl) plans[key].price = priceEl.value;
                if (periodEl) plans[key].period = periodEl.value;
                if (maxDevEl) plans[key].maxDevices = parseInt(maxDevEl.value) || 1;
                if (durEl) plans[key].durationDays = parseInt(durEl.value) || 30;
                if (proEl) plans[key].hasProMode = proEl.checked;
                if (featEl) plans[key].features = featEl.value.split('\n').map(s => s.trim()).filter(Boolean);
            }
            return plans;
        }
    })();
