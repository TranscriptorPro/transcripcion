// ============ EDITOR: COPY + PRINT ============

(function initEditorCopyPrintUtils() {
    const editor = document.getElementById('editor');
    const copyBtn = document.getElementById('copyBtn');
    const printBtn = document.getElementById('printBtn');

    if (copyBtn && editor) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(editor.innerText);
                showToast('Copiado ✓', 'success');
            } catch (_) {
                showToast('Error al copiar', 'error');
            }
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (typeof openPrintPreview === 'function') {
                openPrintPreview();
            } else {
                window.print();
            }
        });
    }
})();
