/* ══════════════════════════════════════════════════════════════════════
   mobileUI.js — Lógica EXCLUSIVA para mobile (≤ 768 px).
   Controla: hamburguesa, menú overflow (⋮), auto-colapso del sidebar.
   NO ejecuta nada en desktop.
   ══════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    var BREAKPOINT = 768;

    function isMobile() {
        return window.innerWidth <= BREAKPOINT;
    }

    /* ─── Esperar a que el DOM esté listo ──────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        if (!isMobile()) return;

        initMobileUI();
    });

    /* ─── Inicialización ──────────────────────────────────────────── */
    function initMobileUI() {
        buildOverflowMenu();
        buildHamburgerButton();
        hookSidebarAutoCollapse();
        hookTranscriptionButtons();
        closeOverflowOnOutsideClick();
    }

    /* ─── 1. Menú overflow (⋮) — botones secundarios ─────────────── */
    function buildOverflowMenu() {
        var headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;

        // Wrapper relativo para posicionar el dropdown
        headerActions.style.position = 'relative';

        // Botón ⋮
        var btn = document.createElement('button');
        btn.className = 'mobile-overflow-btn';
        btn.id = 'mobileOverflowBtn';
        btn.title = 'Más opciones';
        btn.setAttribute('aria-label', 'Más opciones');
        btn.innerHTML = '&#8942;'; // ⋮
        headerActions.appendChild(btn);

        // Dropdown
        var menu = document.createElement('div');
        menu.className = 'mobile-overflow-menu';
        menu.id = 'mobileOverflowMenu';
        headerActions.appendChild(menu);

        // Items: mapear botones ocultos al menú
        var hiddenBtns = [
            { id: 'btnManual',     icon: '📖', label: 'Manual profesional' },
            { id: 'btnContacto',   icon: '✉️', label: 'Contactar soporte' },
            { id: 'btnInstallPwa', icon: '📲', label: 'Instalar app' },
            { id: 'btnAdminAccess',icon: '🛡️', label: 'Panel Admin' },
            { id: 'btnResetApp',   icon: '🗑️', label: 'Resetear app' },
        ];

        hiddenBtns.forEach(function (cfg) {
            var orig = document.getElementById(cfg.id);
            if (!orig) return;
            // Solo agregar si el botón original está visible (salvo la lógica de display:none de admin)
            var item = document.createElement('button');
            item.className = 'mobile-overflow-item';
            item.setAttribute('data-source', cfg.id);
            item.innerHTML = '<span>' + cfg.icon + '</span> ' + cfg.label;
            item.addEventListener('click', function () {
                orig.click();            // dispara la acción original
                menu.classList.remove('open');
            });
            menu.appendChild(item);
        });

        // Toggle del menú
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            // Sincronizar visibilidad de items con sus botones originales
            syncOverflowItems(menu);
            menu.classList.toggle('open');
        });
    }

    /** Oculta items del overflow cuyo botón original no es visible */
    function syncOverflowItems(menu) {
        var items = menu.querySelectorAll('.mobile-overflow-item');
        var anyVisible = false;
        items.forEach(function (item) {
            var srcId = item.getAttribute('data-source');
            var orig = document.getElementById(srcId);
            if (!orig) {
                item.style.display = 'none';
                return;
            }
            var hidden = orig.style.display === 'none' || orig.offsetParent === null;
            // En mobile, los botones secundarios están ocultos por CSS (!important),
            // así que verificamos el style.display inline del original.
            var inlineHidden = orig.style.display === 'none';
            item.style.display = inlineHidden ? 'none' : '';
            if (!inlineHidden) anyVisible = true;
        });
        // Si ningún item es visible, ocultar el botón ⋮ completamente
        var overflowBtn = document.getElementById('mobileOverflowBtn');
        if (overflowBtn) overflowBtn.style.display = anyVisible ? '' : 'none';
    }

    function closeOverflowOnOutsideClick() {
        document.addEventListener('click', function () {
            var menu = document.getElementById('mobileOverflowMenu');
            if (menu) menu.classList.remove('open');
        });
    }

    /* ─── 2. Botón hamburguesa (☰) — mostrar/ocultar sidebar ────── */
    function buildHamburgerButton() {
        var header = document.querySelector('.header-content');
        if (!header) return;

        var btn = document.createElement('button');
        btn.className = 'mobile-hamburger';
        btn.id = 'mobileHamburger';
        btn.title = 'Mostrar panel lateral';
        btn.setAttribute('aria-label', 'Mostrar panel lateral');
        btn.textContent = '☰';

        // Insertar al inicio del header (antes de header-left)
        header.insertBefore(btn, header.firstChild);

        btn.addEventListener('click', function () {
            showSidebar();
        });
    }

    /** Muestra sidebar y oculta editor */
    function showSidebar() {
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        sidebar.classList.remove('mobile-hidden');
        document.body.classList.remove('mobile-sidebar-collapsed');
    }

    /** Oculta sidebar y muestra editor */
    function hideSidebar() {
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        sidebar.classList.add('mobile-hidden');
        document.body.classList.add('mobile-sidebar-collapsed');
    }

    /* ─── 3. Hookear botones del sidebar que disparan transcripción ─ */
    function hookTranscriptionButtons() {
        // Estos botones, al ser clickeados, deben ocultar sidebar → mostrar editor
        var btnIds = [
            'transcribeAndStructureBtn',  // Transcribir + Estructurar
            'btnStructureTextPro',        // Estructurar texto (Pro)
            'btnStructureAI',             // Botón IA magic
        ];
        btnIds.forEach(function (id) {
            var btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('click', function () {
                if (!isMobile()) return;
                // Pequeño delay para que la acción original arranque primero
                setTimeout(hideSidebar, 150);
            });
        });
    }

    /* ─── 4. Auto-colapsar sidebar al terminar de estructurar ────── */
    function hookSidebarAutoCollapse() {
        var orig = window.updateButtonsVisibility;
        if (typeof orig !== 'function') return;

        window.updateButtonsVisibility = function (state) {
            // Llamar siempre a la original primero
            orig.apply(this, arguments);

            if (!isMobile()) return;

            if (state === 'STRUCTURED' || state === 'STRUCTURING' || state === 'TRANSCRIBED') {
                hideSidebar();
            } else if (state === 'IDLE') {
                showSidebar();
            }
        };
    }
})();
