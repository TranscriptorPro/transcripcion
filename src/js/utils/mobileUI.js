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
        optimizeEditorActionsForMobile();
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

            optimizeEditorActionsForMobile();
        };
    }

    function optimizeEditorActionsForMobile() {
        if (!isMobile()) return;

        compactInlineReviewLabel();
        hideQuickProfileSelector();
        moveCopyButtonIntoToolbar();
        moveMedicalCheckIntoToolbar();
        disableComparisonOnMobile();
        applyActionOrder();
        compactDownloadButton();
        enforceBigActionIcons();
        syncCompactViewButtons();
    }

    function compactInlineReviewLabel() {
        var label = document.querySelector('#inlineReviewQuickControl .inline-review-quick-label');
        if (!label) return;
        label.textContent = '▶';
        label.title = 'Revisión IA inline';
    }

    function hideQuickProfileSelector() {
        var selector = document.getElementById('quickProfileSelector');
        if (!selector) return;
        selector.style.display = 'none';

        [selector.previousElementSibling, selector.nextElementSibling].forEach(function (el) {
            if (!el) return;
            var style = String(el.getAttribute('style') || '');
            if (style.indexOf('width: 1px') !== -1) {
                el.style.display = 'none';
            }
        });
    }

    function moveCopyButtonIntoToolbar() {
        var copyBtn = document.getElementById('copyBtn');
        var toolbar = document.getElementById('editorToolbar');
        if (!copyBtn || !toolbar) return;
        if (copyBtn.parentElement === toolbar) return;

        copyBtn.classList.remove('btn-action-green');
        copyBtn.classList.add('toolbar-btn');
        copyBtn.title = 'Copiar todo';
        copyBtn.setAttribute('aria-label', 'Copiar todo');
        toolbar.appendChild(copyBtn);
    }

    function moveMedicalCheckIntoToolbar() {
        var medBtn = document.getElementById('btnMedicalCheck');
        var toolbar = document.getElementById('editorToolbar');
        var decreaseFontBtn = document.getElementById('decreaseFontBtn');
        if (!medBtn || !toolbar || !decreaseFontBtn) return;

        medBtn.classList.remove('btn', 'btn-outline', 'btn-sm-icon');
        medBtn.classList.add('toolbar-btn');
        medBtn.title = 'Revisar terminología médica';
        medBtn.setAttribute('aria-label', 'Revisar terminología médica');
        medBtn.innerHTML = '🩺';

        if (decreaseFontBtn.nextSibling !== medBtn) {
            decreaseFontBtn.insertAdjacentElement('afterend', medBtn);
        }
    }

    function disableComparisonOnMobile() {
        var btnCompareView = document.getElementById('btnCompareView');
        if (btnCompareView) {
            btnCompareView.style.display = 'none';
        }
        if (window._isComparisonMode && typeof window.exitComparisonMode === 'function') {
            try { window.exitComparisonMode(); } catch (_) {}
        }
    }

    function applyActionOrder() {
        var inlineDock = document.getElementById('inlineReviewQuickDock');
        var appendBtn = document.getElementById('btnAppendRecord');
        var configBtn = document.getElementById('btnConfigPdfMain');
        var printBtn = document.getElementById('printBtn');
        var downloadWrap = document.getElementById('downloadBtnContainer');
        var restoreBtn = document.getElementById('btnRestoreOriginal');

        if (inlineDock) inlineDock.style.order = '1';
        if (appendBtn) appendBtn.style.order = '2';
        if (configBtn) configBtn.style.order = '3';
        if (printBtn) printBtn.style.order = '4';
        if (downloadWrap) downloadWrap.style.order = '5';
        if (restoreBtn) restoreBtn.style.order = '10';
    }

    function compactDownloadButton() {
        var btnMain = document.getElementById('downloadBtnMain');
        var btnChevron = document.getElementById('downloadBtn');
        var label = document.getElementById('downloadFavLabel');
        if (btnMain) btnMain.style.display = 'none';
        if (label) label.style.display = 'none';
        if (!btnChevron) return;

        btnChevron.title = 'Descargar';
        btnChevron.setAttribute('aria-label', 'Descargar');
        btnChevron.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M5 20h14v-2H5v2zm7-17v9.17l3.59-3.58L17 10l-5 5-5-5 1.41-1.41L11 12.17V3h1z"/></svg>';
    }

    function enforceBigActionIcons() {
        var btnConfig = document.getElementById('btnConfigPdfMain');
        if (btnConfig) {
            btnConfig.innerHTML = ''
                + '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">'
                + '<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"></path>'
                + '<path d="M9 13h1.5v1.5H9V13zm4.5 0H15v1.5h-1.5V13zm-2.25 0h1.5v1.5h-1.5V13z" opacity="0.6"></path>'
                + '</svg>'
                + '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" style="margin-left:-4px;opacity:0.95;" aria-hidden="true">'
                + '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path>'
                + '</svg>';
        }

        var btnPrint = document.getElementById('printBtn');
        if (btnPrint) {
            btnPrint.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"></path></svg>';
        }
    }

    function syncCompactViewButtons() {
        var btnRestoreOriginal = document.getElementById('btnRestoreOriginal');
        var btnCompareView = document.getElementById('btnCompareView');
        if (!btnRestoreOriginal && !btnCompareView) return;

        if (btnRestoreOriginal) {
            var showingOriginal = !!btnRestoreOriginal._showingOriginal;
            btnRestoreOriginal.textContent = showingOriginal ? 'Estruct.' : 'Original';
            btnRestoreOriginal.title = showingOriginal
                ? 'Volver a vista estructurada'
                : 'Ver vista original';
        }

        if (btnCompareView) {
            btnCompareView.style.display = 'none';
        }
    }
})();
