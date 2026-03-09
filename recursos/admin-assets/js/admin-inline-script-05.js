(function() {
        'use strict';
        const DEFAULT_PLANS = {
            trial:  { label: 'Trial',    icon: '🧪', price: 'Gratis',   period: '15 días', features: ['Todo de Pro por 15 días','Estructuración automática con IA','Todas las plantillas','PDF con logo + firma','Historial: 30 informes','Asistente de sesión IA'], hasProMode: true, maxDevices: 3, durationDays: 15, historial: 30, workplaces: 2, outputProfiles: 3 },
            normal: { label: 'Normal',   icon: '📝', price: '$102.99',  period: 'pago único + $10/mes', features: ['Transcripción de audio','Estructuración manual','3 plantillas a elección','PDF con firma','Historial: 10 informes','Diccionario personalizable','1 dispositivo','1 perfil de salida','1 lugar de trabajo'], hasProMode: false, maxDevices: 1, durationDays: 30, historial: 10, workplaces: 1, outputProfiles: 1 },
            pro:    { label: 'Pro',      icon: '⚡', price: '$152.99',  period: 'pago único + $15/mes', features: ['Estructuración automática con IA','Grabar sobre texto editado','Todas las plantillas de especialidad','PDF con logo + firma','Historial: 30 informes','Asistente de sesión IA','Diccionario personalizable','3 dispositivos','Hasta 3 perfiles de salida','2 lugares de trabajo'], hasProMode: true, maxDevices: 3, durationDays: 30, historial: 30, workplaces: 2, outputProfiles: 3 },
            clinic: { label: 'Clínica',  icon: '🏥', price: '$352.99',  period: 'pago único + $30/mes', features: ['Todo de Pro más:','3 packs de especialidad','PDF con logo + firma + color','Hasta 5 profesionales','5 dispositivos','Historial ilimitado','Múltiples perfiles de salida','Diccionario personalizable'], hasProMode: true, maxDevices: 5, durationDays: 365, historial: -1, workplaces: 1, outputProfiles: -1, maxProfessionals: 5 }
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
                if (typeof dashAlert === 'function') dashAlert('✅ Planes guardados correctamente');
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
                        <label style="font-size:.85rem;color:var(--text-secondary);">Período
                            <input type="text" data-plan="${key}" data-field="period" value="${plan.period}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);">Max Devices
                            <input type="number" data-plan="${key}" data-field="maxDevices" value="${plan.maxDevices}" min="1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);">Duración (días)
                            <input type="number" data-plan="${key}" data-field="durationDays" value="${plan.durationDays}" min="1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);">Historial (informes, -1=ilimitado)
                            <input type="number" data-plan="${key}" data-field="historial" value="${plan.historial}" min="-1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);">Lugares de trabajo
                            <input type="number" data-plan="${key}" data-field="workplaces" value="${plan.workplaces}" min="1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);">Perfiles de salida (-1=ilimitados)
                            <input type="number" data-plan="${key}" data-field="outputProfiles" value="${plan.outputProfiles}" min="-1" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>
                        ${key === 'clinic' ? `<label style="font-size:.85rem;color:var(--text-secondary);">Máx profesionales
                            <input type="number" data-plan="${key}" data-field="maxProfessionals" value="${plan.maxProfessionals || 5}" min="1" max="20" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-main,#0f172a);color:var(--text-primary);margin-top:4px;">
                        </label>` : ''}
                        <label style="font-size:.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                            <input type="checkbox" data-plan="${key}" data-field="pdfLogo" ${plan.pdfLogo !== false ? 'checked' : ''}> PDF con logo
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                            <input type="checkbox" data-plan="${key}" data-field="pdfColor" ${plan.pdfColor ? 'checked' : ''}> PDF con color personalizado
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                            <input type="checkbox" data-plan="${key}" data-field="hasProMode" ${plan.hasProMode ? 'checked' : ''}> Incluye Modo Pro
                        </label>
                        <label style="font-size:.85rem;color:var(--text-secondary);">Features (una por línea)
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
                const histEl = document.querySelector(`[data-plan="${key}"][data-field="historial"]`);
                const wpEl = document.querySelector(`[data-plan="${key}"][data-field="workplaces"]`);
                const opEl = document.querySelector(`[data-plan="${key}"][data-field="outputProfiles"]`);
                const logoEl = document.querySelector(`[data-plan="${key}"][data-field="pdfLogo"]`);
                const colorEl = document.querySelector(`[data-plan="${key}"][data-field="pdfColor"]`);
                const profEl = document.querySelector(`[data-plan="${key}"][data-field="maxProfessionals"]`);
                if (histEl) plans[key].historial = parseInt(histEl.value);
                if (wpEl) plans[key].workplaces = parseInt(wpEl.value) || 1;
                if (opEl) plans[key].outputProfiles = parseInt(opEl.value);
                if (logoEl) plans[key].pdfLogo = logoEl.checked;
                if (colorEl) plans[key].pdfColor = colorEl.checked;
                if (profEl) plans[key].maxProfessionals = parseInt(profEl.value) || 5;
            }
            return plans;
        }
    })();
    