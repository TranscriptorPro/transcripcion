// ============ UI COMPARISON VIEW UTILS ============

window.initComparisonViewHandlers = function (options) {
    const opts = options || {};
    const btnRestoreOriginal = opts.btnRestoreOriginal || document.getElementById('btnRestoreOriginal');

    const btnCompareView = document.getElementById('btnCompareView');
    const comparisonContainer = document.getElementById('comparisonContainer');
    const editorForCompare = document.getElementById('editor');

    window._isComparisonMode = false;

    function enterComparisonMode() {
        if (!window._lastRawTranscription || !window._lastStructuredHTML) {
            if (typeof showToast === 'function') showToast('Se necesita texto original y estructurado para comparar', 'error');
            return;
        }

        // Save current structured state if editor has been edited (without inline UI elements).
        if (editorForCompare) {
            const clone = editorForCompare.cloneNode(true);
            clone.querySelectorAll('.btn-append-inline, .patient-data-header, .patient-placeholder-banner, .original-text-banner').forEach(el => el.remove());
            window._lastStructuredHTML = clone.innerHTML;
        }

        // Populate panels.
        const compOriginal = document.getElementById('comparisonOriginal');
        const compStructured = document.getElementById('comparisonStructured');
        if (compOriginal) {
            compOriginal.innerHTML = window._lastRawTranscription
                .split('\n').filter(l => l.trim())
                .map(l => `<p style="margin:0.4em 0;">${l}</p>`).join('');
        }
        if (compStructured) {
            compStructured.innerHTML = window._lastStructuredHTML;
            compStructured.querySelectorAll('.btn-append-inline').forEach(el => el.remove());
        }

        // Insert patient header into both comparison panels.
        const cfg = window._pdfConfigCache || JSON.parse(localStorage.getItem('pdf_config') || '{}');
        if (cfg.patientName) {
            const lines = [];
            if (cfg.patientName) lines.push(`<strong>Paciente:</strong> ${cfg.patientName}`);
            if (cfg.patientDni) lines.push(`<strong>DNI:</strong> ${cfg.patientDni}`);
            if (cfg.patientAge) lines.push(`<strong>Edad:</strong> ${cfg.patientAge} anos`);
            if (cfg.patientSex) lines.push(`<strong>Sexo:</strong> ${cfg.patientSex}`);
            if (cfg.patientInsurance) lines.push(`<strong>Obra Social:</strong> ${cfg.patientInsurance}`);
            if (cfg.patientAffiliateNum) lines.push(`<strong>N Afiliado:</strong> ${cfg.patientAffiliateNum}`);
            const headerHTML = `<div class="patient-data-header" contenteditable="false"><div class="patient-data-content">${lines.join(' &nbsp;·&nbsp; ')}</div></div>`;
            if (compOriginal) compOriginal.insertAdjacentHTML('afterbegin', headerHTML);
            if (compStructured) compStructured.insertAdjacentHTML('afterbegin', headerHTML);
        }

        if (editorForCompare) editorForCompare.style.display = 'none';
        if (comparisonContainer) comparisonContainer.style.display = 'flex';

        if (btnCompareView) {
            btnCompareView.innerHTML = '✕ Cerrar';
            btnCompareView.classList.add('toggle-active');
        }

        const mainCopy = document.getElementById('copyBtn');
        const mainPrint = document.getElementById('printBtn');
        if (mainCopy) { mainCopy.disabled = true; mainCopy.title = 'Usa los botones de cada panel en modo comparacion'; }
        if (mainPrint) { mainPrint.disabled = true; mainPrint.title = 'Usa los botones de cada panel en modo comparacion'; }

        if (btnRestoreOriginal) btnRestoreOriginal.style.display = 'none';

        window._isComparisonMode = true;
    }

    function exitComparisonMode() {
        if (editorForCompare) editorForCompare.style.display = '';
        if (comparisonContainer) comparisonContainer.style.display = 'none';

        if (btnCompareView) {
            btnCompareView.innerHTML = '⧉ Comparar';
            btnCompareView.classList.remove('toggle-active');
        }

        const mainCopy = document.getElementById('copyBtn');
        const mainPrint = document.getElementById('printBtn');
        if (mainCopy) { mainCopy.disabled = false; mainCopy.title = 'Copiar todo'; }
        if (mainPrint) { mainPrint.disabled = false; mainPrint.title = 'Imprimir'; }

        if (btnRestoreOriginal) btnRestoreOriginal.style.display = '';

        window._isComparisonMode = false;
    }

    if (btnCompareView) {
        btnCompareView.addEventListener('click', () => {
            if (window._isComparisonMode) {
                exitComparisonMode();
            } else {
                if (btnRestoreOriginal && btnRestoreOriginal._showingOriginal) {
                    btnRestoreOriginal.click();
                }
                enterComparisonMode();
            }
        });
    }

    document.getElementById('btnCopyOriginal')?.addEventListener('click', () => {
        if (!window._lastRawTranscription) return;
        navigator.clipboard.writeText(window._lastRawTranscription).then(() => {
            if (typeof showToast === 'function') showToast('Texto original copiado', 'success');
        }).catch(() => {
            if (typeof showToast === 'function') showToast('No se pudo copiar al portapapeles', 'error');
        });
    });

    document.getElementById('btnCopyStructured')?.addEventListener('click', () => {
        const compStructured = document.getElementById('comparisonStructured');
        const text = compStructured ? compStructured.innerText : '';
        if (!text.trim()) return;
        navigator.clipboard.writeText(text).then(() => {
            if (typeof showToast === 'function') showToast('Texto estructurado copiado', 'success');
        }).catch(() => {
            if (typeof showToast === 'function') showToast('No se pudo copiar al portapapeles', 'error');
        });
    });

    function printPanelContent(htmlContent, title) {
        const printWin = window.open('', '_blank', 'width=800,height=600');
        if (!printWin) {
            if (typeof showToast === 'function') showToast('No se pudo abrir ventana de impresion', 'error');
            return;
        }
        printWin.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
            <style>body{font-family:Georgia,serif;line-height:1.7;padding:2rem;color:#1a1a1a;max-width:800px;margin:0 auto;}
            h1,h2,h3{color:#0f766e;}p{margin:0.5em 0;}.no-data-field{color:#888;font-style:italic;}</style>
            </head><body>${htmlContent}</body></html>`);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => { printWin.print(); printWin.close(); }, 300);
    }

    document.getElementById('btnPrintOriginal')?.addEventListener('click', () => {
        if (!window._lastRawTranscription) return;
        const html = window._lastRawTranscription
            .split('\n').filter(l => l.trim())
            .map(l => `<p>${l}</p>`).join('');
        printPanelContent(html, 'Texto Original');
    });

    document.getElementById('btnPrintStructured')?.addEventListener('click', () => {
        const compStructured = document.getElementById('comparisonStructured');
        if (!compStructured || !compStructured.innerHTML.trim()) return;
        const clone = compStructured.cloneNode(true);
        clone.querySelectorAll('.inline-review-btn, .no-print, .ai-note-panel').forEach(el => el.remove());
        printPanelContent(clone.innerHTML, 'Informe Estructurado');
    });

    window.exitComparisonMode = exitComparisonMode;
};
