// ============ EDITOR: CUSTOM DIALOGS ============

(function initEditorDialogUtils() {
    function ensureConfirmModal() {
        let overlay = document.getElementById('customConfirmModal');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'customConfirmModal';
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '10050';
        overlay.innerHTML = `
            <div class="modal" style="max-width:380px;">
                <div class="modal-header" style="padding:1rem 1.5rem 0.5rem;">
                    <h2 id="customConfirmTitle" style="font-size:1rem;">Confirmar</h2>
                </div>
                <div class="modal-body" style="padding:0.5rem 1.5rem 1rem;">
                    <p id="customConfirmMessage" style="font-size:0.9rem;color:var(--text-primary);line-height:1.5;white-space:pre-line;"></p>
                </div>
                <div class="modal-footer" style="padding:0.75rem 1.5rem;border-top:1px solid var(--border);display:flex;gap:0.5rem;justify-content:flex-end;">
                    <button class="btn btn-outline" id="customConfirmCancel">Cancelar</button>
                    <button class="btn btn-primary" id="customConfirmAccept">Aceptar</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        return overlay;
    }

    function ensurePromptModal() {
        let overlay = document.getElementById('customPromptModal');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'customPromptModal';
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '10050';
        overlay.innerHTML = `
            <div class="modal" style="max-width:400px;">
                <div class="modal-header" style="padding:1rem 1.5rem 0.5rem;">
                    <h2 id="customPromptTitle" style="font-size:1rem;">Ingrese un valor</h2>
                </div>
                <div class="modal-body" style="padding:0.5rem 1.5rem 1rem;">
                    <input type="text" id="customPromptInput" style="width:100%;padding:0.6rem 0.75rem;border:1px solid var(--border);border-radius:6px;font-size:0.9rem;background:var(--bg-card);color:var(--text-primary);outline:none;" />
                </div>
                <div class="modal-footer" style="padding:0.75rem 1.5rem;border-top:1px solid var(--border);display:flex;gap:0.5rem;justify-content:flex-end;">
                    <button class="btn btn-outline" id="customPromptCancel">Cancelar</button>
                    <button class="btn btn-primary" id="customPromptAccept">Aceptar</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        return overlay;
    }

    function showCustomConfirm(title, message, onAccept) {
        const overlay = ensureConfirmModal();
        const titleEl = document.getElementById('customConfirmTitle');
        const msgEl = document.getElementById('customConfirmMessage');
        const acceptBtn = document.getElementById('customConfirmAccept');
        const cancelBtn = document.getElementById('customConfirmCancel');

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
        const overlay = ensurePromptModal();
        const titleEl = document.getElementById('customPromptTitle');
        const input = document.getElementById('customPromptInput');
        const acceptBtn = document.getElementById('customPromptAccept');
        const cancelBtn = document.getElementById('customPromptCancel');

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
