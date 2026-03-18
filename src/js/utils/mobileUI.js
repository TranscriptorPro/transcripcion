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
        buildHamburgerButton();
        buildSidebarCollapseButton();
        hookSidebarAutoCollapse();
        hookTranscriptionButtons();
    }

    /* ─── 1. Menú overflow (⋮): eliminado — todos los botones visibles en header */

    /* ─── 2. Botón hamburguesa (☰) en el header — aparece cuando sidebar está oculto */
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

    /* ─── 3. Botón colapsar dentro del sidebar ─────────────────────── */
    function buildSidebarCollapseButton() {
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        var btn = document.createElement('button');
        btn.className = 'mobile-sidebar-collapser';
        btn.id = 'mobileSidebarCollapser';
        btn.title = 'Ir al editor';
        btn.innerHTML = '&#8592; Ir al editor';   // ← Ir al editor

        btn.addEventListener('click', function () {
            hideSidebar();
        });

        // Insertar al inicio del sidebar
        sidebar.insertBefore(btn, sidebar.firstChild);
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

    /* ─── 4. Hookear botones del sidebar que disparan transcripción ─ */
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

    /* ─── 5. Auto-colapsar sidebar al terminar de estructurar ────── */
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
