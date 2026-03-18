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
        hookMobileViewModeButtons();
    }

    /* ─── 1. Menú overflow (⋮): eliminado — todos los botones visibles en header */

    /* ─── 2. Botón hamburguesa (☰) en header-left, a la izquierda del título */
    function buildHamburgerButton() {
        var headerLeft = document.querySelector('.header-left');
        if (!headerLeft) return;

        var btn = document.createElement('button');
        btn.className = 'mobile-hamburger';
        btn.id = 'mobileHamburger';
        btn.title = 'Mostrar panel lateral';
        btn.setAttribute('aria-label', 'Mostrar panel lateral');
        btn.textContent = '☰';

        // Insertar al inicio de header-left (antes del logo)
        headerLeft.insertBefore(btn, headerLeft.firstChild);

        btn.addEventListener('click', function () {
            showSidebar();
        });
    }

    /* ─── 3. Botón hamburguesa (☰) dentro del sidebar, junto al título principal ─── */
    function buildSidebarCollapseButton() {
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        var firstCardTitle = sidebar.querySelector('.card .card-title');
        if (!firstCardTitle) return;

        var btn = document.createElement('button');
        btn.className = 'mobile-sidebar-collapser';
        btn.id = 'mobileSidebarCollapser';
        btn.title = 'Ocultar panel';
        btn.setAttribute('aria-label', 'Ocultar panel lateral');
        btn.textContent = '☰';

        btn.addEventListener('click', function () {
            hideSidebar();
        });

        // Insertar al inicio del título "Grabar o Subir" (a la izquierda del ícono)
        firstCardTitle.insertBefore(btn, firstCardTitle.firstChild);
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

    function getEyeIconSvg(withLashes) {
        var lashes = withLashes
            ? '<path d="M8 8L6.9 6.7M12 7V5.3M16 8l1.1-1.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"></path>'
            : '';
        return ''
            + '<svg class="mv-eye-icon" viewBox="0 0 24 24" aria-hidden="true">'
            + '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z" fill="currentColor" opacity="0.22"></path>'
            + '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 11.7c-2.04 0-3.7-1.66-3.7-3.7S9.96 8.8 12 8.8s3.7 1.66 3.7 3.7-1.66 3.7-3.7 3.7z" fill="currentColor"></path>'
            + lashes
            + '</svg>';
    }

    function getComparisonIconHtml() {
        return ''
            + '<span class="mv-comp-icon-wrap" aria-hidden="true">'
            + getEyeIconSvg(false)
            + '<span class="mv-comp-slash">/</span>'
            + getEyeIconSvg(true)
            + '</span>';
    }

    function hookMobileViewModeButtons() {
        var btnRestoreOriginal = document.getElementById('btnRestoreOriginal');
        var btnCompareView = document.getElementById('btnCompareView');
        if (!btnRestoreOriginal && !btnCompareView) return;

        var applying = false;

        function applyMobileViewVisuals() {
            if (!isMobile() || applying) return;
            applying = true;
            try {
                if (btnRestoreOriginal) {
                    var showingOriginal = !!btnRestoreOriginal._showingOriginal;
                    var restoreLabel = showingOriginal ? 'Estruct.' : 'Original';
                    btnRestoreOriginal.innerHTML = getEyeIconSvg(showingOriginal) + '<span class="mv-label">' + restoreLabel + '</span>';
                    btnRestoreOriginal.setAttribute('data-mobile-view-state', showingOriginal ? 'structured' : 'original');
                    btnRestoreOriginal.title = showingOriginal
                        ? 'Volver a vista estructurada'
                        : 'Ver vista original';
                }

                if (btnCompareView) {
                    var isCompareActive = !!window._isComparisonMode || btnCompareView.classList.contains('toggle-active');
                    var compareLabel = isCompareActive ? 'Cerrar comparativa' : 'Vista comparativa';
                    btnCompareView.innerHTML = getComparisonIconHtml() + '<span class="mv-label">' + compareLabel + '</span>';
                    btnCompareView.setAttribute('data-mobile-compare-state', isCompareActive ? 'active' : 'idle');
                    btnCompareView.title = isCompareActive
                        ? 'Cerrar vista comparativa'
                        : 'Abrir vista comparativa';
                }
            } finally {
                applying = false;
            }
        }

        function observeButton(buttonEl) {
            if (!buttonEl) return;

            var observer = new MutationObserver(function () {
                if (!applying) {
                    setTimeout(applyMobileViewVisuals, 0);
                }
            });
            observer.observe(buttonEl, { childList: true, subtree: false, characterData: true });

            buttonEl.addEventListener('click', function () {
                setTimeout(applyMobileViewVisuals, 0);
            });
        }

        observeButton(btnRestoreOriginal);
        observeButton(btnCompareView);

        setTimeout(applyMobileViewVisuals, 0);
        setTimeout(applyMobileViewVisuals, 250);
        setTimeout(applyMobileViewVisuals, 900);
    }
})();
