// ============ EDITOR: FORMATTING + FIND/REPLACE ============

(function initEditorFormattingFindUtils() {
    const editor = document.getElementById('editor');
    const $ = id => document.getElementById(id);

    function executeFormatAndFocus(cmd) {
        document.execCommand(cmd, false, null);
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
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedContent = range.extractContents();
            const span = document.createElement('span');
            const anchorEl = selection.anchorNode?.parentElement || editor;
            const currentSize = parseInt(window.getComputedStyle(anchorEl).fontSize, 10) || parseInt(window.getComputedStyle(editor).fontSize, 10);
            const newSize = increase ? currentSize + 2 : Math.max(10, currentSize - 2);
            span.style.fontSize = newSize + 'px';
            span.appendChild(selectedContent);
            range.insertNode(span);
            editor.focus();
        }
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
        });
    }

    const clearFormatBtn = $('clearFormatBtn');
    if (clearFormatBtn && editor) {
        clearFormatBtn.addEventListener('click', () => {
            document.execCommand('removeFormat', false, null);
            editor.focus();
        });
    }

    const insertLinkBtn = $('insertLinkBtn');
    if (insertLinkBtn && editor) {
        insertLinkBtn.addEventListener('click', async () => {
            const url = await window.showCustomPrompt('Ingrese la URL:', 'https://ejemplo.com');
            if (url) {
                document.execCommand('createLink', false, url);
                editor.focus();
            }
        });
    }

    const insertTableBtn = $('insertTableBtn');
    if (insertTableBtn && editor) {
        insertTableBtn.addEventListener('click', async () => {
            const rows = await window.showCustomPrompt('Numero de filas:', '', '3');
            if (!rows) return;
            const cols = await window.showCustomPrompt('Numero de columnas:', '', '3');
            if (rows && cols) {
                let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 1rem 0;">';
                for (let i = 0; i < parseInt(rows, 10); i++) {
                    tableHTML += '<tr>';
                    for (let j = 0; j < parseInt(cols, 10); j++) {
                        tableHTML += '<td style="border: 1px solid var(--border, #ddd); padding: 8px;">&nbsp;</td>';
                    }
                    tableHTML += '</tr>';
                }
                tableHTML += '</table>';
                document.execCommand('insertHTML', false, tableHTML);
                editor.focus();
            }
        });
    }

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
