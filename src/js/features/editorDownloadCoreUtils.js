// ============ EDITOR: DOWNLOAD CORE ============

(function initEditorDownloadCoreUtils() {
    const editor = document.getElementById('editor');

    async function downloadFile(format) {
        if (!editor) return;

        const _clone = editor.cloneNode(true);
        _clone.querySelectorAll('.patient-data-header, .patient-placeholder-banner, .btn-append-inline, .original-text-banner, .no-print, .ai-note-panel, .no-data-edit-btn, .no-data-field, #aiNotePanel').forEach(el => el.remove());
        const rawText = _clone.innerText || '';
        const text = rawText.replace(/\n{3,}/g, '\n\n').trim();
        if (!text) return showToast('No hay texto para descargar', 'error');

        if (typeof validateBeforeDownload === 'function' && !validateBeforeDownload(format)) return;

        const pdfConfig = window._pdfConfigCache
            || (typeof appDB !== 'undefined' ? await appDB.get('pdf_config') : null)
            || JSON.parse(localStorage.getItem('pdf_config') || '{}');

        const _vf = (id) => document.getElementById(id)?.value?.trim() || '';
        const _syncField = (cfgKey, ...ids) => {
            if (!pdfConfig[cfgKey]) {
                const v = ids.reduce((acc, id) => acc || _vf(id), '');
                if (v) { pdfConfig[cfgKey] = v; return true; }
            }
            return false;
        };

        let _cfgDirty = false;
        _cfgDirty |= _syncField('patientName', 'reqPatientName', 'pdfPatientName');
        _cfgDirty |= _syncField('patientDni', 'reqPatientDni', 'pdfPatientDni');
        _cfgDirty |= _syncField('patientAge', 'reqPatientAge', 'pdfPatientAge');
        _cfgDirty |= _syncField('patientSex', 'reqPatientSex', 'pdfPatientSex');
        _cfgDirty |= _syncField('patientInsurance', 'reqPatientInsurance', 'pdfPatientInsurance');
        _cfgDirty |= _syncField('patientAffiliateNum', 'reqPatientAffiliateNum', 'pdfPatientAffiliateNum');

        if (_cfgDirty) {
            window._pdfConfigCache = pdfConfig;
            if (typeof appDB !== 'undefined') await appDB.set('pdf_config', pdfConfig);
            else localStorage.setItem('pdf_config', JSON.stringify(pdfConfig));
        }

        const _isProLike = window.currentMode === 'pro'
            || !['NORMAL', 'TRIAL'].includes((window.CLIENT_CONFIG?.type || 'NORMAL').toUpperCase());
        const _hasPatient = !!(pdfConfig.patientName);

        if (!_hasPatient && !_isProLike) {
            return new Promise(resolve => {
                const overlay = document.getElementById('customConfirmModal');
                if (!overlay) { _doDownload(format, text).then(() => resolve(true)); return; }
                const titleEl = document.getElementById('customConfirmTitle');
                const msgEl = document.getElementById('customConfirmMessage');
                const acceptBtn = document.getElementById('customConfirmAccept');
                const cancelBtn = document.getElementById('customConfirmCancel');
                if (titleEl) titleEl.textContent = '⚠️ Sin datos del paciente';
                if (msgEl) msgEl.textContent = 'El informe no tiene datos del paciente. ¿Desea descargarlo así?';
                overlay.classList.add('active');
                const cleanup = () => {
                    overlay.classList.remove('active');
                    acceptBtn?.removeEventListener('click', onYes);
                    cancelBtn?.removeEventListener('click', onNo);
                    overlay.removeEventListener('click', onBg);
                };
                const onYes = () => { cleanup(); _doDownload(format, text).then(() => resolve(true)); };
                const onNo = () => { cleanup(); if (typeof window.openPatientDataModal === 'function') window.openPatientDataModal(); resolve(false); };
                const onBg = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
                acceptBtn?.addEventListener('click', onYes);
                cancelBtn?.addEventListener('click', onNo);
                overlay.addEventListener('click', onBg);
            });
        }

        await _doDownload(format, text);
    }

    async function _doDownload(format, text) {
        const editor = document.getElementById('editor');
        if (!editor) return;

        const safeTranscriptions = typeof transcriptions !== 'undefined' ? transcriptions : [];
        const safeActiveIndex = typeof activeTabIndex !== 'undefined' ? activeTabIndex : 0;

        const fileName = (safeTranscriptions[safeActiveIndex]?.fileName || 'informe').replace(/\.[^/.]+$/, '');
        const date = new Date().toLocaleDateString('es-ES');
        const fileDate = new Date().toISOString().split('T')[0];

        if (format === 'pdf') {
            const htmlDoc = (typeof createHTML === 'function') ? await createHTML() : null;
            if (!htmlDoc) {
                if (typeof downloadPDFWrapper !== 'undefined') {
                    const htmlContent = editor.innerHTML || text;
                    await downloadPDFWrapper(htmlContent, fileName, date, fileDate);
                    return;
                }
                if (typeof showToast === 'function') showToast('No se pudo generar PDF', 'error');
                return;
            }

            const printWin = window.open('', '_blank');
            if (!printWin) {
                if (typeof showToast === 'function') {
                    showToast('El navegador bloqueo la ventana de impresion. Permiti popups para exportar PDF exacto.', 'error');
                }
                return;
            }

            printWin.document.open();
            printWin.document.write(htmlDoc);
            printWin.document.close();

            setTimeout(() => {
                try {
                    printWin.focus();
                    printWin.print();
                } catch (_) {}
            }, 300);

            if (typeof showToast === 'function') {
                showToast('Vista de impresion exacta abierta. Elegi "Guardar como PDF".', 'info');
            }
            return;
        }

        let blob;
        let ext;
        switch (format) {
            case 'rtf': {
                const rtfContent = (typeof createRTF === 'function') ? await createRTF(text, date) : text;
                blob = new Blob([rtfContent], { type: 'application/rtf' });
                ext = 'rtf';
                break;
            }
            case 'txt': {
                const txtContent = (typeof createTXT === 'function') ? await createTXT(text) : `INFORME MEDICO\nFecha: ${date}\n\n${text}`;
                blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
                ext = 'txt';
                break;
            }
            case 'html': blob = new Blob([await createHTML()], { type: 'text/html;charset=utf-8' }); ext = 'html'; break;
            default: break;
        }

        if (blob) {
            const saveHandler = (typeof window.saveToDisk === 'function') ? window.saveToDisk : saveToDisk;
            await saveHandler(blob, `${fileName}_${fileDate}.${ext}`);
            showToast(`Descargado .${ext}`, 'success');
        }
    }

    async function saveToDisk(blob, filename) {
        if (window.showSaveFilePicker) {
            const ext = filename.split('.').pop().toLowerCase();
            const mimeTypes = {
                pdf: 'application/pdf',
                rtf: 'application/rtf',
                txt: 'text/plain',
                html: 'text/html'
            };
            const types = [{
                description: ext.toUpperCase() + ' file',
                accept: { [mimeTypes[ext] || blob.type || 'application/octet-stream']: ['.' + ext] }
            }];
            try {
                const handle = await window.showSaveFilePicker({ suggestedName: filename, types });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.warn('showSaveFilePicker fallo, usando fallback:', err);
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    window.downloadFile = downloadFile;
    window.saveToDisk = saveToDisk;
    window.downloadRTF = () => downloadFile('rtf');
    window.downloadTXT = () => downloadFile('txt');
    window.downloadHTML = () => downloadFile('html');
    window.downloadPDF = () => downloadFile('pdf');
})();
