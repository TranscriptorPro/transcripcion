(function() {
        'use strict';
        const DEFAULT_ADDONS = {
            device_extra:        { label: 'Dispositivo extra',          price: 8.99,  icon: '💻' },
            workplace_extra:     { label: 'Lugar de trabajo extra',     price: 12.99, icon: '🏥' },
            professional_extra:  { label: 'Profesional extra',          price: 19.99, icon: '👨‍⚕️' },
            branding_normal:     { label: 'Branding (plan Normal)',     price: 14.99, icon: '🎨' },
            branding_pro:        { label: 'Branding (plan Pro)',        price: 9.99,  icon: '🎨' },
            template_individual: { label: 'Plantilla individual',       price: 3,     icon: '📄' },
            pack_small:          { label: 'Pack pequeño (5 plantillas)',price: 7,     icon: '📦' },
            pack_large:          { label: 'Pack grande (todas)',        price: 12,    icon: '📦' }
        };
        let _extrasInitialized = false;

        function _loadAddons() {
            try {
                const stored = localStorage.getItem('admin_addons_config');
                if (stored) return JSON.parse(stored);
            } catch(_) {}
            return JSON.parse(JSON.stringify(DEFAULT_ADDONS));
        }

        window._initExtrasEditor = function() {
            if (_extrasInitialized) return;
            _extrasInitialized = true;
            const grid = document.getElementById('extrasEditorGrid');
            if (!grid) return;
            _renderExtrasEditor(grid);

            document.getElementById('btnSaveExtras')?.addEventListener('click', () => {
                const addons = _collectAddonsFromForm();
                localStorage.setItem('admin_addons_config', JSON.stringify(addons));
                if (typeof dashAlert === 'function') dashAlert('✅ Precios de extras guardados correctamente');
                else alert('Extras guardados');
            });
            document.getElementById('btnResetExtras')?.addEventListener('click', () => {
                localStorage.removeItem('admin_addons_config');
                _extrasInitialized = false;
                _initExtrasEditor();
            });
        };

        function _renderExtrasEditor(grid) {
            const addons = _loadAddons();
            grid.innerHTML = '';
            for (const [key, addon] of Object.entries(addons)) {
                const card = document.createElement('div');
                card.style.cssText = 'background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:1.2rem;';
                card.innerHTML = `
                    <h3 style="margin:0 0 .8rem;font-size:1rem;color:var(--text-primary);">${addon.icon} ${addon.label}</h3>
                    <label style="display:block;margin-bottom:.3rem;font-size:.85rem;color:var(--text-secondary);">Precio (USD)</label>
                    <input type="number" step="0.01" min="0" data-addon="${key}" value="${addon.price}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:1rem;">
                `;
                grid.appendChild(card);
            }
        }

        function _collectAddonsFromForm() {
            const addons = _loadAddons();
            for (const key of Object.keys(addons)) {
                const input = document.querySelector(`[data-addon="${key}"]`);
                if (input) addons[key].price = parseFloat(input.value) || 0;
            }
            return addons;
        }
    })();
    