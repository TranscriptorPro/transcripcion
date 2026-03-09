// ============ EDITOR: CUSTOM DIALOGS ============

(function initEditorDialogUtils() {
    function showCustomConfirm(title, message, onAccept) {
        const overlay = document.getElementById('customConfirmModal');
        const titleEl = document.getElementById('customConfirmTitle');
        const msgEl = document.getElementById('customConfirmMessage');
        const acceptBtn = document.getElementById('customConfirmAccept');
        const cancelBtn = document.getElementById('customConfirmCancel');

        if (!overlay) {
            if (onAccept) {
                if (window.confirm(message)) onAccept();
                return Promise.resolve(false);
            }
            return Promise.resolve(window.confirm(message));
        }

        titleEl.textContent = title;
        msgEl.textContent = message;
        overlay.classList.add('active');

        return new Promise(resolve => {
            function cleanup() {
                overlay.classList.remove('active');
                acceptBtn.removeEventListener('click', onYes);
                cancelBtn.removeEventListener('click', onNo);
                overlay.removeEventListener('click', onOverlay);
                document.removeEventListener('keydown', onKey);
            }
            function onYes() { cleanup(); if (onAccept) onAccept(); resolve(true); }
            function onNo() { cleanup(); resolve(false); }
            function onOverlay(e) { if (e.target === overlay) onNo(); }
            function onKey(e) { if (e.key === 'Escape') onNo(); }

            acceptBtn.addEventListener('click', onYes);
            cancelBtn.addEventListener('click', onNo);
            overlay.addEventListener('click', onOverlay);
            document.addEventListener('keydown', onKey);
            acceptBtn.focus();
        });
    }

    function showCustomPrompt(title, placeholder, defaultValue) {
        const overlay = document.getElementById('customPromptModal');
        const titleEl = document.getElementById('customPromptTitle');
        const input = document.getElementById('customPromptInput');
        const acceptBtn = document.getElementById('customPromptAccept');
        const cancelBtn = document.getElementById('customPromptCancel');

        if (!overlay) return Promise.resolve(window.prompt(title, defaultValue || ''));

        titleEl.textContent = title;
        input.placeholder = placeholder || '';
        input.value = defaultValue || '';
        overlay.classList.add('active');
        setTimeout(() => { input.focus(); input.select(); }, 50);

        return new Promise(resolve => {
            function cleanup() {
                overlay.classList.remove('active');
                acceptBtn.removeEventListener('click', onAccept);
                cancelBtn.removeEventListener('click', onCancel);
                overlay.removeEventListener('click', onOverlay);
                input.removeEventListener('keydown', onKey);
                document.removeEventListener('keydown', onEsc);
            }
            function onAccept() { const v = input.value.trim(); cleanup(); resolve(v || null); }
            function onCancel() { cleanup(); resolve(null); }
            function onOverlay(e) { if (e.target === overlay) onCancel(); }
            function onKey(e) { if (e.key === 'Enter') { e.preventDefault(); onAccept(); } }
            function onEsc(e) { if (e.key === 'Escape') onCancel(); }

            acceptBtn.addEventListener('click', onAccept);
            cancelBtn.addEventListener('click', onCancel);
            overlay.addEventListener('click', onOverlay);
            input.addEventListener('keydown', onKey);
            document.addEventListener('keydown', onEsc);
        });
    }

    window.showCustomConfirm = showCustomConfirm;
    window.showCustomPrompt = showCustomPrompt;
})();
