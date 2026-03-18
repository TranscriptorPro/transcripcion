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
        disableComparisonOnMobile();
        applyActionOrder();
        compactDownloadButton();
        enforceBigActionIcons();
        syncCompactViewButtons();
        buildMobileToolbarGroups();
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
        if (restoreBtn) restoreBtn.style.order = '3';
        if (configBtn) configBtn.style.order = '4';
        if (printBtn) printBtn.style.order = '5';
        if (downloadWrap) downloadWrap.style.order = '6';
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
        var btn = document.getElementById('btnRestoreOriginal');
        if (!btn) return;
        var s = !!btn._showingOriginal;
        btn.textContent = s ? '\u21BB' : '\u21A9';
        btn.title = s ? 'Volver a vista estructurada' : 'Ver texto original';
        if (!btn._mobileClickHooked) {
            btn._mobileClickHooked = true;
            btn.addEventListener('click', function () {
                setTimeout(function () {
                    if (!isMobile()) return;
                    var showing = !!btn._showingOriginal;
                    btn.textContent = showing ? '\u21BB' : '\u21A9';
                    btn.title = showing ? 'Volver a vista estructurada' : 'Ver texto original';
                }, 60);
            });
        }
        var cmp = document.getElementById('btnCompareView');
        if (cmp) cmp.style.display = 'none';
    }

    function buildMobileToolbarGroups() {
        var toolbar = document.getElementById('editorToolbar');
        if (!toolbar) return;

        if (!toolbar.classList.contains('mobile-grouped')) {
            toolbar.classList.add('mobile-grouped');
        }

        if (toolbar.dataset.mobileGroupsReady === '1') return;

        function findEl(id) {
            return document.getElementById(id);
        }

        function createTrigger(iconSvg, title) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'toolbar-btn mobile-group-trigger';
            btn.title = title;
            btn.setAttribute('aria-label', title);
            btn.innerHTML = iconSvg;
            return btn;
        }

        function closeAllGroups(exceptWrapper) {
            toolbar.querySelectorAll('.mobile-toolbar-group.open').forEach(function (group) {
                if (group !== exceptWrapper) group.classList.remove('open');
            });
        }

        function makeGroup(title, iconSvg, elementIds, extraBuilder) {
            var wrapper = document.createElement('div');
            wrapper.className = 'mobile-toolbar-group';

            var trigger = createTrigger(iconSvg, title);
            var panel = document.createElement('div');
            panel.className = 'mobile-toolbar-panel';

            elementIds.forEach(function (id) {
                var el = findEl(id);
                if (!el) return;
                el.classList.add('mobile-group-item');
                panel.appendChild(el);
            });

            if (typeof extraBuilder === 'function') {
                extraBuilder(panel);
            }

            trigger.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var isOpen = wrapper.classList.contains('open');
                closeAllGroups(wrapper);
                wrapper.classList.toggle('open', !isOpen);
                if (!isOpen) {
                    requestAnimationFrame(function () {
                        var tRect = trigger.getBoundingClientRect();
                        panel.style.top = (tRect.bottom + 4) + 'px';
                        panel.style.left = tRect.left + 'px';
                        var pRect = panel.getBoundingClientRect();
                        if (pRect.right > window.innerWidth - 8) {
                            panel.style.left = Math.max(4, window.innerWidth - pRect.width - 8) + 'px';
                        }
                    });
                }
            });

            panel.addEventListener('click', function (ev) {
                var target = ev.target;
                if (target && (target.tagName === 'BUTTON' || target.tagName === 'SELECT')) {
                    setTimeout(function () {
                        wrapper.classList.remove('open');
                    }, 120);
                }
            });

            wrapper.appendChild(trigger);
            wrapper.appendChild(panel);
            toolbar.appendChild(wrapper);
        }

        makeGroup(
            'Formato',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42z"></path></svg>',
            ['boldBtn', 'italicBtn', 'underlineBtn', 'strikeBtn']
        );

        makeGroup(
            'Alineación',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z"></path></svg>',
            ['alignLeftBtn', 'alignCenterBtn', 'alignRightBtn', 'justifyBtn']
        );

        makeGroup(
            'Listas',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"></path></svg>',
            ['bulletListBtn', 'numberedListBtn']
        );

        makeGroup(
            'Tamaño',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M5 4v3h5.5v12h3V7H19V4z"></path></svg>',
            ['fontSizeToolbar', 'increaseFontBtn', 'decreaseFontBtn', 'lineSpacingSelect']
        );

        makeGroup(
            'Navegación',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3z"></path></svg>',
            ['undoBtn', 'redoBtn', 'btnEditorSnapshots']
        );

        makeGroup(
            'Insertar',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>',
            ['insertTableBtn', 'insertLinkBtn'],
            function (panel) {
                var editor = document.getElementById('editor');

                var imgBtn = document.createElement('button');
                imgBtn.type = 'button';
                imgBtn.className = 'toolbar-btn';
                imgBtn.title = 'Insertar imagen';
                imgBtn.textContent = '🖼';

                var shapeBtn = document.createElement('button');
                shapeBtn.type = 'button';
                shapeBtn.className = 'toolbar-btn';
                shapeBtn.title = 'Insertar forma';
                shapeBtn.textContent = '⬚';

                var fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';

                imgBtn.addEventListener('click', function () {
                    fileInput.click();
                });

                fileInput.addEventListener('change', function () {
                    var file = fileInput.files && fileInput.files[0];
                    if (!file || !editor) return;
                    var reader = new FileReader();
                    reader.onload = function (ev) {
                        if (document.activeElement !== editor) editor.focus();
                        try {
                            document.execCommand('insertImage', false, String(ev.target.result || ''));
                        } catch (_) {
                            document.execCommand('insertHTML', false, '<img src="' + String(ev.target.result || '') + '" style="max-width:100%;height:auto;" />');
                        }
                    };
                    reader.readAsDataURL(file);
                    fileInput.value = '';
                });

                shapeBtn.addEventListener('click', function () {
                    if (!editor) return;
                    if (document.activeElement !== editor) editor.focus();
                    document.execCommand('insertHTML', false, '<span style="display:inline-block;border:1px solid currentColor;border-radius:4px;padding:0 0.45rem;line-height:1.2;">◻</span>');
                });

                panel.appendChild(imgBtn);
                panel.appendChild(shapeBtn);
                panel.appendChild(fileInput);
            }
        );

        var copyBtn = findEl('copyBtn');
        if (copyBtn) {
            copyBtn.classList.remove('btn-action-green');
            copyBtn.classList.add('toolbar-btn', 'mobile-toolbar-standalone');
            copyBtn.title = 'Copiar todo';
            copyBtn.setAttribute('aria-label', 'Copiar todo');
            toolbar.appendChild(copyBtn);
        }

        var medBtn = findEl('btnMedicalCheck');
        if (medBtn) {
            medBtn.classList.remove('btn', 'btn-outline', 'btn-sm-icon');
            medBtn.classList.add('toolbar-btn', 'mobile-toolbar-standalone');
            medBtn.title = 'Diccionario médico';
            medBtn.setAttribute('aria-label', 'Diccionario médico');
            medBtn.innerHTML = '\uD83E\uDE7A';
            toolbar.appendChild(medBtn);
        }

        ['clearFormatBtn', 'toggleFindReplace'].forEach(function (id) {
            var el = findEl(id);
            if (!el) return;
            el.classList.add('mobile-toolbar-standalone');
            toolbar.appendChild(el);
        });

        document.addEventListener('click', function (ev) {
            if (!toolbar.contains(ev.target)) {
                closeAllGroups(null);
            }
        });

        window.addEventListener('scroll', function () { closeAllGroups(null); }, true);

        toolbar.dataset.mobileGroupsReady = '1';
    }
})();
