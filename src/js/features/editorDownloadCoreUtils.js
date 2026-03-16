// ============ EDITOR: DOWNLOAD CORE ============

(function initEditorDownloadCoreUtils() {
    const editor = document.getElementById('editor');
    let _pdfDownloadInProgress = false;

    function _setPdfPreloaderState(active) {
        const btnMain = document.getElementById('downloadBtnMain');
        const btnMore = document.getElementById('downloadBtn');
        const btnPreview = document.getElementById('btnDownloadFromPreview');
        const btnPreviewMore = document.getElementById('btnDownloadPreviewMore');

        [btnMain, btnMore, btnPreview, btnPreviewMore].forEach((btn) => {
            if (!btn) return;
            if (active) {
                if (!btn.dataset.prevLabel) btn.dataset.prevLabel = btn.textContent || '';
                btn.disabled = true;
                if (btn === btnMain || btn === btnPreview) btn.textContent = '⏳ Generando...';
            } else {
                btn.disabled = false;
                if ((btn === btnMain || btn === btnPreview) && btn.dataset.prevLabel) {
                    btn.textContent = btn.dataset.prevLabel;
                }
            }
        });
    }

    async function _createLocalPdfLink(pdfBlob, fileName, fileDate) {
        const blob = pdfBlob instanceof Blob ? pdfBlob : null;
        if (!blob) return null;
        let bytes;
        try {
            // Firefox puede invalidar blobs provenientes de renderers complejos.
            // Clonamos a bytes para reconstruir un Blob fresco al descargar.
            bytes = new Uint8Array(await blob.arrayBuffer());
        } catch (_) {
            return null;
        }
        return {
            source: 'pdf_blob',
            fileName: `${fileName}_${fileDate}.pdf`,
            pdfBytes: bytes
        };
    }

    async function _triggerReplicaDownload(linkInfo) {
        const fileName = String(linkInfo?.fileName || `informe_${new Date().toISOString().split('T')[0]}.pdf`);
        const bytes = linkInfo?.pdfBytes;
        if (!(bytes instanceof Uint8Array)) throw new Error('PDF bytes no disponibles');

        const freshBlob = new Blob([bytes], { type: 'application/pdf' });
        const saveHandler = (typeof window.saveToDisk === 'function') ? window.saveToDisk : saveToDisk;
        await saveHandler(freshBlob, fileName);
    }

    function _consumePendingPdfTab() {
        const tab = window._pendingPdfOpenTab || null;
        window._pendingPdfOpenTab = null;
        return (tab && !tab.closed) ? tab : null;
    }

    async function _openPdfBlobInNewTab(pdfBlob, filename, targetTab) {
        const blob = pdfBlob instanceof Blob ? pdfBlob : null;
        if (!blob) return false;

        const url = URL.createObjectURL(blob);
        const safeTab = (targetTab && !targetTab.closed) ? targetTab : null;
        try {
            if (safeTab) {
                safeTab.location.href = url;
                try { safeTab.focus(); } catch (_) { /* ignore */ }
            } else {
                const opened = window.open(url, '_blank');
                if (!opened) return false;
            }
            setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
            if (typeof showToast === 'function') showToast(`PDF abierto en nueva pestaña: ${filename}`, 'success');
            return true;
        } catch (_) {
            try {
                const opened = window.open(url, '_blank');
                if (!opened) return false;
                setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
                if (typeof showToast === 'function') showToast(`PDF abierto en nueva pestaña: ${filename}`, 'success');
                return true;
            } catch (err) {
                console.warn('No se pudo abrir la pestaña PDF:', err);
                return false;
            }
        }
    }

    function _ensurePdfReadyModal() {
        let overlay = document.getElementById('pdfReadyModalOverlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'pdfReadyModalOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:12000;display:none;align-items:center;justify-content:center;padding:16px;';

        const card = document.createElement('div');
        card.style.cssText = 'width:min(520px,96vw);background:#fff;border-radius:14px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;';

        const title = document.createElement('h3');
        title.textContent = 'PDF creado';
        title.style.cssText = 'margin:0 0 8px 0;font-size:1.2rem;line-height:1.2;color:#111827;';

        const body = document.createElement('p');
        body.id = 'pdfReadyModalMessage';
        body.textContent = 'Tu PDF ya esta listo para descargar.';
        body.style.cssText = 'margin:0 0 14px 0;color:#374151;line-height:1.5;';

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;';

        const btnDownload = document.createElement('button');
        btnDownload.id = 'pdfReadyDownloadBtn';
        btnDownload.type = 'button';
        btnDownload.textContent = 'Descargar PDF';
        btnDownload.style.cssText = 'border:1px solid transparent;background:#111827;color:#fff;padding:9px 14px;border-radius:8px;cursor:pointer;';

        actions.appendChild(btnDownload);
        card.appendChild(title);
        card.appendChild(body);
        card.appendChild(actions);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        return overlay;
    }

    function _showPdfReadyModal(linkInfo) {
        const overlay = _ensurePdfReadyModal();
        if (!overlay) {
            if (typeof showToast === 'function') showToast('PDF creado. Listo para descargar.', 'success', 8000);
            return;
        }

        const downloadBtn = overlay.querySelector('#pdfReadyDownloadBtn');
        const msg = overlay.querySelector('#pdfReadyModalMessage');

        if (msg) {
            msg.textContent = 'El PDF fue creado correctamente. Presiona Descargar PDF para guardarlo.';
        }

        if (downloadBtn) {
            downloadBtn.onclick = async () => {
                downloadBtn.disabled = true;
                const prev = downloadBtn.textContent;
                downloadBtn.textContent = 'Descargando...';
                try {
                    await _triggerReplicaDownload(linkInfo);
                    overlay.style.display = 'none';
                    document.body.style.overflow = '';
                } catch (err) {
                    if (typeof showToast === 'function') showToast('No se pudo descargar el PDF. Reintenta.', 'error');
                    console.warn('Error descargando PDF desde modal:', err);
                } finally {
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = prev;
                }
            };
        }

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function _notifyReplicaReady(linkInfo) {
        _showPdfReadyModal(linkInfo);
    }

    async function _ensureJsPdfReady(timeoutMs = 2600) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (window.jspdf?.jsPDF) return true;
            await new Promise((r) => setTimeout(r, 120));
        }
        return !!window.jspdf?.jsPDF;
    }

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
        const hasJsPdf = await _ensureJsPdfReady();
        if (!hasJsPdf) return null;
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

            // Expandir altura del sandbox al contenido real para evitar cortes artificiales.
            const fullHeight = Math.max(
                viewportH,
                (sdoc.documentElement?.scrollHeight || 0) + 16,
                (sdoc.body?.scrollHeight || 0) + 16
            );
            sandbox.style.height = `${fullHeight}px`;

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

            // Ruta 1 (preferida): captura visual fiel y paginado por imagen.
            if (typeof window.html2canvas === 'function') {
                const doc = new jsPDF({ unit: 'mm', format: pageFormat, orientation });
                const target = sdoc.body;
                const fullCanvas = await window.html2canvas(target, {
                    scale: 1.6,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    width: viewportW,
                    windowWidth: viewportW,
                    scrollX: 0,
                    scrollY: 0
                });

                // Calcular altura de recorte usando scrollHeight del DOM del iframe.
                // NUNCA usar getImageData() — lanza DOMException/SecurityError en canvas
                // tainted por imágenes con CORS (logo, firma, QR) y rompe toda la generación.
                let trimmedHeight = fullCanvas.height;
                try {
                    const contentDomH = Math.max(
                        sdoc.documentElement?.scrollHeight || 0,
                        sdoc.body?.scrollHeight || 0
                    );
                    if (contentDomH > 50 && fullHeight > 0) {
                        // Escalar de px DOM a px canvas (html2canvas scale=1.6 → ratio≈1.6)
                        const domToCanvas = fullCanvas.height / fullHeight;
                        // 40px de margen DOM para no cortar sombras/bordes
                        const candidateH = Math.min(
                            fullCanvas.height,
                            Math.ceil((contentDomH + 40) * domToCanvas)
                        );
                        // Solo recortar si el resultado es sensato (>=15% y <97%)
                        if (candidateH >= fullCanvas.height * 0.15 && candidateH < fullCanvas.height * 0.97) {
                            trimmedHeight = candidateH;
                        }
                    }
                } catch (trimErr) {
                    // No debería fallar, pero si algo va mal usamos el canvas completo.
                    trimmedHeight = fullCanvas.height;
                }

                const pagePxHeight = Math.max(1, Math.floor((fullCanvas.width * pageHmm) / pageWmm));
                let offsetY = 0;
                let pageIndex = 0;

                while (offsetY < trimmedHeight) {
                    const sliceH = Math.min(pagePxHeight, trimmedHeight - offsetY);
                    const pageCanvas = document.createElement('canvas');
                    pageCanvas.width = fullCanvas.width;
                    pageCanvas.height = sliceH;
                    const ctx = pageCanvas.getContext('2d');
                    if (!ctx) throw new Error('CANVAS_CONTEXT_UNAVAILABLE');

                    ctx.drawImage(
                        fullCanvas,
                        0,
                        offsetY,
                        fullCanvas.width,
                        sliceH,
                        0,
                        0,
                        fullCanvas.width,
                        sliceH
                    );

                    if (pageIndex > 0) doc.addPage();

                    const renderHmm = (sliceH * pageWmm) / fullCanvas.width;
                    const imgData = pageCanvas.toDataURL('image/jpeg', 0.94);
                    doc.addImage(imgData, 'JPEG', 0, 0, pageWmm, renderHmm, undefined, 'FAST');

                    offsetY += sliceH;
                    pageIndex += 1;
                }

                return doc.output('blob');
            }

            // Ruta 2 (fallback): renderer HTML interno de jsPDF.
            const doc = new jsPDF({ unit: 'mm', format: pageFormat, orientation });
            const renderPromise = doc.html(sdoc.body, {
                x: 0,
                y: 0,
                margin: [0, 0, 0, 0],
                autoPaging: 'text',
                width: pageWmm,
                windowWidth: viewportW,
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                }
            });

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('PDF_RENDER_TIMEOUT')), 12000);
            });

            await Promise.race([renderPromise, timeoutPromise]);
            return doc.output('blob');
        } catch (err) {
            console.warn('Error en _buildPdfBlobFromHtml:', err);
            return null;
        } finally {
            if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        }
    }

    async function downloadFile(format) {
        if (!editor) return;

        if (format === 'pdf' && _pdfDownloadInProgress) {
            if (typeof showToast === 'function') showToast('⏳ Generando PDF, por favor espera...', 'info');
            return;
        }

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
        _cfgDirty |= _syncCheck('showStudyTime', 'reqShowStudyTime', true);
        _cfgDirty |= _syncCheck('showQR', 'pdfShowQR', false);
        _cfgDirty |= _syncCheck('showReportNumber', 'pdfShowReportNumber', true);
        _cfgDirty |= _syncCheck('showInstLogo', 'pdfShowInstLogo', true);
        _cfgDirty |= _syncCheck('showProfLogo', 'pdfShowProfLogo', true);
        _cfgDirty |= _syncCheck('showSignLine', 'pdfShowSignLine', true);
        _cfgDirty |= _syncCheck('showSignName', 'pdfShowSignName', true);
        _cfgDirty |= _syncCheck('showSignMatricula', 'pdfShowSignMatricula', true);
        _cfgDirty |= _syncCheck('showSignImage', 'pdfShowSignImage', true);

        if (pdfConfig.showStudyTime === false && pdfConfig.studyTime) {
            delete pdfConfig.studyTime;
            _cfgDirty = true;
        }

        if (!pdfConfig.studyDate) {
            pdfConfig.studyDate = new Date().toISOString().split('T')[0];
            _cfgDirty = true;
        }

        if (_cfgDirty) {
            window._pdfConfigCache = pdfConfig;
            try {
                if (typeof appDB !== 'undefined') await appDB.set('pdf_config', pdfConfig);
                else localStorage.setItem('pdf_config', JSON.stringify(pdfConfig));
            } catch (cfgErr) {
                // No interrumpir la descarga si falla el guardado en DB.
                try { localStorage.setItem('pdf_config', JSON.stringify(pdfConfig)); } catch (_) { /* ignore */ }
                console.warn('No se pudo persistir pdf_config antes de descargar:', cfgErr);
            }
        }

        const resolvedCtx = (typeof window.resolveReportContext === 'function')
            ? await window.resolveReportContext({ includeEditorExtract: true, includeFormFallback: true, editorEl: editor })
            : null;

        const _isProLike = window.currentMode === 'pro'
            || !['NORMAL', 'TRIAL'].includes((window.CLIENT_CONFIG?.type || 'NORMAL').toUpperCase());
        const _hasPatient = !!(String((resolvedCtx && resolvedCtx.patientName) || pdfConfig.patientName || '').trim());

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

        if (format === 'pdf') {
            _pdfDownloadInProgress = true;
            try {
                await _doDownload(format, text);
            } finally {
                _pdfDownloadInProgress = false;
            }
            return;
        }

        await _doDownload(format, text);
    }

    async function _doDownload(format, text) {
        const editor = document.getElementById('editor');
        if (!editor) return;

        const safeTranscriptions = typeof transcriptions !== 'undefined' ? transcriptions : [];
        const safeActiveIndex = typeof activeTabIndex !== 'undefined' ? activeTabIndex : 0;

        // Nombre inteligente: Estudio_Apellido_DD-MM-YY (fecha del estudio cuando exista)
        const _cfg = (typeof window.currentPdfConfig !== 'undefined' && window.currentPdfConfig) ? window.currentPdfConfig : {};
        const _resolvedCtx = (typeof window.resolveReportContext === 'function')
            ? await window.resolveReportContext({ includeEditorExtract: true, includeFormFallback: true, editorEl: editor })
            : null;
        const _safePart = (s) => String(s || '').trim().replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_') || '';
        const _normalizeStudyForFile = (s) => {
            let t = String(s || '').trim().replace(/^INFORME\s+DE\s+/i, '');
            if (!t) return '';
            const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñÜü]/g, '');
            const isMostlyUpper = !!letters && letters === letters.toUpperCase();
            const hasWeirdMixedCase = /[a-záéíóúñü][A-ZÁÉÍÓÚÑÜ]/.test(t);
            if (isMostlyUpper || hasWeirdMixedCase) {
                t = t.toLowerCase().replace(/(^|\s)([a-záéíóúñü])/g, (m, pre, c) => pre + c.toUpperCase());
            }
            return t;
        };

        const _studyPart = _safePart(_normalizeStudyForFile((_resolvedCtx && _resolvedCtx.studyType) || _cfg.studyType || ''));

        const _patientRaw = String((_resolvedCtx && _resolvedCtx.patientName) || _cfg.patientName || '').trim();
        const _patientClean = _patientRaw.replace(/\s+/g, ' ').trim();
        let _patientPart = '';
        if (_patientClean) {
            if (_patientClean.includes(',')) {
                const parts = _patientClean.split(',').map(p => p.trim()).filter(Boolean);
                const last = _safePart(parts[0] || '');
                const first = _safePart(parts.slice(1).join(' ') || '');
                _patientPart = [last, first].filter(Boolean).join('-');
            } else {
                const tokens = _patientClean.split(' ').filter(Boolean);
                if (tokens.length >= 2) {
                    const last = _safePart(tokens[tokens.length - 1]);
                    const first = _safePart(tokens.slice(0, -1).join(' '));
                    _patientPart = [last, first].filter(Boolean).join('-');
                } else {
                    _patientPart = _safePart(tokens[0] || '');
                }
            }
        }

        const _studyDateIso = String((_resolvedCtx && _resolvedCtx.studyDate) || _cfg.studyDate || '').trim();
        const _isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(_studyDateIso);
        const _baseDate = _isIsoDate ? new Date(_studyDateIso + 'T12:00:00') : new Date();
        const _dd = String(_baseDate.getDate()).padStart(2, '0');
        const _mm = String(_baseDate.getMonth() + 1).padStart(2, '0');
        const _yy = String(_baseDate.getFullYear()).slice(2);

        const _smartBase = [_studyPart, _patientPart].filter(Boolean).join('_');
        const fileName = _smartBase || (safeTranscriptions[safeActiveIndex]?.fileName || 'informe').replace(/\.[^/.]+$/, '');
        const date = _baseDate.toLocaleDateString('es-ES');
        const fileDate = `${_dd}-${_mm}-${_yy}`;

        if (format === 'pdf') {
            _setPdfPreloaderState(true);
            try {
                const pendingPdfTab = _consumePendingPdfTab();
                const targetPdfFileName = `${fileName}_${fileDate}.pdf`;

                // Desde el botón principal: NO abrir vista previa.
                // Generar el blob y abrirlo en una pestaña nueva para que el navegador gestione el guardado.
                if (pendingPdfTab) {
                    if (typeof showToast === 'function') showToast('⏳ Generando PDF...', 'info', 3500);
                    let pdfBlob = null;
                    if (typeof window._buildPdfBlobFromPreviewCapture === 'function') {
                        try {
                            pdfBlob = await window._buildPdfBlobFromPreviewCapture({ silentOpen: true });
                        } catch (previewErr) {
                            console.warn('Ruta exacta silenciosa del PDF falló, usando fallback HTML:', previewErr);
                        }
                    }
                    if (!pdfBlob) {
                        const htmlDoc = (typeof createHTML === 'function') ? await createHTML() : null;
                        if (!htmlDoc) {
                            try { pendingPdfTab.close(); } catch (_) { /* ignore */ }
                            if (typeof showToast === 'function') showToast('No se pudo preparar el PDF del informe', 'error');
                            return;
                        }
                        pdfBlob = await _buildPdfBlobFromHtml(htmlDoc);
                    }
                    if (!pdfBlob) {
                        try { pendingPdfTab.close(); } catch (_) { /* ignore */ }
                        if (typeof showToast === 'function') showToast('No se pudo generar el PDF. Reintentá.', 'error');
                        return;
                    }
                    const opened = await _openPdfBlobInNewTab(pdfBlob, targetPdfFileName, pendingPdfTab);
                    if (!opened) {
                        try { pendingPdfTab.close(); } catch (_) { /* ignore */ }
                        if (typeof showToast === 'function') showToast('El navegador bloqueó la pestaña del PDF. Permití popups e intentá de nuevo.', 'error');
                    }
                    return;
                }

                // Captura exacta de la vista previa — idéntico visual garantizado
                if (typeof window.downloadPDFFromCanvas === 'function') {
                    await window.downloadPDFFromCanvas(fileName, fileDate);
                    return;
                }
                // Fallback: pipeline jsPDF original
                if (typeof showToast === 'function') showToast('⏳ Generando PDF...', 'info', 3500);
                const htmlDoc = (typeof createHTML === 'function') ? await createHTML() : null;
                if (!htmlDoc) {
                    if (typeof showToast === 'function') showToast('No se pudo preparar el PDF del informe', 'error');
                    return;
                }
                const pdfBlob = await _buildPdfBlobFromHtml(htmlDoc);
                if (!pdfBlob) {
                    if (typeof window.downloadPDFWrapper === 'function') {
                        try {
                            await window.downloadPDFWrapper(editor.innerHTML, fileName, date, fileDate);
                            return;
                        } catch (err) {
                            console.warn('Fallback downloadPDFWrapper fallo:', err);
                        }
                    }
                    if (typeof showToast === 'function') showToast('No se pudo generar el PDF. Reintenta.', 'error');
                    return;
                }
                const linkInfo = await _createLocalPdfLink(pdfBlob, fileName, fileDate);
                if (!linkInfo) {
                    if (typeof showToast === 'function') showToast('No se pudo preparar la descarga del PDF', 'error');
                    return;
                }
                _notifyReplicaReady(linkInfo);
                return;
            } finally {
                _setPdfPreloaderState(false);
            }
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

            case 'html': blob = new Blob([await createHTML()], { type: 'text/html;charset=utf-8' }); ext = 'html'; break;
            default: break;
        }

        if (blob) {
            const saveHandler = (typeof window.saveToDisk === 'function') ? window.saveToDisk : saveToDisk;
            const saved = await saveHandler(blob, `${fileName}_${fileDate}.${ext}`);
            if (saved) showToast(`Descargado .${ext}`, 'success');
        }
    }

    async function saveToDisk(blob, filename) {
        if (window.showSaveFilePicker) {
            const ext = filename.split('.').pop().toLowerCase();
            const mimeTypes = {
                pdf: 'application/pdf',
                rtf: 'application/rtf',

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
                return true;
            } catch (err) {
                if (err.name === 'AbortError') return false;
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
        return true;
    }

    window.downloadFile = downloadFile;
    window.saveToDisk = saveToDisk;
    window.downloadRTF = () => downloadFile('rtf');
    window.downloadHTML = () => downloadFile('html');
    window.downloadPDF = () => downloadFile('pdf');
    // Expuesto para que pdfPreviewActions pueda generar el PDF de email
    // usando exactamente el mismo pipeline que el botón de descarga.
    window._buildPdfBlobForEmail = _buildPdfBlobFromHtml;
})();
