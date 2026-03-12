// ============ EDITOR: DOWNLOAD CORE ============

(function initEditorDownloadCoreUtils() {
    const editor = document.getElementById('editor');

    async function _getPdfConfigSafe() {
        try {
            if (window._pdfConfigCache && typeof window._pdfConfigCache === 'object') {
                return { ...window._pdfConfigCache };
            }
            if (typeof appDB !== 'undefined' && appDB && typeof appDB.get === 'function') {
                const fromDb = await appDB.get('pdf_config');
                if (fromDb && typeof fromDb === 'object') return { ...fromDb };
            }
            return JSON.parse(localStorage.getItem('pdf_config') || '{}') || {};
        } catch (_) {
            return {};
        }
    }

    async function _buildPdfBlobFromHtml(htmlDoc) {
        if (typeof window.jspdf === 'undefined' || !window.jspdf?.jsPDF) return null;
        if (!htmlDoc) return null;

        const pdfConfig = await _getPdfConfigSafe();
        const pageFormat = String(pdfConfig.pageSize || 'a4').toLowerCase();
        const orientation = String(pdfConfig.orientation || 'portrait').toLowerCase();
        const fmtSizes = {
            a4: { w: 210, h: 297 },
            letter: { w: 215.9, h: 279.4 },
            legal: { w: 215.9, h: 355.6 }
        };
        const sz = fmtSizes[pageFormat] || fmtSizes.a4;
        const pageWmm = orientation === 'landscape' ? sz.h : sz.w;
        const pageHmm = orientation === 'landscape' ? sz.w : sz.h;
        const pxPerMm = 96 / 25.4;
        const viewportW = Math.round(pageWmm * pxPerMm);
        const viewportH = Math.round(pageHmm * pxPerMm);

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `position:fixed;left:-99999px;top:0;width:${viewportW}px;background:#fff;z-index:-1;`;

        const sandbox = document.createElement('iframe');
        sandbox.style.cssText = `width:${viewportW}px;height:${viewportH}px;border:0;background:#fff;`;
        wrapper.appendChild(sandbox);
        document.body.appendChild(wrapper);

        try {
            await new Promise((resolve) => {
                sandbox.onload = () => resolve(true);
                sandbox.srcdoc = htmlDoc;
            });

            const sdoc = sandbox.contentDocument;
            if (!sdoc || !sdoc.body) return null;

            // Esperar fuentes e imagenes para capturar un layout igual al preview.
            try {
                if (sdoc.fonts && typeof sdoc.fonts.ready?.then === 'function') {
                    await sdoc.fonts.ready;
                }
            } catch (_) { /* ignore */ }
            const images = Array.from(sdoc.images || []);
            await Promise.all(images.map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                });
            }));
            await new Promise(r => setTimeout(r, 180));

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: pageFormat, orientation });

            await doc.html(sdoc.body, {
                x: 0,
                y: 0,
                margin: [0, 0, 0, 0],
                autoPaging: 'slice',
                width: pageWmm,
                windowWidth: viewportW,
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                }
            });

            return doc.output('blob');
        } catch (_) {
            return null;
        } finally {
            if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        }
    }

    async function downloadFile(format) {
        if (!editor) return;

        const _clone = editor.cloneNode(true);
        _clone.querySelectorAll('.patient-data-header, .patient-placeholder-banner, .btn-append-inline, .original-text-banner, .no-print, .ai-note-panel, .no-data-edit-btn, .inline-review-btn, #aiNotePanel').forEach(el => el.remove());
        // Replace badge spans with text marker for content check (don't remove entirely)
        _clone.querySelectorAll('.no-data-field').forEach(el => el.replaceWith('[No especificado]'));
        const rawText = _clone.innerText || '';
        const text = rawText.trimEnd();
        if (!String(text).trim()) return showToast('No hay texto para descargar', 'error');

        if (typeof validateBeforeDownload === 'function' && !validateBeforeDownload(format)) return;

        const pdfConfig = await _getPdfConfigSafe();

        const _vf = (id) => document.getElementById(id)?.value?.trim() || '';
        const _fieldEl = (id) => document.getElementById(id);
        const _syncText = (cfgKey, ...ids) => {
            const hasAnyInput = ids.some(id => !!_fieldEl(id));
            if (!hasAnyInput) return false;
            const v = ids.reduce((acc, id) => acc || _vf(id), '');
            const before = String(pdfConfig[cfgKey] || '');
            if (v) {
                if (before !== v) {
                    pdfConfig[cfgKey] = v;
                    return true;
                }
                return false;
            }
            if (before) {
                delete pdfConfig[cfgKey];
                return true;
            }
            return false;
        };
        const _syncSelect = (cfgKey, id, fallback) => {
            const el = _fieldEl(id);
            if (!el) return false;
            const v = String(el.value || fallback || '').trim();
            if (!v) return false;
            if (String(pdfConfig[cfgKey] || '') !== v) {
                pdfConfig[cfgKey] = v;
                return true;
            }
            return false;
        };
        const _syncCheck = (cfgKey, id, fallback = true) => {
            const el = _fieldEl(id);
            if (!el) return false;
            const v = !!el.checked;
            const curr = (pdfConfig[cfgKey] === undefined || pdfConfig[cfgKey] === null)
                ? !!fallback
                : !!pdfConfig[cfgKey];
            if (curr !== v) {
                pdfConfig[cfgKey] = v;
                return true;
            }
            return false;
        };

        const _syncField = (cfgKey, ...ids) => {
            return _syncText(cfgKey, ...ids);
        };

        let _cfgDirty = false;
        _cfgDirty |= _syncField('patientName', 'reqPatientName', 'pdfPatientName');
        _cfgDirty |= _syncField('patientDni', 'reqPatientDni', 'pdfPatientDni');
        _cfgDirty |= _syncField('patientAge', 'reqPatientAge', 'pdfPatientAge');
        _cfgDirty |= _syncField('patientSex', 'reqPatientSex', 'pdfPatientSex');
        _cfgDirty |= _syncField('patientInsurance', 'reqPatientInsurance', 'pdfPatientInsurance');
        _cfgDirty |= _syncField('patientAffiliateNum', 'reqPatientAffiliateNum', 'pdfPatientAffiliateNum');
        _cfgDirty |= _syncField('studyDate', 'reqStudyDate', 'pdfStudyDate');
        _cfgDirty |= _syncField('studyTime', 'reqStudyTime', 'pdfStudyTime');
        _cfgDirty |= _syncField('referringDoctor', 'reqReferringDoctor', 'pdfReferringDoctor');
        _cfgDirty |= _syncField('studyReason', 'reqStudyReason', 'pdfStudyReason');
        _cfgDirty |= _syncField('studyType', 'reqStudyType', 'pdfStudyType');
        _cfgDirty |= _syncSelect('pageSize', 'pdfPageSize', 'a4');
        _cfgDirty |= _syncSelect('orientation', 'pdfOrientation', 'portrait');
        _cfgDirty |= _syncSelect('margins', 'pdfMargins', 'normal');
        _cfgDirty |= _syncSelect('font', 'pdfFont', 'helvetica');
        _cfgDirty |= _syncSelect('fontSize', 'pdfFontSize', '11');
        _cfgDirty |= _syncSelect('lineSpacing', 'pdfLineSpacing', '1.15');
        _cfgDirty |= _syncCheck('showHeader', 'pdfShowHeader', true);
        _cfgDirty |= _syncCheck('hideReportHeader', 'pdfHideReportHeader', false);
        _cfgDirty |= _syncCheck('showFooter', 'pdfShowFooter', true);
        _cfgDirty |= _syncCheck('showPageNum', 'pdfShowPageNum', true);
        _cfgDirty |= _syncCheck('showDate', 'pdfShowDate', true);
        _cfgDirty |= _syncCheck('showStudyDate', 'reqShowStudyDate', true);
        _cfgDirty |= _syncCheck('showQR', 'pdfShowQR', true);
        _cfgDirty |= _syncCheck('showReportNumber', 'pdfShowReportNumber', true);
        _cfgDirty |= _syncCheck('showInstLogo', 'pdfShowInstLogo', true);
        _cfgDirty |= _syncCheck('showProfLogo', 'pdfShowProfLogo', true);
        _cfgDirty |= _syncCheck('showSignLine', 'pdfShowSignLine', true);
        _cfgDirty |= _syncCheck('showSignName', 'pdfShowSignName', true);
        _cfgDirty |= _syncCheck('showSignMatricula', 'pdfShowSignMatricula', true);
        _cfgDirty |= _syncCheck('showSignImage', 'pdfShowSignImage', true);

        if (!pdfConfig.studyDate) {
            pdfConfig.studyDate = new Date().toISOString().split('T')[0];
            _cfgDirty = true;
        }

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
            if (htmlDoc) {
                const pdfBlob = await _buildPdfBlobFromHtml(htmlDoc);
                if (pdfBlob) {
                    const saveHandler = (typeof window.saveToDisk === 'function') ? window.saveToDisk : saveToDisk;
                    await saveHandler(pdfBlob, `${fileName}_${fileDate}.pdf`);
                    if (typeof showToast === 'function') showToast('PDF descargado', 'success');
                    return;
                }
            }

            // Fallback robusto: generador PDF clásico si falla el render fiel HTML->blob.
            if (typeof window.downloadPDFWrapper === 'function') {
                try {
                    await window.downloadPDFWrapper(editor.innerHTML, fileName, date, fileDate);
                    if (typeof showToast === 'function') showToast('PDF descargado', 'success');
                    return;
                } catch (err) {
                    console.warn('Fallback downloadPDFWrapper fallo:', err);
                }
            }

            if (typeof showToast === 'function') {
                showToast('No se pudo generar PDF fiel desde la vista previa. Reintentá en unos segundos.', 'error');
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
