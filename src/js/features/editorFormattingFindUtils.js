// ============ EDITOR: FORMATTING + FIND/REPLACE ============

(function initEditorFormattingFindUtils() {
    const editor = document.getElementById('editor');
    const $ = id => document.getElementById(id);

    function _collapseSelection() {
        var sel = window.getSelection();
        if (sel && !sel.isCollapsed) sel.collapseToEnd();
    }

    function executeFormatAndFocus(cmd) {
        document.execCommand(cmd, false, null);
        _collapseSelection();
        if (editor) editor.focus();
        updateActiveStates();
    }

    const formatButtons = {
        boldBtn: 'bold',
        italicBtn: 'italic',
        underlineBtn: 'underline',
        strikeBtn: 'strikeThrough',
        alignLeftBtn: 'justifyLeft',
        alignCenterBtn: 'justifyCenter',
        alignRightBtn: 'justifyRight',
        justifyBtn: 'justifyFull',
        bulletListBtn: 'insertUnorderedList',
        numberedListBtn: 'insertOrderedList'
    };

    function updateActiveStates() {
        for (const [id, command] of Object.entries(formatButtons)) {
            const btn = $(id);
            if (btn) {
                btn.classList.toggle('active', document.queryCommandState(command));
            }
        }
    }

    function handleFontSizeChange(increase = true) {
        if (!editor) return;
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        var range = sel.getRangeAt(0);
        if (range.collapsed) {
            // No selection: apply to cursor position for next typing
            var span = document.createElement('span');
            var anchorEl = sel.anchorNode?.parentElement || editor;
            var currentSize = parseInt(window.getComputedStyle(anchorEl).fontSize, 10) || parseInt(window.getComputedStyle(editor).fontSize, 10);
            var newSize = increase ? currentSize + 2 : Math.max(10, currentSize - 2);
            span.style.fontSize = newSize + 'px';
            span.appendChild(document.createTextNode('\u200B'));
            range.insertNode(span);
            range.setStartAfter(span.firstChild);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            editor.focus();
            return;
        }
        // Has selection: wrap in span and re-select it
        var extracted = range.extractContents();
        var span2 = document.createElement('span');
        var anchorEl2 = sel.anchorNode?.parentElement || editor;
        var currentSize2 = parseInt(window.getComputedStyle(anchorEl2).fontSize, 10) || parseInt(window.getComputedStyle(editor).fontSize, 10);
        var newSize2 = increase ? currentSize2 + 2 : Math.max(10, currentSize2 - 2);
        span2.style.fontSize = newSize2 + 'px';
        span2.appendChild(extracted);
        range.insertNode(span2);
        // Re-select the inserted span so user can press +/- again
        var newRange = document.createRange();
        newRange.selectNodeContents(span2);
        sel.removeAllRanges();
        sel.addRange(newRange);
        editor.focus();
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlightText(text) {
        if (!editor) return;
        let content = editor.innerHTML;
        content = content.replace(/<mark>(.*?)<\/mark>/gi, '$1');
        if (!text) {
            editor.innerHTML = content;
            return;
        }
        const highlighted = content.replace(new RegExp(`(${escapeRegex(text)})`, 'gi'), '<mark>$1</mark>');
        editor.innerHTML = highlighted;
    }

    const btnMatchCase = $('btnMatchCase');
    const btnWholeWord = $('btnWholeWord');

    function isFRMatchCase() { return btnMatchCase?.getAttribute('aria-pressed') === 'true'; }
    function isFRWholeWord() { return btnWholeWord?.getAttribute('aria-pressed') === 'true'; }

    function buildSearchRegex(find, forAll) {
        let pattern = escapeRegex(find);
        if (isFRWholeWord()) pattern = `(?<![\\w\u00C0-\u017E])${pattern}(?![\\w\u00C0-\u017E])`;
        const flags = (isFRMatchCase() ? '' : 'i') + (forAll ? 'g' : '');
        return new RegExp(pattern, flags);
    }

    function replaceInTextNodes(rootEl, regex, replaceWith) {
        let count = 0;
        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
        const nodes = [];
        let node;
        while ((node = walker.nextNode())) nodes.push(node);
        for (const textNode of nodes) {
            const original = textNode.nodeValue;
            const replaced = original.replace(regex, replaceWith);
            if (replaced !== original) {
                count += (original.match(regex) || []).length;
                textNode.nodeValue = replaced;
            }
        }
        return count;
    }

    window.formatText = cmd => executeFormatAndFocus(cmd);
    window.updateActiveStates = updateActiveStates;
    window.escapeRegex = escapeRegex;
    window.buildSearchRegex = buildSearchRegex;
    window.highlightText = highlightText;
    window.replaceInTextNodes = replaceInTextNodes;

    for (const [id, command] of Object.entries(formatButtons)) {
        const btn = $(id);
        if (btn) btn.addEventListener('click', () => executeFormatAndFocus(command));
    }

    document.addEventListener('selectionchange', updateActiveStates);

    if (editor) {
        editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                let handled = true;
                switch (e.key.toLowerCase()) {
                    case 'b': document.execCommand('bold', false, null); break;
                    case 'i': document.execCommand('italic', false, null); break;
                    case 'u': document.execCommand('underline', false, null); break;
                    default: handled = false;
                }
                if (handled) {
                    e.preventDefault();
                    _collapseSelection();
                    updateActiveStates();
                }
            }
        });
    }

    const fontSizeToolbar = $('fontSizeToolbar');
    if (fontSizeToolbar && editor) {
        fontSizeToolbar.addEventListener('change', () => {
            document.execCommand('fontSize', false, '7');
            const fontElements = editor.querySelectorAll('font[size="7"]');
            fontElements.forEach(el => {
                el.removeAttribute('size');
                el.style.fontSize = fontSizeToolbar.value;
            });
            _collapseSelection();
            editor.focus();
        });
    }

    const increaseFontBtn = $('increaseFontBtn');
    if (increaseFontBtn) increaseFontBtn.addEventListener('click', () => handleFontSizeChange(true));

    const decreaseFontBtn = $('decreaseFontBtn');
    if (decreaseFontBtn) decreaseFontBtn.addEventListener('click', () => handleFontSizeChange(false));

    const lineSpacingSelect = $('lineSpacingSelect');
    if (lineSpacingSelect && editor) {
        lineSpacingSelect.addEventListener('change', () => {
            editor.style.lineHeight = lineSpacingSelect.value;
            _collapseSelection();
        });
    }

    const clearFormatBtn = $('clearFormatBtn');
    if (clearFormatBtn && editor) {
        clearFormatBtn.addEventListener('click', () => {
            document.execCommand('removeFormat', false, null);
            _collapseSelection();
            editor.focus();
        });
    }

    const insertLinkBtn = $('insertLinkBtn');
    if (insertLinkBtn && editor) {
        insertLinkBtn.addEventListener('click', async () => {
            const url = await window.showCustomPrompt('Ingrese la URL:', 'https://ejemplo.com');
            if (url) {
                document.execCommand('createLink', false, url);
                _collapseSelection();
                editor.focus();
            }
        });
    }

    // ── Insertar Tabla (grid picker estilo Word) ──
    const insertTableBtn = $('insertTableBtn');
    if (insertTableBtn && editor) {
        var _tableGridPicker = document.createElement('div');
        _tableGridPicker.className = 'desktop-table-grid-picker';
        _tableGridPicker.style.display = 'none';

        var _gridLabel = document.createElement('div');
        _gridLabel.className = 'table-grid-label';
        _gridLabel.textContent = 'Insertar tabla';
        _tableGridPicker.appendChild(_gridLabel);

        var _gridContainer = document.createElement('div');
        _gridContainer.className = 'table-grid-cells';
        var MAX_ROWS = 8, MAX_COLS = 8;
        var _gridCells = [];
        for (var gr = 0; gr < MAX_ROWS; gr++) {
            for (var gc = 0; gc < MAX_COLS; gc++) {
                var cell = document.createElement('div');
                cell.className = 'table-grid-cell';
                cell.dataset.row = gr;
                cell.dataset.col = gc;
                _gridContainer.appendChild(cell);
                _gridCells.push(cell);
            }
        }
        _tableGridPicker.appendChild(_gridContainer);
        document.body.appendChild(_tableGridPicker);

        function _highlightGridCells(row, col) {
            _gridCells.forEach(function(c) {
                var r = parseInt(c.dataset.row), cc = parseInt(c.dataset.col);
                c.classList.toggle('active', r <= row && cc <= col);
            });
            _gridLabel.textContent = (row + 1) + ' × ' + (col + 1) + ' Tabla';
        }

        _gridContainer.addEventListener('mousemove', function(ev) {
            var cell = ev.target.closest('.table-grid-cell');
            if (cell) _highlightGridCells(parseInt(cell.dataset.row), parseInt(cell.dataset.col));
        });

        _gridContainer.addEventListener('mouseleave', function() {
            _gridCells.forEach(function(c) { c.classList.remove('active'); });
            _gridLabel.textContent = 'Insertar tabla';
        });

        _gridContainer.addEventListener('click', function(ev) {
            var cell = ev.target.closest('.table-grid-cell');
            if (!cell) return;
            var nRows = parseInt(cell.dataset.row) + 1;
            var nCols = parseInt(cell.dataset.col) + 1;
            _tableGridPicker.style.display = 'none';

            var table = document.createElement('table');
            table.setAttribute('border', '1');
            table.style.cssText = 'border-collapse:collapse;width:100%;margin:1rem 0;table-layout:fixed;';
            var colW = (100 / nCols).toFixed(2) + '%';
            for (var i = 0; i < nRows; i++) {
                var tr = table.insertRow();
                for (var j = 0; j < nCols; j++) {
                    var td = tr.insertCell();
                    td.style.cssText = 'border:1px solid var(--border,#ddd);padding:8px;width:' + colW + ';min-height:24px;';
                    td.innerHTML = '&nbsp;';
                }
            }
            if (document.activeElement !== editor) editor.focus();
            var sel = window.getSelection();
            if (sel.rangeCount && editor.contains(sel.anchorNode)) {
                var range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(table);
                range.setStartAfter(table);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                editor.appendChild(table);
            }
            editor.focus();
            // Place cursor in first cell
            var firstCell = table.querySelector('td');
            if (firstCell) {
                var r = document.createRange();
                r.setStart(firstCell, 0);
                r.collapse(true);
                var s = window.getSelection();
                s.removeAllRanges();
                s.addRange(r);
            }
            if (typeof saveUndoState === 'function') saveUndoState();
        });

        function _positionTableGrid() {
            var r = insertTableBtn.getBoundingClientRect();
            _tableGridPicker.style.top = (r.bottom + 4) + 'px';
            _tableGridPicker.style.left = r.left + 'px';
        }

        insertTableBtn.addEventListener('click', function(ev) {
            ev.stopPropagation();
            var show = _tableGridPicker.style.display === 'none';
            _tableGridPicker.style.display = show ? 'block' : 'none';
            if (show) _positionTableGrid();
        });

        document.addEventListener('click', function(ev) {
            if (!_tableGridPicker.contains(ev.target) && ev.target !== insertTableBtn) {
                _tableGridPicker.style.display = 'none';
            }
        });
    }

    // ── Insertar Imagen ──
    const insertImageBtn = $('insertImageBtn');
    if (insertImageBtn && editor) {
        const imgFileInput = document.createElement('input');
        imgFileInput.type = 'file';
        imgFileInput.accept = 'image/*';
        imgFileInput.style.display = 'none';
        document.body.appendChild(imgFileInput);

        insertImageBtn.addEventListener('click', () => imgFileInput.click());

        imgFileInput.addEventListener('change', () => {
            const file = imgFileInput.files && imgFileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (document.activeElement !== editor) editor.focus();
                var imgHtml = '<div class="editor-img-wrap editor-shape" contenteditable="false" style="display:block;width:256px;height:256px;margin:8px auto;overflow:hidden;min-width:40px;min-height:40px;"><img src="' + String(ev.target.result || '') + '" style="width:100%;height:100%;display:block;pointer-events:none;object-fit:contain;" /></div>';
                document.execCommand('insertHTML', false, imgHtml);
                if (typeof saveUndoState === 'function') saveUndoState();
            };
            reader.readAsDataURL(file);
            imgFileInput.value = '';
        });
    }

    // ── Insertar Forma (con selector de color) ──
    const insertShapeBtn = $('insertShapeBtn');
    if (insertShapeBtn && editor) {
        const shapePicker = document.createElement('div');
        shapePicker.className = 'desktop-shape-picker';
        shapePicker.style.display = 'none';

        // Color picker row
        var _desktopShapeColor = '#000000';
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
        var colorRow = document.createElement('div');
        colorRow.className = 'desktop-shape-color-row';
        shapeColors.forEach(function (sc) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'desktop-shape-color-dot' + (sc.color === _desktopShapeColor ? ' active' : '');
            dot.style.background = sc.color;
            dot.title = sc.label;
            dot.addEventListener('click', function (ev) {
                ev.stopPropagation();
                _desktopShapeColor = sc.color;
                colorRow.querySelectorAll('.desktop-shape-color-dot').forEach(function (d) { d.classList.remove('active'); });
                dot.classList.add('active');
                // If a shape is selected, change its color live
                if (typeof window._changeActiveShapeColor === 'function') {
                    window._changeActiveShapeColor(sc.color);
                }
            });
            colorRow.appendChild(dot);
        });
        shapePicker.appendChild(colorRow);

        const shapes = [
            { label: '▬', build: function(c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:80%;height:40px;border:2px solid ' + c + ';background:transparent;margin:8px auto;border-radius:4px;overflow:hidden;"></div>'; } },
            { label: '□', build: function(c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:60px;height:60px;border:2px solid ' + c + ';background:transparent;margin:8px auto;border-radius:4px;overflow:hidden;"></div>'; } },
            { label: '○', build: function(c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:60px;height:60px;border:2px solid ' + c + ';background:transparent;margin:8px auto;border-radius:50%;overflow:hidden;"></div>'; } },
            { label: '△', build: function(c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:70px;height:60px;margin:8px auto;overflow:hidden;"><svg viewBox="0 0 70 60" width="100%" height="100%"><polygon points="35,2 68,58 2,58" fill="none" stroke="' + c + '" stroke-width="2"/></svg></div>'; } },
            { label: '◇', build: function(c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:50px;height:50px;border:2px solid ' + c + ';background:transparent;margin:8px auto;transform:rotate(45deg);overflow:hidden;"></div>'; } },
            { label: '⬭', build: function(c) { return '<div class="editor-shape" contenteditable="false" style="display:block;width:80px;height:50px;border:2px solid ' + c + ';background:transparent;margin:8px auto;border-radius:50%;overflow:hidden;"></div>'; } },
            { label: '─', build: function(c) { return '<hr class="editor-shape" style="border:none;border-top:2px solid ' + c + ';margin:12px 0;">'; } }
        ];
        shapes.forEach((sh) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'toolbar-btn desktop-shape-btn';
            b.textContent = sh.label;
            b.title = 'Insertar ' + sh.label;
            b.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (document.activeElement !== editor) editor.focus();
                document.execCommand('insertHTML', false, sh.build(_desktopShapeColor));
                shapePicker.style.display = 'none';
                if (typeof saveUndoState === 'function') saveUndoState();
            });
            shapePicker.appendChild(b);
        });

        document.body.appendChild(shapePicker);

        function _positionShapePicker() {
            var r = insertShapeBtn.getBoundingClientRect();
            shapePicker.style.top  = (r.bottom + 4) + 'px';
            shapePicker.style.left = r.left + 'px';
        }

        insertShapeBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            var show = shapePicker.style.display === 'none';
            shapePicker.style.display = show ? 'grid' : 'none';
            if (show) _positionShapePicker();
        });

        document.addEventListener('click', (ev) => {
            if (!shapePicker.contains(ev.target) && ev.target !== insertShapeBtn) {
                shapePicker.style.display = 'none';
            }
        });
    }

    // ── Highlight / Resaltador de texto ──
    const highlightBtn = $('highlightBtn');
    if (highlightBtn && editor) {
        var _highlightColors = ['#fef08a','#bbf7d0','#bfdbfe','#fbcfe8','#fde68a','#c4b5fd','#fed7aa','#fecaca'];
        var _hlPickerEl = document.createElement('div');
        _hlPickerEl.className = 'desktop-highlight-picker';
        _hlPickerEl.style.display = 'none';
        _highlightColors.forEach(function(c) {
            var sw = document.createElement('button');
            sw.type = 'button';
            sw.className = 'desktop-highlight-swatch';
            sw.style.background = c;
            sw.title = 'Resaltar con ' + c;
            sw.addEventListener('click', function(ev) {
                ev.stopPropagation();
                if (document.activeElement !== editor) editor.focus();
                document.execCommand('hiliteColor', false, c);
                _hlPickerEl.style.display = 'none';
                _collapseSelection();
                if (typeof saveUndoState === 'function') saveUndoState();
            });
            _hlPickerEl.appendChild(sw);
        });
        // Botón quitar resaltado
        var swNone = document.createElement('button');
        swNone.type = 'button';
        swNone.className = 'desktop-highlight-swatch desktop-highlight-none';
        swNone.title = 'Quitar resaltado';
        swNone.textContent = '✕';
        swNone.addEventListener('click', function(ev) {
            ev.stopPropagation();
            if (document.activeElement !== editor) editor.focus();
            document.execCommand('hiliteColor', false, 'transparent');
            _hlPickerEl.style.display = 'none';
            _collapseSelection();
            if (typeof saveUndoState === 'function') saveUndoState();
        });
        _hlPickerEl.appendChild(swNone);

        document.body.appendChild(_hlPickerEl);

        function _positionHlPicker() {
            var r = highlightBtn.getBoundingClientRect();
            _hlPickerEl.style.top  = (r.bottom + 4) + 'px';
            _hlPickerEl.style.left = Math.max(0, r.left + r.width / 2 - 100) + 'px';
        }

        highlightBtn.addEventListener('click', function(ev) {
            ev.stopPropagation();
            var show = _hlPickerEl.style.display === 'none';
            _hlPickerEl.style.display = show ? 'flex' : 'none';
            if (show) _positionHlPicker();
        });
        document.addEventListener('click', function(ev) {
            if (!_hlPickerEl.contains(ev.target) && ev.target !== highlightBtn) {
                _hlPickerEl.style.display = 'none';
            }
        });
    }

    // ── Word-style shape selection, resize handles & drag ──
    (function initShapeInteraction() {
        if (!editor) return;

        var activeShape = null; // currently selected shape
        var handleEls = [];     // 8 handle DOM elements
        var interaction = null; // { mode:'drag'|'resize', ... }
        var copiedShapeTemplate = null; // cloned node template for Ctrl+C / Ctrl+V
        var IS_TOUCH_DEVICE = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

        var HANDLE_SIZE = IS_TOUCH_DEVICE ? 18 : 7;    // px diameter (mobile reduced ~25%)
        var TOUCH_DRAG_THRESHOLD = 18; // px: avoid accidental move on tap
        // handle positions: [name, xFactor, yFactor]
        var HANDLE_DEFS = [
            ['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0],
            ['w', 0, 0.5],                ['e', 1, 0.5],
            ['sw', 0, 1], ['s', 0.5, 1], ['se', 1, 1]
        ];
        var CURSORS = { nw:'nwse-resize', n:'ns-resize', ne:'nesw-resize', w:'ew-resize', e:'ew-resize', sw:'nesw-resize', s:'ns-resize', se:'nwse-resize' };

        // Create handle elements (hidden by default)
        HANDLE_DEFS.forEach(function(def) {
            var h = document.createElement('div');
            h.className = 'editor-shape-handle';
            h.dataset.dir = def[0];
            h.style.cssText = 'position:absolute;width:'+HANDLE_SIZE+'px;height:'+HANDLE_SIZE+'px;background:#fff;border:1.5px solid #3b82f6;border-radius:50%;z-index:999;pointer-events:auto;cursor:'+CURSORS[def[0]]+';display:none;box-shadow:0 0 2px rgba(0,0,0,.3);touch-action:none;';
            document.body.appendChild(h);
            handleEls.push({ el: h, name: def[0], xf: def[1], yf: def[2] });
        });

        // Floating action bar (delete + copy) for selected elements
        var mobileActionBar = document.createElement('div');
        mobileActionBar.className = 'shape-mobile-actionbar';
        mobileActionBar.style.display = 'none';

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'shape-action-btn shape-action-delete';
        delBtn.innerHTML = '🗑️';
        delBtn.title = 'Eliminar';
        delBtn.addEventListener('click', function(ev) {
            ev.preventDefault(); ev.stopPropagation();
            if (!activeShape) return;
            var toRemove = activeShape;
            deselectShape();
            toRemove.parentNode.removeChild(toRemove);
            if (typeof saveUndoState === 'function') saveUndoState();
        });

        var copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'shape-action-btn shape-action-copy';
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copiar';
        copyBtn.addEventListener('click', function(ev) {
            ev.preventDefault(); ev.stopPropagation();
            if (!activeShape) return;
            var clone = activeShape.cloneNode(true);
            clone.style.outline = '';
            activeShape.parentNode.insertBefore(clone, activeShape.nextSibling);
            deselectShape();
            selectShape(clone);
            if (typeof saveUndoState === 'function') saveUndoState();
        });

        mobileActionBar.appendChild(copyBtn);
        mobileActionBar.appendChild(delBtn);
        document.body.appendChild(mobileActionBar);

        function positionMobileActionBar() {
            if (!mobileActionBar || !activeShape) { if (mobileActionBar) mobileActionBar.style.display = 'none'; return; }
            var r = activeShape.getBoundingClientRect();
            var barW = 76; // approx width of 2 buttons
            var left = r.left + r.width / 2 - barW / 2 + window.scrollX;
            var top = r.top - 40 + window.scrollY;
            if (top < window.scrollY + 4) top = r.bottom + 4 + window.scrollY;
            mobileActionBar.style.left = Math.max(4, left) + 'px';
            mobileActionBar.style.top = top + 'px';
            mobileActionBar.style.display = 'flex';
        }

        function hideMobileActionBar() {
            if (mobileActionBar) mobileActionBar.style.display = 'none';
        }

        function positionHandles() {
            if (!activeShape) return;
            var r = activeShape.getBoundingClientRect();
            var half = HANDLE_SIZE / 2;
            handleEls.forEach(function(h) {
                h.el.style.left = (r.left + r.width * h.xf - half + window.scrollX) + 'px';
                h.el.style.top  = (r.top + r.height * h.yf - half + window.scrollY) + 'px';
                h.el.style.display = 'block';
            });
        }

        function hideHandles() {
            handleEls.forEach(function(h) { h.el.style.display = 'none'; });
        }

        function selectShape(shape) {
            if (activeShape === shape) return;
            deselectShape();
            activeShape = shape;
            shape.style.outline = '1.5px solid #3b82f6';
            // For tables: block cell editing while selected
            if (shape.tagName === 'TABLE') {
                shape.setAttribute('contenteditable', 'false');
                shape.style.cursor = 'grab';
            }
            // Clear text caret so no blinking cursor appears near shape
            var sel = window.getSelection();
            if (sel) sel.removeAllRanges();
            positionHandles();
            positionMobileActionBar();
        }

        function deselectShape() {
            if (!activeShape) return;
            activeShape.style.outline = '';
            // For tables: restore cell editing
            if (activeShape.tagName === 'TABLE') {
                activeShape.removeAttribute('contenteditable');
                activeShape.style.cursor = '';
            }
            activeShape = null;
            hideHandles();
            hideMobileActionBar();
        }

        function isShapeEl(el) {
            if (!el) return null;
            var s = el.closest('.editor-shape');
            return (s && editor.contains(s) && s.tagName !== 'HR') ? s : null;
        }

        // Detect click on the outer border of a table (for selection)
        var TABLE_BORDER_ZONE = 8; // px from outer edge
        function isTableBorderClick(el, x, y) {
            if (!el) return null;
            var table = el.closest('table');
            if (!table || !editor.contains(table)) return null;
            var r = table.getBoundingClientRect();
            // Must be within the table bounds
            if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
            // On touch devices, allow selecting table by tapping anywhere in table area.
            if (IS_TOUCH_DEVICE) return table;
            // Near outer edges?
            if (x - r.left < TABLE_BORDER_ZONE || r.right - x < TABLE_BORDER_ZONE ||
                y - r.top < TABLE_BORDER_ZONE || r.bottom - y < TABLE_BORDER_ZONE) {
                return table;
            }
            return null;
        }

        // Fallback: clicking inside wrapped image should always keep it selected.
        editor.addEventListener('click', function(ev) {
            var imgWrap = ev.target && ev.target.closest ? ev.target.closest('.editor-img-wrap.editor-shape') : null;
            if (imgWrap && editor.contains(imgWrap)) {
                selectShape(imgWrap);
                return;
            }
            // Small-screen fallback: selecting table on tap/click should always work.
            if (window.innerWidth <= 900) {
                var tbl = ev.target && ev.target.closest ? ev.target.closest('table') : null;
                if (tbl && editor.contains(tbl)) {
                    selectShape(tbl);
                }
            }
        }, true);

        function ppos(ev) {
            if (ev.touches && ev.touches.length) return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
            return { x: ev.clientX, y: ev.clientY };
        }

        function findHandleAtPoint(x, y, expandPx) {
            var extra = Math.max(0, Number(expandPx) || 0);
            for (var i = 0; i < handleEls.length; i++) {
                var hr = handleEls[i].el.getBoundingClientRect();
                if (x >= hr.left - extra && x <= hr.right + extra && y >= hr.top - extra && y <= hr.bottom + extra) {
                    return handleEls[i];
                }
            }
            return null;
        }

        function shouldKeepShapeSelection(target) {
            if (!target || !target.closest) return false;
            return !!(
                target.closest('.editor-shape-handle') ||
                target.closest('.desktop-shape-picker') ||
                target.closest('.desktop-highlight-picker') ||
                target.closest('#insertShapeBtn') ||
                target.closest('#highlightBtn') ||
                target.closest('.shape-mobile-actionbar') ||
                target.closest('.desktop-table-grid-picker') ||
                target.closest('#insertTableBtn') ||
                target.closest('.mobile-toolbar-group')
            );
        }

        // Click on shape → select; click outside → deselect
        document.addEventListener('pointerdown', function(ev) {
            if (ev.pointerType === 'touch') return;
            var p = ppos(ev);
            // Check if clicked a handle
            var handleHit = findHandleAtPoint(p.x, p.y, 0);
            if (handleHit && activeShape) {
                // Start resize
                ev.preventDefault();
                var sr = activeShape.getBoundingClientRect();
                interaction = {
                    mode: 'resize',
                    dir: handleHit.name,
                    el: activeShape,
                    startX: p.x, startY: p.y,
                    origLeft: parseFloat(activeShape.style.marginLeft) || 0,
                    origTop: parseFloat(activeShape.style.marginTop) || 0,
                    origW: sr.width, origH: sr.height
                };
                editor.style.userSelect = 'none';
                return;
            }

            var shape = isShapeEl(ev.target);
            if (shape) {
                ev.preventDefault();
                selectShape(shape);
                // Start drag
                interaction = {
                    mode: 'drag',
                    el: shape,
                    startX: p.x, startY: p.y,
                    origLeft: parseFloat(shape.style.marginLeft) || 0,
                    origTop: parseFloat(shape.style.marginTop) || 0,
                    moved: false
                };
                shape.style.cursor = 'grabbing';
                editor.style.userSelect = 'none';
                return;
            }

            // Small-screen fallback: clicking/tapping any table area selects table.
            if (window.innerWidth <= 900) {
                var mobileTableSel = ev.target && ev.target.closest ? ev.target.closest('table') : null;
                if (mobileTableSel && editor.contains(mobileTableSel)) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    selectShape(mobileTableSel);
                    interaction = {
                        mode: 'drag',
                        el: mobileTableSel,
                        startX: p.x, startY: p.y,
                        origLeft: parseFloat(mobileTableSel.style.marginLeft) || 0,
                        origTop: parseFloat(mobileTableSel.style.marginTop) || 0,
                        moved: false
                    };
                    mobileTableSel.style.cursor = 'grabbing';
                    editor.style.userSelect = 'none';
                    return;
                }
            }

            // Check for table border click → select table
            var tableSel = isTableBorderClick(ev.target, p.x, p.y);
            if (tableSel) {
                ev.preventDefault();
                ev.stopPropagation(); // prevent table cell resize from firing
                selectShape(tableSel);
                interaction = {
                    mode: 'drag',
                    el: tableSel,
                    startX: p.x, startY: p.y,
                    origLeft: parseFloat(tableSel.style.marginLeft) || 0,
                    origTop: parseFloat(tableSel.style.marginTop) || 0,
                    moved: false
                };
                tableSel.style.cursor = 'grabbing';
                editor.style.userSelect = 'none';
                return;
            }

            // Clicked outside any shape → deselect (but preserve selection when interacting with shape/highlight pickers)
            if (activeShape && !shouldKeepShapeSelection(ev.target)) {
                // If clicking inside a table that IS the activeShape, deselect so user can type
                deselectShape();
            }
        }, true);

        document.addEventListener('pointermove', function(ev) {
            if (ev.pointerType === 'touch') return;
            if (!interaction) return;
            ev.preventDefault();
            var p = ppos(ev);
            var dx = p.x - interaction.startX;
            var dy = p.y - interaction.startY;

            if (interaction.mode === 'drag') {
                if (!interaction.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
                interaction.moved = true;
                interaction.el.style.marginLeft = (interaction.origLeft + dx) + 'px';
                interaction.el.style.marginTop = (interaction.origTop + dy) + 'px';
                interaction.el.style.marginRight = 'auto';
                positionHandles();
            } else if (interaction.mode === 'resize') {
                var d = interaction.dir;
                var nw = interaction.origW, nh = interaction.origH;
                var ml = interaction.origLeft, mt = interaction.origTop;

                if (d.includes('e')) nw = Math.max(20, interaction.origW + dx);
                if (d.includes('w')) { nw = Math.max(20, interaction.origW - dx); ml = interaction.origLeft + dx; }
                if (d.includes('s')) nh = Math.max(20, interaction.origH + dy);
                if (d.includes('n')) { nh = Math.max(20, interaction.origH - dy); mt = interaction.origTop + dy; }

                interaction.el.style.width = nw + 'px';
                interaction.el.style.height = nh + 'px';
                if (d.includes('w')) interaction.el.style.marginLeft = ml + 'px';
                if (d.includes('n')) interaction.el.style.marginTop = mt + 'px';
                positionHandles();
            }
        }, { passive: false });

        document.addEventListener('pointerup', function() {
            if (!interaction) return;
            if (interaction.mode === 'drag') {
                interaction.el.style.cursor = (interaction.el.tagName === 'TABLE') ? '' : 'grab';
            }
            editor.style.userSelect = '';
            if (typeof saveUndoState === 'function') saveUndoState();
            interaction = null;
            positionHandles();
            positionMobileActionBar();
        });

        // Keyboard shortcuts for selected inserted elements
        document.addEventListener('keydown', function(ev) {
            if (!activeShape) return;
            if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'c' || ev.key === 'C')) {
                ev.preventDefault();
                copiedShapeTemplate = activeShape.cloneNode(true);
                copiedShapeTemplate.style.outline = '';
                return;
            }
            if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'v' || ev.key === 'V')) {
                if (!copiedShapeTemplate) return;
                ev.preventDefault();
                var clone = copiedShapeTemplate.cloneNode(true);
                activeShape.parentNode.insertBefore(clone, activeShape.nextSibling);
                deselectShape();
                selectShape(clone);
                if (typeof saveUndoState === 'function') saveUndoState();
                return;
            }
            if (ev.key === 'Delete' || ev.key === 'Backspace') {
                ev.preventDefault();
                var toRemove = activeShape;
                deselectShape();
                toRemove.parentNode.removeChild(toRemove);
                if (typeof saveUndoState === 'function') saveUndoState();
            }
        });

        // Reposition handles on scroll/resize
        window.addEventListener('scroll', function() { if (activeShape) { positionHandles(); positionMobileActionBar(); } }, true);
        window.addEventListener('resize', function() { if (activeShape) { positionHandles(); positionMobileActionBar(); } });

        // Expose API for external code (e.g. color picker) to interact with active shape
        window._getActiveShape = function() { return activeShape; };
        window._changeActiveShapeColor = function(color) {
            if (!activeShape) return false;
            // Regular shapes: change border color
            if (activeShape.style.borderColor !== undefined) {
                activeShape.style.borderColor = color;
            }
            // SVG shapes (triangle): change stroke
            var svgEl = activeShape.querySelector('polygon, line, circle, rect, path');
            if (svgEl) svgEl.setAttribute('stroke', color);
            if (typeof saveUndoState === 'function') saveUndoState();
            return true;
        };

        // Touch support
        document.addEventListener('touchstart', function(ev) {
            var p = ppos(ev);
            var handleHit = findHandleAtPoint(p.x, p.y, 12);
            if (handleHit && activeShape) {
                ev.preventDefault();
                var sr = activeShape.getBoundingClientRect();
                interaction = {
                    mode: 'resize',
                    dir: handleHit.name,
                    el: activeShape,
                    startX: p.x, startY: p.y,
                    origLeft: parseFloat(activeShape.style.marginLeft) || 0,
                    origTop: parseFloat(activeShape.style.marginTop) || 0,
                    origW: sr.width, origH: sr.height
                };
                editor.style.userSelect = 'none';
                return;
            }

            var shape = isShapeEl(ev.target);
            if (!shape) {
                if (activeShape && !shouldKeepShapeSelection(ev.target)) {
                    deselectShape();
                }
                if (!editor.contains(ev.target)) return;
                if (window.innerWidth <= 900) {
                    var mobileTableSel = ev.target && ev.target.closest ? ev.target.closest('table') : null;
                    if (mobileTableSel && editor.contains(mobileTableSel)) {
                        shape = mobileTableSel;
                    }
                }
            }
            if (!shape) {
                // Check table border
                shape = isTableBorderClick(ev.target, p.x, p.y);
            }
            if (!shape) return;
            ev.preventDefault();
            selectShape(shape);
            interaction = {
                mode: 'drag', el: shape,
                startX: p.x, startY: p.y,
                origLeft: parseFloat(shape.style.marginLeft) || 0,
                origTop: parseFloat(shape.style.marginTop) || 0,
                moved: false
            };
            shape.style.cursor = (shape.tagName === 'TABLE') ? '' : 'grab';
            editor.style.userSelect = 'none';
        }, { passive: false });
        document.addEventListener('touchmove', function(ev) {
            if (!interaction) return;
            ev.preventDefault();
            var p = ppos(ev);
            var dx = p.x - interaction.startX;
            var dy = p.y - interaction.startY;
            if (interaction.mode === 'drag') {
                if (!interaction.moved && Math.abs(dx) < TOUCH_DRAG_THRESHOLD && Math.abs(dy) < TOUCH_DRAG_THRESHOLD) return;
                interaction.moved = true;
                if (interaction.el.tagName !== 'TABLE') interaction.el.style.cursor = 'grabbing';
                interaction.el.style.marginLeft = (interaction.origLeft + dx) + 'px';
                interaction.el.style.marginTop = (interaction.origTop + dy) + 'px';
                interaction.el.style.marginRight = 'auto';
                positionHandles();
            } else if (interaction.mode === 'resize') {
                var d = interaction.dir;
                var nw = interaction.origW, nh = interaction.origH;
                var ml = interaction.origLeft, mt = interaction.origTop;

                if (d.includes('e')) nw = Math.max(20, interaction.origW + dx);
                if (d.includes('w')) { nw = Math.max(20, interaction.origW - dx); ml = interaction.origLeft + dx; }
                if (d.includes('s')) nh = Math.max(20, interaction.origH + dy);
                if (d.includes('n')) { nh = Math.max(20, interaction.origH - dy); mt = interaction.origTop + dy; }

                interaction.el.style.width = nw + 'px';
                interaction.el.style.height = nh + 'px';
                if (d.includes('w')) interaction.el.style.marginLeft = ml + 'px';
                if (d.includes('n')) interaction.el.style.marginTop = mt + 'px';
                positionHandles();
            }
        }, { passive: false });
        document.addEventListener('touchend', function() {
            if (!interaction) return;
            if (interaction.mode === 'drag') {
                interaction.el.style.cursor = (interaction.el.tagName === 'TABLE') ? '' : 'grab';
            }
            editor.style.userSelect = '';
            if (typeof saveUndoState === 'function') saveUndoState();
            interaction = null;
            positionHandles();
            positionMobileActionBar();
        });
    })();

    const toggleFindReplace = $('toggleFindReplace');
    const findReplacePanel = $('findReplacePanel');
    const closeFindReplace = $('closeFindReplace');
    const findInput = $('findInput');
    const replaceInput = $('replaceInput');

    if (toggleFindReplace && findReplacePanel && findInput) {
        toggleFindReplace.addEventListener('click', () => {
            findReplacePanel.classList.toggle('active');
            if (findReplacePanel.classList.contains('active')) findInput.focus();
        });

        // Compatibilidad E2E: API global para abrir la barra Buscar/Reemplazar.
        window.openFindReplace = function () {
            if (!findReplacePanel.classList.contains('active')) {
                toggleFindReplace.click();
            }
            findInput.focus();
        };
    }

    if (closeFindReplace && findReplacePanel) {
        closeFindReplace.addEventListener('click', () => findReplacePanel.classList.remove('active'));
    }

    if (btnMatchCase) {
        btnMatchCase.addEventListener('click', () => {
            const active = btnMatchCase.getAttribute('aria-pressed') === 'true';
            btnMatchCase.setAttribute('aria-pressed', String(!active));
            btnMatchCase.classList.toggle('active', !active);
        });
    }

    if (btnWholeWord) {
        btnWholeWord.addEventListener('click', () => {
            const active = btnWholeWord.getAttribute('aria-pressed') === 'true';
            btnWholeWord.setAttribute('aria-pressed', String(!active));
            btnWholeWord.classList.toggle('active', !active);
        });
    }

    const findNextBtn = $('findNextBtn');
    if (findNextBtn && findInput && editor) {
        findNextBtn.addEventListener('click', () => {
            const text = findInput.value;
            if (!text) return;
            try {
                const regex = buildSearchRegex(text, false);
                if (regex.test(editor.innerText)) {
                    highlightText(text);
                } else if (typeof showToast === 'function') {
                    showToast('No encontrado', 'error');
                }
            } catch (_) {
                if (typeof showToast === 'function') showToast('Expresion invalida', 'error');
            }
        });
    }

    const replaceBtn = $('replaceBtn');
    if (replaceBtn && findInput && replaceInput && editor) {
        replaceBtn.addEventListener('click', () => {
            const find = findInput.value;
            const replace = replaceInput.value;
            if (!find) return;
            try {
                const regex = buildSearchRegex(find, false);
                if (typeof window.saveUndoState === 'function') window.saveUndoState();
                const count = replaceInTextNodes(editor, regex, replace);
                if (count > 0) {
                    if (typeof window.updateWordCount === 'function') window.updateWordCount();
                    if (typeof showToast === 'function') showToast('Reemplazado', 'success');
                } else if (typeof showToast === 'function') {
                    showToast('No encontrado', 'error');
                }
            } catch (_) {
                if (typeof showToast === 'function') showToast('Expresion invalida', 'error');
            }
        });
    }

    const replaceAllBtn = $('replaceAllBtn');
    if (replaceAllBtn && findInput && replaceInput && editor) {
        replaceAllBtn.addEventListener('click', () => {
            const find = findInput.value;
            const replace = replaceInput.value;
            if (!find) return;
            try {
                const regex = buildSearchRegex(find, true);
                if (typeof window.saveUndoState === 'function') window.saveUndoState();
                const count = replaceInTextNodes(editor, regex, replace);
                if (typeof window.updateWordCount === 'function') window.updateWordCount();
                if (typeof showToast === 'function') {
                    showToast(count > 0 ? `${count} reemplazado(s)` : 'No encontrado', count > 0 ? 'success' : 'error');
                }
            } catch (_) {
                if (typeof showToast === 'function') showToast('Expresion invalida', 'error');
            }
        });
    }
})();
