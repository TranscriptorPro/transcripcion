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

    /* Ojo abierto = ver original (estado normal), Ojo con pestañas = viendo original (volver a estructurado) */
    var SVG_EYE_OPEN = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
    var SVG_EYE_LASHES = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">' +
        '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>' +
        '<line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="5.5" y1="4" x2="7" y2="6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="18.5" y1="4" x2="17" y2="6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>';

    function _applyOEIcon(btn) {
        var s = !!btn._showingOriginal;
        btn.innerHTML = s ? SVG_EYE_LASHES : SVG_EYE_OPEN;
        btn.title = s ? 'Volver a vista estructurada' : 'Ver texto original';
    }

    function syncCompactViewButtons() {
        var btn = document.getElementById('btnRestoreOriginal');
        if (!btn) return;
        _applyOEIcon(btn);
        if (!btn._mobileObserverSet) {
            btn._mobileObserverSet = true;
            /* MutationObserver: cada vez que ui.js o structurer.js cambie innerHTML, re-aplicar icono */
            var observer = new MutationObserver(function () {
                if (!isMobile()) return;
                /* Verificar si el contenido actual NO es nuestro SVG */
                var html = btn.innerHTML;
                if (html.indexOf('viewBox') === -1) {
                    _applyOEIcon(btn);
                }
            });
            observer.observe(btn, { childList: true, subtree: true, characterData: true });
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
                var target = ev.target.closest('button');
                /* Cerrar inmediatamente para BUTTON que ejecutan comandos, NUNCA para SELECT ni elementos del shape picker */
                if (target && target.tagName === 'BUTTON' && !target.classList.contains('mobile-shape-btn') && !target.classList.contains('mobile-shape-toggle') && !target.classList.contains('mobile-group-trigger')) {
                    wrapper.classList.remove('open');
                }
            });

            /* Para SELECT: cerrar al cambiar valor (change), no al click */
            panel.addEventListener('change', function () {
                setTimeout(function () {
                    wrapper.classList.remove('open');
                }, 200);
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
            'Insertar',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>',
            ['insertTableBtn', 'insertLinkBtn'],
            function (panel) {
                var editor = document.getElementById('editor');

                function _saveEditorRange() {
                    if (!editor) return;
                    var sel = window.getSelection && window.getSelection();
                    if (!sel || sel.rangeCount === 0) return;
                    var r = sel.getRangeAt(0);
                    var container = r.commonAncestorContainer;
                    if (container && (editor.contains(container) || container === editor)) {
                        editor._mobileSavedRange = r.cloneRange();
                    }
                }

                function _insertHtmlAtCursor(html) {
                    if (!editor) return;
                    var range = editor._mobileSavedRange || null;
                    editor.focus();
                    if (range) {
                        var sel = window.getSelection && window.getSelection();
                        if (sel) {
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                    }
                    try {
                        document.execCommand('insertHTML', false, html);
                    } catch (_) {
                        if (!range) {
                            range = document.createRange();
                            range.selectNodeContents(editor);
                            range.collapse(false);
                        }
                        var temp = document.createElement('div');
                        temp.innerHTML = html;
                        var frag = document.createDocumentFragment();
                        var node;
                        var lastNode = null;
                        while ((node = temp.firstChild)) {
                            lastNode = frag.appendChild(node);
                        }
                        range.deleteContents();
                        range.insertNode(frag);
                        if (lastNode) {
                            range = range.cloneRange();
                            range.setStartAfter(lastNode);
                            range.collapse(true);
                            var s = window.getSelection && window.getSelection();
                            if (s) {
                                s.removeAllRanges();
                                s.addRange(range);
                            }
                        }
                    }
                    _saveEditorRange();
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                }

                if (editor && !editor._mobileRangeHooked) {
                    editor._mobileRangeHooked = true;
                    ['mouseup', 'keyup', 'touchend'].forEach(function (evName) {
                        editor.addEventListener(evName, _saveEditorRange);
                    });
                    editor.addEventListener('focus', _saveEditorRange);
                }

                var imgBtn = document.createElement('button');
                imgBtn.type = 'button';
                imgBtn.className = 'toolbar-btn';
                imgBtn.title = 'Insertar imagen';
                imgBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';

                var shapeBtn = document.createElement('button');
                shapeBtn.type = 'button';
                shapeBtn.className = 'toolbar-btn mobile-shape-toggle';
                shapeBtn.title = 'Insertar forma';
                shapeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/><polygon points="17.5,3 21,10 14,10"/></svg>';

                var shapePicker = document.createElement('div');
                shapePicker.className = 'mobile-shape-picker';
                shapePicker.style.display = 'none';

                /* Selector de color para formas */
                var shapeColors = [
                    { label: 'Negro', color: '#000000' },
                    { label: 'Rojo', color: '#e53e3e' },
                    { label: 'Azul', color: '#3182ce' },
                    { label: 'Verde', color: '#38a169' },
                    { label: 'Naranja', color: '#dd6b20' },
                    { label: 'Morado', color: '#805ad5' },
                    { label: 'Rosa', color: '#d53f8c' },
                    { label: 'Gris', color: '#718096' }
                ];
                var selectedShapeColor = '#000000';
                var colorRow = document.createElement('div');
                colorRow.className = 'mobile-shape-color-row';
                shapeColors.forEach(function (sc) {
                    var dot = document.createElement('button');
                    dot.type = 'button';
                    dot.className = 'mobile-shape-color-dot' + (sc.color === selectedShapeColor ? ' active' : '');
                    dot.style.background = sc.color;
                    dot.title = sc.label;
                    dot.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        selectedShapeColor = sc.color;
                        colorRow.querySelectorAll('.mobile-shape-color-dot').forEach(function (d) { d.classList.remove('active'); });
                        dot.classList.add('active');
                    });
                    colorRow.appendChild(dot);
                });
                shapePicker.appendChild(colorRow);

                var shapes = [
                    { label: '▬', build: function (c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:80%;height:40px;border:2px solid ' + c + ';background:transparent;margin:8px auto;border-radius:4px;resize:both;overflow:auto;min-width:40px;min-height:20px;"></div>'; } },
                    { label: '□', build: function (c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:60px;height:60px;border:2px solid ' + c + ';background:transparent;margin:8px auto;border-radius:4px;resize:both;overflow:auto;min-width:20px;min-height:20px;"></div>'; } },
                    { label: '○', build: function (c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:60px;height:60px;border:2px solid ' + c + ';background:transparent;margin:8px auto;border-radius:50%;resize:both;overflow:auto;min-width:20px;min-height:20px;"></div>'; } },
                    { label: '△', build: function (c) { return '<svg class="editor-shape" contenteditable="false" viewBox="0 0 70 60" width="70" height="60" style="display:block;margin:8px auto;resize:both;overflow:auto;min-width:30px;min-height:30px;"><polygon points="35,2 68,58 2,58" fill="none" stroke="' + c + '" stroke-width="2"/></svg>'; } },
                    { label: '◇', build: function (c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:50px;height:50px;border:2px solid ' + c + ';background:transparent;margin:8px auto;transform:rotate(45deg);resize:both;overflow:auto;min-width:20px;min-height:20px;"></div>'; } },
                    { label: '⬭', build: function (c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:80px;height:50px;border:2px solid ' + c + ';background:transparent;margin:8px auto;border-radius:50%;resize:both;overflow:auto;min-width:20px;min-height:20px;"></div>'; } },
                    { label: '─', build: function (c) { return '<hr class="editor-shape" style="border:none;border-top:2px solid ' + c + ';margin:12px 0;">'; } }
                ];
                shapes.forEach(function (sh) {
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'toolbar-btn mobile-shape-btn';
                    b.textContent = sh.label;
                    b.title = 'Insertar ' + sh.label;
                    b.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        if (!editor) return;
                        _insertHtmlAtCursor(sh.build(selectedShapeColor));
                        shapePicker.style.display = 'none';
                    });
                    shapePicker.appendChild(b);
                });

                var fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';

                imgBtn.addEventListener('click', function () {
                    _saveEditorRange();
                    fileInput.click();
                });

                fileInput.addEventListener('change', function () {
                    var file = fileInput.files && fileInput.files[0];
                    if (!file || !editor) return;
                    var reader = new FileReader();
                    reader.onload = function (ev) {
                        _insertHtmlAtCursor('<div class="editor-img-wrap editor-shape" contenteditable="false" style="display:block;max-width:100%;width:auto;margin:8px auto;resize:both;overflow:auto;min-width:40px;min-height:40px;"><img src="' + String(ev.target.result || '') + '" style="width:100%;height:auto;display:block;pointer-events:none;" /></div>');
                    };
                    reader.readAsDataURL(file);
                    fileInput.value = '';
                });

                shapeBtn.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    shapePicker.style.display = shapePicker.style.display === 'none' ? 'grid' : 'none';
                });

                panel.appendChild(imgBtn);
                panel.appendChild(shapeBtn);
                panel.appendChild(fileInput);
                panel.appendChild(shapePicker);
            }
        );

        makeGroup(
            'Navegación',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3z"></path></svg>',
            ['undoBtn', 'redoBtn', 'btnEditorSnapshots']
        );

        /* ═══ Grupo Resaltado de texto con colores ═══ */
        (function buildHighlightGroup() {
            var highlightColors = [
                { label: 'Amarillo', color: '#fff176' },
                { label: 'Verde', color: '#a5d6a7' },
                { label: 'Celeste', color: '#81d4fa' },
                { label: 'Rosa', color: '#f48fb1' },
                { label: 'Naranja', color: '#ffcc80' },
                { label: 'Lila', color: '#ce93d8' },
                { label: 'Rojo suave', color: '#ef9a9a' },
                { label: 'Sin color', color: 'transparent' }
            ];
            var hlWrapper = document.createElement('div');
            hlWrapper.className = 'mobile-toolbar-group';
            var hlTrigger = createTrigger(
                '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.75 7L14 3.25l-10 10V17h3.75l10-10zm2.96-2.96a1.003 1.003 0 0 0 0-1.42L18.37.28a1.003 1.003 0 0 0-1.42 0L15 2.25 18.75 6l1.96-1.96z"/><path d="M2 20h20v4H2z" opacity="0.6" fill="#ffeb3b"/></svg>',
                'Resaltar texto'
            );
            var hlPanel = document.createElement('div');
            hlPanel.className = 'mobile-toolbar-panel mobile-highlight-panel';
            highlightColors.forEach(function (c) {
                var swatch = document.createElement('button');
                swatch.type = 'button';
                swatch.className = 'mobile-highlight-swatch';
                swatch.title = c.label;
                swatch.style.background = c.color === 'transparent' ? '#fff' : c.color;
                if (c.color === 'transparent') {
                    swatch.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14"><line x1="2" y1="14" x2="14" y2="2" stroke="#c00" stroke-width="2"/></svg>';
                }
                swatch.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    if (c.color === 'transparent') {
                        document.execCommand('removeFormat', false, null);
                    } else {
                        document.execCommand('hiliteColor', false, c.color);
                    }
                    /* Colapsar selección del navegador para que se vea el resaltado */
                    var sel = window.getSelection();
                    if (sel && !sel.isCollapsed) sel.collapseToEnd();
                    var ed = document.getElementById('editor');
                    if (ed) ed.focus();
                    hlWrapper.classList.remove('open');
                });
                hlPanel.appendChild(swatch);
            });
            hlTrigger.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var isOpen = hlWrapper.classList.contains('open');
                closeAllGroups(hlWrapper);
                hlWrapper.classList.toggle('open', !isOpen);
                if (!isOpen) {
                    requestAnimationFrame(function () {
                        var tRect = hlTrigger.getBoundingClientRect();
                        hlPanel.style.top = (tRect.bottom + 4) + 'px';
                        hlPanel.style.left = tRect.left + 'px';
                        var pRect = hlPanel.getBoundingClientRect();
                        if (pRect.right > window.innerWidth - 8) {
                            hlPanel.style.left = Math.max(4, window.innerWidth - pRect.width - 8) + 'px';
                        }
                    });
                }
            });
            hlWrapper.appendChild(hlTrigger);
            hlWrapper.appendChild(hlPanel);
            toolbar.appendChild(hlWrapper);
        })();

        /* === Standalone buttons en orden: limpiar, copiar, diccionario, búsqueda === */
        var clearBtn = findEl('clearFormatBtn');
        if (clearBtn) {
            clearBtn.classList.add('mobile-toolbar-standalone');
            toolbar.appendChild(clearBtn);
        }

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
            if (!medBtn._mobileDictHooked) {
                medBtn._mobileDictHooked = true;
                medBtn.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    var editor = document.getElementById('editor');
                    var hasContent = !!(editor && String(editor.innerText || '').trim());
                    if (typeof window.openMedDictModal === 'function') {
                        window.openMedDictModal({
                            skipEditorCheck: !hasContent,
                            defaultTab: hasContent ? 'review' : 'dictionary'
                        });
                        return;
                    }
                    if (typeof window.checkMedicalTerminology === 'function') {
                        window.checkMedicalTerminology();
                    }
                }, true);
            }
            toolbar.appendChild(medBtn);
        }

        var findReplBtn = findEl('toggleFindReplace');
        if (findReplBtn) {
            findReplBtn.classList.add('mobile-toolbar-standalone');
            toolbar.appendChild(findReplBtn);
        }

        /* Clicks en botones de paneles: cerrar el grupo padre tras la acción */
        toolbar.querySelectorAll('.mobile-toolbar-panel .toolbar-btn').forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                var groupWrapper = btn.closest('.mobile-toolbar-group');
                if (groupWrapper && !btn.classList.contains('mobile-shape-btn') && !btn.classList.contains('mobile-shape-toggle') && !btn.classList.contains('mobile-group-trigger')) {
                    groupWrapper.classList.remove('open');
                }
            }, false);
        });

        document.addEventListener('click', function (ev) {
            if (!toolbar.contains(ev.target)) {
                closeAllGroups(null);
            }
        });

        window.addEventListener('scroll', function () { closeAllGroups(null); }, true);

        /* Ocultar botones originales desktop de imagen/forma (reemplazados en grupo Insertar mobile) */
        ['insertImageBtn', 'insertShapeBtn'].forEach(function (id) {
            var el = findEl(id);
            if (el) el.style.display = 'none';
        });
        toolbar.querySelectorAll('.desktop-shape-picker').forEach(function (el) {
            el.style.display = 'none';
        });

        toolbar.dataset.mobileGroupsReady = '1';
    }

    /* ── Table column/row resize via touch/pointer drag ── */
    function initTableResize() {
        var editor = document.getElementById('editor');
        if (!editor) return;

        var EDGE = 10; // px threshold to detect border
        var dragging = null; // { type: 'col'|'row', table, index, startPos, startSizes }

        function getCellAt(x, y) {
            var el = document.elementFromPoint(x, y);
            if (!el) return null;
            var td = el.closest('td, th');
            if (!td) return null;
            var table = td.closest('table');
            if (!table || !editor.contains(table)) return null;
            return { td: td, table: table };
        }

        function getEdge(td, x, y) {
            var r = td.getBoundingClientRect();
            // Right edge = column resize
            if (Math.abs(x - r.right) < EDGE && td.cellIndex < td.parentElement.cells.length - 1) {
                return { type: 'col', index: td.cellIndex };
            }
            // Left edge (resize previous column)
            if (Math.abs(x - r.left) < EDGE && td.cellIndex > 0) {
                return { type: 'col', index: td.cellIndex - 1 };
            }
            // Bottom edge = row resize
            if (Math.abs(y - r.bottom) < EDGE) {
                return { type: 'row', index: td.parentElement.rowIndex };
            }
            // Top edge (resize previous row)
            if (Math.abs(y - r.top) < EDGE && td.parentElement.rowIndex > 0) {
                return { type: 'row', index: td.parentElement.rowIndex - 1 };
            }
            return null;
        }

        function getColWidths(table) {
            var firstRow = table.rows[0];
            if (!firstRow) return [];
            var widths = [];
            for (var i = 0; i < firstRow.cells.length; i++) {
                widths.push(firstRow.cells[i].getBoundingClientRect().width);
            }
            return widths;
        }

        function getRowHeights(table) {
            var heights = [];
            for (var i = 0; i < table.rows.length; i++) {
                heights.push(table.rows[i].getBoundingClientRect().height);
            }
            return heights;
        }

        function applyColWidths(table, widths) {
            table.style.tableLayout = 'fixed';
            var total = widths.reduce(function (s, w) { return s + w; }, 0);
            for (var ri = 0; ri < table.rows.length; ri++) {
                var row = table.rows[ri];
                for (var ci = 0; ci < row.cells.length && ci < widths.length; ci++) {
                    row.cells[ci].style.width = ((widths[ci] / total) * 100).toFixed(2) + '%';
                }
            }
        }

        function applyRowHeight(table, rowIndex, height) {
            if (table.rows[rowIndex]) {
                table.rows[rowIndex].style.height = Math.max(20, height) + 'px';
            }
        }

        function pointerPos(ev) {
            if (ev.touches && ev.touches.length) return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
            return { x: ev.clientX, y: ev.clientY };
        }

        function onStart(ev) {
            var p = pointerPos(ev);
            var hit = getCellAt(p.x, p.y);
            if (!hit) return;
            var edge = getEdge(hit.td, p.x, p.y);
            if (!edge) return;

            ev.preventDefault();
            dragging = {
                type: edge.type,
                table: hit.table,
                index: edge.index,
                startX: p.x,
                startY: p.y,
                colWidths: getColWidths(hit.table),
                rowHeights: getRowHeights(hit.table)
            };
            editor.style.userSelect = 'none';
            editor.style.webkitUserSelect = 'none';
        }

        function onMove(ev) {
            if (!dragging) {
                // Show resize cursor hint
                var p = pointerPos(ev);
                var hit = getCellAt(p.x, p.y);
                if (hit) {
                    var edge = getEdge(hit.td, p.x, p.y);
                    editor.style.cursor = edge ? (edge.type === 'col' ? 'col-resize' : 'row-resize') : '';
                } else {
                    editor.style.cursor = '';
                }
                return;
            }

            ev.preventDefault();
            var p = pointerPos(ev);
            var d = dragging;

            if (d.type === 'col') {
                var dx = p.x - d.startX;
                var newWidths = d.colWidths.slice();
                var w1 = d.colWidths[d.index] + dx;
                var w2 = d.colWidths[d.index + 1] - dx;
                if (w1 >= 30 && w2 >= 30) {
                    newWidths[d.index] = w1;
                    newWidths[d.index + 1] = w2;
                    applyColWidths(d.table, newWidths);
                }
            } else {
                var dy = p.y - d.startY;
                applyRowHeight(d.table, d.index, d.rowHeights[d.index] + dy);
            }
        }

        function onEnd() {
            if (dragging) {
                dragging = null;
                editor.style.userSelect = '';
                editor.style.webkitUserSelect = '';
                editor.style.cursor = '';
            }
        }

        editor.addEventListener('pointerdown', onStart, { passive: false });
        editor.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('pointermove', onMove, { passive: false });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('pointerup', onEnd);
        document.addEventListener('touchend', onEnd);
    }

    if (window.innerWidth <= 900 || 'ontouchstart' in window) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initTableResize);
        } else {
            initTableResize();
        }
    }
})();
