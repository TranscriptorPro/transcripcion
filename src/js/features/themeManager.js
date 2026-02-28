/**
 * ─────────────────────────────────────────────────────────────────────
 *  themeManager.js  —  Motor de Skins / Temas Modulares
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Sistema escalable para cargar, aplicar y gestionar skins visuales
 *  sin tocar el DOM ni la lógica existente de la app.
 *
 *  Arquitectura:
 *    - Cada skin es un archivo CSS independiente en src/css/skins/
 *    - Se aplica una clase `skin-<id>` al <body>
 *    - El CSS del skin usa esa clase como scope para override total
 *    - Persistencia en localStorage (key: 'app_skin')
 *    - Inyección dinámica de <link> para cargar el CSS bajo demanda
 *
 *  API pública (window):
 *    window.ThemeManager.apply(skinId)
 *    window.ThemeManager.getCurrent()
 *    window.ThemeManager.getRegistry()
 *    window.ThemeManager.injectSelectorUI()
 *
 *  NO modifica: index.html DOM, IDs, ni lógica de src/js/
 * ─────────────────────────────────────────────────────────────────────
 */
(function () {
    'use strict';

    // ─── Skin Registry ──────────────────────────────────────────────
    // Cada skin se declara aquí. Para agregar un nuevo skin:
    //   1. Crear el archivo CSS en src/css/skins/<id>.css
    //   2. Agregar una entrada en SKIN_REGISTRY
    //   3. Listo — el selector lo muestra automáticamente
    const SKIN_REGISTRY = [
        {
            id: 'default',
            name: 'Por Defecto',
            description: 'Tema original de la aplicación',
            icon: '🎨',
            cssFile: null,          // null = sin archivo extra, usa los CSS base
            preview: {
                bg: '#f1f5f9',
                accent: '#0f766e',
                card: '#ffffff',
                text: '#0f172a'
            }
        },
        {
            id: 'cyberpunk',
            name: 'Cyberpunk Neon',
            description: 'Glassmorphism oscuro con neón azul',
            icon: '🌃',
            cssFile: 'src/css/skins/cyberpunk.css',
            preview: {
                bg: '#050811',
                accent: '#00d4ff',
                card: '#0a0f1e',
                text: '#e5e7eb'
            }
        },
        {
            id: 'light-minimal',
            name: 'Light Minimal',
            description: 'Limpio, luminoso y minimalista',
            icon: '☀️',
            cssFile: 'src/css/skins/light-minimal.css',
            preview: {
                bg: '#fafafa',
                accent: '#2563eb',
                card: '#ffffff',
                text: '#111827'
            }
        }
    ];

    const LS_KEY = 'app_skin';
    const LINK_ID_PREFIX = 'skin-css-';
    let _currentSkinId = 'default';

    // ─── Helpers ─────────────────────────────────────────────────────

    /** Remove all skin-* classes from body */
    function _clearSkinClasses() {
        const body = document.body;
        const toRemove = [];
        body.classList.forEach(cls => {
            if (cls.startsWith('skin-')) toRemove.push(cls);
        });
        toRemove.forEach(cls => body.classList.remove(cls));
    }

    /** Remove previously injected skin stylesheet */
    function _removeOldSkinCSS() {
        document.querySelectorAll('link[id^="' + LINK_ID_PREFIX + '"]').forEach(el => el.remove());
    }

    /** Inject CSS file as <link> in <head> */
    function _injectSkinCSS(skin) {
        return new Promise((resolve, reject) => {
            if (!skin.cssFile) { resolve(); return; }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = skin.cssFile;
            link.id = LINK_ID_PREFIX + skin.id;
            link.onload = resolve;
            link.onerror = () => {
                console.warn('[ThemeManager] No se pudo cargar el skin CSS:', skin.cssFile);
                resolve(); // no bloquear
            };
            document.head.appendChild(link);
        });
    }

    /**
     * Apply a skin by id
     * @param {string} skinId - The skin id from the registry
     * @param {object} [opts] - Options { save: true, animate: true }
     */
    async function apply(skinId, opts = {}) {
        const save = opts.save !== false;
        const skin = SKIN_REGISTRY.find(s => s.id === skinId);
        if (!skin) {
            console.warn('[ThemeManager] Skin no encontrado:', skinId);
            return;
        }

        // 1. Clear previous skin
        _clearSkinClasses();
        _removeOldSkinCSS();

        // 2. Apply new body class (skip for default)
        if (skin.id !== 'default') {
            document.body.classList.add('skin-' + skin.id);
        }

        // 3. Inject CSS
        await _injectSkinCSS(skin);

        // 4. Persist
        _currentSkinId = skin.id;
        if (save) {
            try { localStorage.setItem(LS_KEY, skin.id); } catch (_) {}
        }

        // 5. Update selector UI if present
        _updateSelectorUI(skin.id);

        // 6. Dispatch custom event for other modules
        document.dispatchEvent(new CustomEvent('skinChanged', { detail: { skinId: skin.id, skin } }));

        console.log('[ThemeManager] Skin aplicado:', skin.name);
    }

    /** Get current skin id */
    function getCurrent() {
        return _currentSkinId;
    }

    /** Get the full registry (for building UIs) */
    function getRegistry() {
        return SKIN_REGISTRY.slice(); // copy
    }

    // ─── Selector UI ────────────────────────────────────────────────
    // Inyectado dinámicamente dentro del acordeón "Apariencia" del modal de settings

    function _updateSelectorUI(activeId) {
        const container = document.getElementById('skinSelectorContainer');
        if (!container) return;
        container.querySelectorAll('.skin-option').forEach(opt => {
            const isActive = opt.dataset.skin === activeId;
            opt.classList.toggle('skin-option--active', isActive);
            const check = opt.querySelector('.skin-check');
            if (check) check.textContent = isActive ? '✓' : '';
        });
    }

    /**
     * Populate the skin selector gallery inside the dedicated #skinSelectorContainer.
     * The container lives in its own accordion (data-stg="skins") in index.html.
     */
    function injectSelectorUI() {
        const container = document.getElementById('skinSelectorContainer');
        if (!container) {
            console.warn('[ThemeManager] No se encontró #skinSelectorContainer');
            return;
        }

        // Don't inject twice — if already has cards, just update active state
        if (container.querySelector('.skin-option')) {
            _updateSelectorUI(_currentSkinId);
            return;
        }

        const gallery = document.createElement('div');
        gallery.className = 'skin-gallery';
        gallery.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.5rem;';

        SKIN_REGISTRY.forEach(skin => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'skin-option' + (skin.id === _currentSkinId ? ' skin-option--active' : '');
            card.dataset.skin = skin.id;
            card.title = skin.description;
            card.style.cssText = `
                position: relative;
                border: 2px solid var(--border);
                border-radius: 10px;
                padding: 0;
                cursor: pointer;
                transition: all 0.25s;
                overflow: hidden;
                background: var(--bg-card);
                text-align: left;
                outline: none;
            `;

            // Preview bar (visual swatch)
            const preview = document.createElement('div');
            preview.className = 'skin-preview-bar';
            preview.style.cssText = `
                height: 40px;
                background: ${skin.preview.bg};
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                padding: 0 8px;
                border-bottom: 2px solid ${skin.preview.accent};
            `;
            // Mini colored dots
            ['accent', 'card', 'text'].forEach(key => {
                const dot = document.createElement('span');
                dot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; background: ${skin.preview[key]}; border: 1px solid rgba(0,0,0,0.1);`;
                preview.appendChild(dot);
            });
            card.appendChild(preview);

            // Info
            const info = document.createElement('div');
            info.style.cssText = 'padding: 6px 8px 8px;';
            info.innerHTML = `
                <div style="display:flex; align-items:center; gap:4px; font-size:0.82rem; font-weight:600; color: var(--text-primary);">
                    <span>${skin.icon}</span> ${skin.name}
                    <span class="skin-check" style="margin-left:auto; color: var(--primary); font-weight:700; font-size:0.9rem;">${skin.id === _currentSkinId ? '✓' : ''}</span>
                </div>
                <div style="font-size:0.7rem; color: var(--text-secondary); margin-top:2px; line-height:1.3;">${skin.description}</div>
            `;
            card.appendChild(info);

            // Click handler
            card.addEventListener('click', () => {
                apply(skin.id);
                if (typeof showToast === 'function') {
                    showToast('🎭 Skin aplicado: ' + skin.name, 'success', 2500);
                }
            });

            gallery.appendChild(card);
        });

        container.appendChild(gallery);

        // Style for active state (inject once)
        if (!document.getElementById('skin-selector-styles')) {
            const style = document.createElement('style');
            style.id = 'skin-selector-styles';
            style.textContent = `
                .skin-option:hover {
                    border-color: var(--primary-light) !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                }
                .skin-option--active {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 2px var(--primary-light), 0 4px 12px rgba(0,0,0,0.1) !important;
                }
                .skin-option--active .skin-preview-bar {
                    position: relative;
                }
                .skin-option--active .skin-preview-bar::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: rgba(255,255,255,0.08);
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ─── Init ────────────────────────────────────────────────────────

    function _init() {
        // Read saved skin
        let savedSkin = 'default';
        try { savedSkin = localStorage.getItem(LS_KEY) || 'default'; } catch (_) {}

        // Validate that saved skin exists in registry
        if (!SKIN_REGISTRY.find(s => s.id === savedSkin)) {
            savedSkin = 'default';
        }

        // Apply on load (no save needed, it's already saved)
        apply(savedSkin, { save: false });

        // Inject UI: try immediately (container exists in static HTML)
        injectSelectorUI();

        // Also inject when settings modal becomes active (backup)
        const settingsOverlay = document.getElementById('settingsModalOverlay');
        if (settingsOverlay) {
            const observer = new MutationObserver(() => {
                if (settingsOverlay.classList.contains('active')) {
                    injectSelectorUI();
                }
            });
            observer.observe(settingsOverlay, { attributes: true, attributeFilter: ['class'] });
        }
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

    // ─── Public API ──────────────────────────────────────────────────
    window.ThemeManager = {
        apply,
        getCurrent,
        getRegistry,
        injectSelectorUI
    };

})();
