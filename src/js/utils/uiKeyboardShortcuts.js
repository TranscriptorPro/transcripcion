// ============ UI KEYBOARD SHORTCUTS ============
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+R: Re-estructurar con IA
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        const states = ['TRANSCRIBED', 'STRUCTURED', 'PREVIEWED'];
        if (states.includes(window.appState) && typeof autoStructure === 'function') {
            autoStructure({ silent: false });
        }
        return;
    }

    // Ctrl+Shift+S: Guardar configuracion de impresion
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (typeof savePdfConfiguration === 'function') {
            savePdfConfiguration();
            if (typeof showToast === 'function') showToast('✅ Configuración guardada', 'success');
        }
        return;
    }

    // Ctrl+Shift+P: Previsualizar PDF
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        const states = ['TRANSCRIBED', 'STRUCTURED', 'PREVIEWED'];
        if (states.includes(window.appState) && typeof openPrintPreview === 'function') {
            openPrintPreview();
        }
        return;
    }

    // RB-7: Ctrl+Enter - Estructurar con IA
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (window.appState === 'TRANSCRIBED' && typeof autoStructure === 'function') {
            autoStructure({ silent: false });
        }
        return;
    }

    // Ctrl+Shift+D: Descargar formato favorito
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const states = ['TRANSCRIBED', 'STRUCTURED', 'PREVIEWED'];
        if (states.includes(window.appState) && typeof window.downloadFile === 'function') {
            const fav = window._prefFmtCache || localStorage.getItem('preferred_download_format') || 'pdf';
            if (window.downloadPDF && fav === 'pdf') window.downloadPDF();
            else if (window.downloadRTF && fav === 'rtf') window.downloadRTF();
            else if (window.downloadTXT && fav === 'txt') window.downloadTXT();
            else if (window.downloadHTML && fav === 'html') window.downloadHTML();
        }
        return;
    }
});

window.initShortcuts = function () {
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                document.getElementById('toggleFindReplace')?.click();
            }
        }
    });
};

window.initEscapeModalShortcut = function () {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
            document.querySelectorAll('.modal-overlay').forEach(m => {
                if (m.style.display === 'flex' || m.style.display === 'block') {
                    m.style.display = 'none';
                }
            });
        }
    });
};
