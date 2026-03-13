function _hexToRgb(hex) {
    if (!hex || !hex.startsWith('#')) return { r: 26, g: 86, b: 160 };
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16)
    };
}
async function downloadPDFWrapper(htmlContent, fileName, fecha, fileDate) {
    if (typeof jspdf === 'undefined') {
        showToast('Cargando motor PDF...', 'info');
        await new Promise(r => setTimeout(r, 600));
    }
    try {
        const { jsPDF } = window.jspdf;
        const profData  = (typeof safeJSONParse === 'function') ? await safeJSONParse('prof_data', {}) : (await appDB.get('prof_data')) || {};
        const config    = (typeof safeJSONParse === 'function') ? await safeJSONParse('pdf_config', {}) : (await appDB.get('pdf_config')) || {};
        const pgSize = (config.pageSize || 'a4').toLowerCase();
        const orient = (config.orientation || 'portrait').toLowerCase();
        const doc = new jsPDF({ unit: 'mm', format: pgSize, orientation: orient });
        const PAGE_W = doc.internal.pageSize.getWidth();
        const PAGE_H = doc.internal.pageSize.getHeight();
        const marginMap = { narrow: 10, normal: 20, wide: 30 };
        const ML       = marginMap[config.margins] || 20;
        const MR       = marginMap[config.margins] || 20;
        const MT       = marginMap[config.margins] || 20; // margen superior
        const CW       = PAGE_W - ML - MR;
        const FOOTER_Y = PAGE_H - 12;
        const mainFont     = config.font || 'helvetica';
        const mainFontSize = parseInt(config.fontSize) || 10;
        const mainLineH    = mainFontSize * 0.5;
        const _edForCtx = typeof window !== 'undefined' ? (window.editor || document.getElementById('editor')) : null;
        const resolvedCtx = (typeof window.resolveReportContext === 'function')
            ? await window.resolveReportContext({ includeEditorExtract: true, includeFormFallback: true, editorEl: _edForCtx })
            : null;
        const clientType = String(window.CLIENT_CONFIG?.type || '').toUpperCase();
        const planCode = String(window.CLIENT_CONFIG?.planCode || '').toUpperCase();
        const isClinicProfile = clientType === 'CLINIC' || planCode === 'CLINIC';
        const activePro = (resolvedCtx && resolvedCtx.activeProfessional) || config.activeProfessional || null;
        const cfgHideReportHeader = resolvedCtx
            ? !!resolvedCtx.hideReportHeader
            : (!isClinicProfile && config.hideReportHeader === true);
        const cfgShowHeader  = !cfgHideReportHeader && config.showHeader !== false;
        const cfgShowFooter  = config.showFooter  !== false;
        const cfgShowPageNum = config.showPageNum !== false;
        const cfgShowDate    = resolvedCtx
            ? !!resolvedCtx.showDateInFooter
            : ((config.showDate ?? true) === true);
        const cfgShowReportNumber = config.showReportNumber !== false;
        const wpProfiles = (await appDB.get('workplace_profiles')) || [];
        const wpIdx = config.activeWorkplaceIndex;
        const activeWp = (resolvedCtx && resolvedCtx.activeWorkplace)
            || ((wpIdx !== undefined && wpIdx !== null) ? wpProfiles[Number(wpIdx)] : wpProfiles[0]);
        const wpLogo = activeWp?.logo || '';
        const instLogoB64 = (wpLogo && wpLogo.startsWith('data:'))
            ? wpLogo : ((await appDB.get('pdf_logo')) || '');
        let profLogoB64 = (activePro?.logo && activePro.logo.startsWith('data:'))
            ? activePro.logo : '';
        let sigB64  = (activePro?.firma && activePro.firma.startsWith('data:'))
            ? activePro.firma : ((await appDB.get('pdf_signature')) || '');
        const isPro = typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.hasProMode;
        if (typeof CLIENT_CONFIG !== 'undefined' && !isPro) {
            profLogoB64 = '';
            sigB64 = '';
        }
        const logoB64 = instLogoB64 || profLogoB64;
        const profName     = activePro?.nombre         || profData.nombre      || '';
        const matriculaRaw = activePro?.matricula      || profData.matricula   || '';
        const matricula    = (typeof window.normalizeMatriculaDisplay === 'function')
            ? window.normalizeMatriculaDisplay(matriculaRaw)
            : matriculaRaw;
        const rawEsp       = activePro?.especialidades || profData.specialties || profData.especialidades || '';
        const especialidad = Array.isArray(rawEsp)
            ? rawEsp.filter(e => e && e !== 'Todas').join(' / ')
            : (rawEsp || '');
        const profDisplayObj = (typeof window.getProfessionalDisplay === 'function')
            ? window.getProfessionalDisplay(profName, activePro?.sexo || profData.sexo || '')
            : { fullName: (String(profName || '').trim() || 'Profesional') };
        const profDisplayName = String(profDisplayObj.fullName || '').trim() || 'Profesional';
        const specialtyBadges = (Array.isArray(rawEsp) ? rawEsp : String(rawEsp || '').split(/[\/,]/))
            .map(s => String(s || '').trim())
            .filter(Boolean)
            .filter(s => !/^all$/i.test(s) && !/^todas$/i.test(s))
            .map(s => /^general$/i.test(s) ? 'Medicina General' : s);
        const institutionName = activePro?.institutionName || profData.institutionName || '';
        const accent       = _hexToRgb(activePro?.headerColor || profData.headerColor || '#1a56a0');
        const wpAddress = config.workplaceAddress || activeWp?.address || '';
        const wpPhone   = config.workplacePhone   || activeWp?.phone   || '';
        const wpName    = activeWp?.name || '';
        const wpEmail   = activeWp?.email || config.workplaceEmail || '';
        const showPhone = (activePro?.showPhone ?? config.showPhone ?? true) !== false;
        const showEmail = (activePro?.showEmail ?? config.showEmail ?? true) !== false;
        const showSocial = (activePro?.showSocial ?? config.showSocial ?? false) === true;
        const sm = (activePro?.socialMedia && typeof activePro.socialMedia === 'object')
            ? activePro.socialMedia
            : ((profData?.socialMedia && typeof profData.socialMedia === 'object') ? profData.socialMedia : {});
        const profPhone = activePro?.telefono || profData.telefono || '';
        const profEmail = activePro?.email || profData.email || '';
        const profWhatsapp = activePro?.whatsapp || profData.whatsapp || sm.whatsapp || sm.WhatsApp || '';
        const profInstagram = activePro?.instagram || profData.instagram || sm.instagram || sm.Instagram || '';
        const profFacebook = activePro?.facebook || profData.facebook || sm.facebook || sm.Facebook || '';
        const profX = activePro?.x || profData.x || sm.x || sm.X || sm.twitter || sm.Twitter || '';
        const profYoutube = activePro?.youtube || profData.youtube || sm.youtube || sm.YouTube || '';
        const _reqVal = (id) => { try { return document.getElementById(id)?.value?.trim() || ''; } catch(_) { return ''; } };
        const _edEl = typeof window !== 'undefined' ? (window.editor || document.getElementById('editor')) : null;
        const _extracted = (_edEl && typeof extractPatientDataFromText === 'function')
            ? extractPatientDataFromText(_edEl.innerText) : {};
        const _formP = {
            name:      _reqVal('reqPatientName')      || _reqVal('pdfPatientName'),
            dni:       _reqVal('reqPatientDni')        || _reqVal('pdfPatientDni'),
            age:       _reqVal('reqPatientAge')        || _reqVal('pdfPatientAge'),
            sex:       _reqVal('reqPatientSex')        || _reqVal('pdfPatientSex'),
            insurance: _reqVal('reqPatientInsurance')  || _reqVal('pdfPatientInsurance'),
            affiliate: _reqVal('reqPatientAffiliateNum') || _reqVal('pdfPatientAffiliateNum'),
        };
        const pName      = (resolvedCtx && resolvedCtx.patientName) || _extracted.name || config.patientName || _formP.name || '';
        const pDni       = (resolvedCtx && resolvedCtx.patientDni)  || _extracted.dni  || config.patientDni  || _formP.dni  || '';
        const _rawAge    = (resolvedCtx && resolvedCtx.patientAge)  || _extracted.age  || config.patientAge  || _formP.age  || '';
        const pAge       = _rawAge ? `${_rawAge} años` : '';
        const _rawSex    = (resolvedCtx && resolvedCtx.patientSex) || _extracted.sex || config.patientSex || _formP.sex || '';
        const pSex       = _rawSex === 'M' ? 'Masculino' : _rawSex === 'F' ? 'Femenino' : _rawSex;
        const pInsurance = (resolvedCtx && resolvedCtx.patientInsurance) || config.patientInsurance || _formP.insurance || '';
        const pAffiliateNum = (resolvedCtx && resolvedCtx.patientAffiliateNum) || config.patientAffiliateNum || _formP.affiliate || '';
        const showStudyDate = resolvedCtx ? !!resolvedCtx.showStudyDate : ((config.showStudyDate ?? true) !== false);
        const pDate      = showStudyDate
            ? ((resolvedCtx && resolvedCtx.studyDateDisplay)
                || (config.studyDate
                    ? new Date(config.studyDate + 'T12:00').toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})
                    : ''))
            : '';
        const showStudyTime = resolvedCtx ? !!resolvedCtx.showStudyTime : ((config.showStudyTime ?? true) !== false);
        const studyTime   = showStudyTime
            ? ((resolvedCtx && resolvedCtx.studyTime) || _reqVal('pdfStudyTime') || _reqVal('reqStudyTime') || config.studyTime || '')
            : '';
        const tplKey      = (typeof window !== 'undefined' && window.selectedTemplate) || config.selectedTemplate || '';
        const tplNameFb   = (tplKey && typeof MEDICAL_TEMPLATES !== 'undefined' && MEDICAL_TEMPLATES[tplKey]?.name) || '';
        const studyType   = (resolvedCtx && resolvedCtx.studyType) || config.studyType || tplNameFb || '';
        const reportNum   = (resolvedCtx && resolvedCtx.reportNum) || _reqVal('pdfReportNumber') || config.reportNum || '';
        const _rawRefDoctor = String((resolvedCtx && resolvedCtx.referringDoctorRaw) || config.referringDoctor || _reqVal('reqReferringDoctor') || _reqVal('pdfReferringDoctor') || '')
            .replace(/^\s*(?:dr\.?|dra\.?)\s+/i, '')
            .trim();
        const refDoctor   = (resolvedCtx && resolvedCtx.referringDoctorDisplay)
            ? resolvedCtx.referringDoctorDisplay
            : (_rawRefDoctor ? ('Dr./a ' + _rawRefDoctor) : '');
        const studyReason = (resolvedCtx && resolvedCtx.studyReason) || config.studyReason || '';
        const footerText  = (resolvedCtx && resolvedCtx.footerText) || config.footerText || '';
        const showSignLine = config.showSignLine !== false;
        const showSignName = config.showSignName !== false;
        const showSignMat  = config.showSignMatricula !== false;
        const showInstLogo = (config.showInstLogo ?? true) === true;
        const showProfLogo = (config.showProfLogo ?? true) === true;
        let cy      = 10;
        let pageNum = 1;
        let headerH = 10;  // se actualiza tras dibujar el encabezado
        const setAccent  = () => doc.setTextColor(accent.r, accent.g, accent.b);
        const setBlack   = () => doc.setTextColor(0, 0, 0);
        const setGray    = v  => doc.setTextColor(v, v, v);
        const accentLine = (y, full = true) => {
            doc.setDrawColor(accent.r, accent.g, accent.b);
            doc.setLineWidth(0.5);
            doc.line(ML, y, full ? PAGE_W - MR : ML + 60, y);
            doc.setDrawColor(0);
        };
        const grayLine = y => {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(ML, y, PAGE_W - MR, y);
            doc.setDrawColor(0);
        };
        const truncateForWidth = (text, maxWidth) => {
            const s = String(text || '').trim();
            if (!s || maxWidth <= 0) return '';
            const lines = doc.splitTextToSize(s, maxWidth);
            if (!lines || !lines.length) return '';
            if (lines.length === 1) return lines[0];
            let out = String(lines[0] || '');
            while (out.length > 1 && doc.getTextWidth(out + '...') > maxWidth) {
                out = out.slice(0, -1);
            }
            return out + '...';
        };
        function ensureSpace(needed) {
            if (cy + needed > FOOTER_Y - 10) {
                doc.addPage();
                pageNum++;
                if (cfgShowFooter || cfgShowPageNum) drawFooter(pageNum);
                drawWorkplaceBanner();  // solo banner del lugar se repite
            }
        }
        function drawFooter(num) {
            if (!cfgShowFooter && !cfgShowPageNum) return;
            doc.setDrawColor(204, 204, 204);
            doc.setLineWidth(0.4);
            doc.line(ML, FOOTER_Y - 5, PAGE_W - MR, FOOTER_Y - 5);
            doc.setDrawColor(0);
            doc.setFontSize(7.5);
            doc.setFont(mainFont, 'normal');
            setGray(136); // #888
            const leftParts = [];
            if (cfgShowFooter && footerText) leftParts.push(footerText);
            if (cfgShowDate) leftParts.push(`Impreso: ${new Date().toLocaleDateString('es-ES')}`);
            const rightText = cfgShowPageNum ? `Página ${num}` : '';
            const rightW = rightText ? doc.getTextWidth(rightText) : 0;
            const leftMaxW = Math.max(20, (PAGE_W - MR) - ML - rightW - 6);
            if (leftParts.length) {
                doc.text(truncateForWidth(leftParts.join('  '), leftMaxW), ML, FOOTER_Y);
            }
            if (rightText) {
                doc.text(rightText, PAGE_W - MR, FOOTER_Y, { align: 'right' });
            }
            setBlack();
        }
        function drawWorkplaceBanner() {
            if (!cfgShowHeader) { cy = 10; return; }
            const hasWpData = wpName || wpAddress || wpPhone || wpEmail;
            if (!hasWpData && !(showInstLogo && instLogoB64)) { cy = 10; return; }
            const bannerH = 16;
            doc.setFillColor(accent.r, accent.g, accent.b);
            doc.rect(0, 0, PAGE_W, bannerH, 'F');
            let contentX = ML;
            if (instLogoB64) {
                if (showInstLogo) {
                    try {
                        const instSizePx = parseInt(config.instLogoSizePx || localStorage.getItem('inst_logo_size_px') || '60');
                        const instScale = instSizePx / 60;
                        const imgW = Math.round(12 * instScale), imgH = Math.round(10 * instScale);
                        const imgType = instLogoB64.includes('data:image/png') ? 'PNG' : 'JPEG';
                        const b64data = instLogoB64.includes(',') ? instLogoB64.split(',')[1] : instLogoB64;
                        doc.addImage(b64data, imgType, ML, (bannerH - imgH) / 2, imgW, imgH);
                        contentX = ML + imgW + 4;
                    } catch (e) { /* imagen inválida */ }
                }
            }
            doc.setTextColor(255, 255, 255);
            const wpDetails = [wpAddress, wpPhone ? 'Tel: ' + wpPhone : '', wpEmail].filter(Boolean);
            const detailsStr = wpDetails.join(' • ');
            doc.setFontSize(8);
            doc.setFont(mainFont, 'normal');
            const detailsW = wpDetails.length ? doc.getTextWidth(detailsStr) : 0;
            const textCenterX = contentX + detailsW / 2;
            if (wpName) {
                doc.setFontSize(11);
                doc.setFont(mainFont, 'bold');
                const nameW = doc.getTextWidth(wpName.toUpperCase());
                const nameX = detailsW > 0 ? (textCenterX - nameW / 2) : contentX;
                doc.text(wpName.toUpperCase(), Math.max(contentX, nameX), 7);
            }
            if (wpDetails.length) {
                doc.setFontSize(8);
                doc.setFont(mainFont, 'normal');
                doc.text(detailsStr, contentX, 12);
            }
            setBlack();
            cy = bannerH + 4;
        }
        function drawHeader() {
            if (!cfgShowHeader) { headerH = cy; return; }
            let infoX = ML;
            const contactItems = [];
            if (showPhone && profPhone) contactItems.push(`Tel: ${profPhone}`);
            if (showEmail && profEmail) contactItems.push(profEmail);
            if (showSocial && profWhatsapp) contactItems.push(`WhatsApp: ${profWhatsapp}`);
            if (showSocial && profInstagram) contactItems.push(`Instagram: ${profInstagram}`);
            if (showSocial && profFacebook) contactItems.push(`Facebook: ${profFacebook}`);
            if (showSocial && profX) contactItems.push(`X: ${profX}`);
            if (showSocial && profYoutube) contactItems.push(`YouTube: ${profYoutube}`);
            const contactColW = contactItems.length ? 54 : 0;
            const infoRightLimit = contactItems.length ? (PAGE_W - MR - contactColW - 3) : (PAGE_W - MR);
            if (showProfLogo) {
                if (profLogoB64 && profLogoB64 !== instLogoB64) {
                    try {
                        const profSizePx = parseInt(localStorage.getItem('prof_logo_size_px') || '60');
                        const profScale = profSizePx / 60;
                        const profImgW = Math.round(16 * profScale), profImgH = Math.round(16 * profScale);
                        const profImgType = profLogoB64.includes('data:image/png') ? 'PNG' : 'JPEG';
                        const profB64data = profLogoB64.includes(',') ? profLogoB64.split(',')[1] : profLogoB64;
                        doc.addImage(profB64data, profImgType, ML, cy, profImgW, profImgH);
                        infoX = ML + profImgW + 6;
                    } catch (e) { /* imagen inválida */ }
                }
            }
            let iy = cy + 5;
            if (profDisplayName) {
                doc.setFontSize(14);
                doc.setFont(mainFont, 'bold');
                setAccent();
                const nameLines = doc.splitTextToSize('Estudio realizado por: ' + profDisplayName, Math.max(25, infoRightLimit - infoX));
                doc.text(nameLines, infoX, iy);
                iy += (nameLines.length * 5.2);
            }
            if (matricula) {
                doc.setFontSize(10);
                doc.setFont(mainFont, 'italic');
                setGray(68); // #444
                doc.text('Mat. ' + matricula, infoX, iy);
                iy += 4.5;
            }
            if (specialtyBadges.length) {
                let bx = infoX;
                let by = iy;
                const badgeH = 5;
                const maxX = infoRightLimit;
                doc.setFont(mainFont, 'normal');
                doc.setFontSize(8.2);
                for (const badgeRaw of specialtyBadges) {
                    const txt = String(badgeRaw || '').trim();
                    if (!txt) continue;
                    const txtW = doc.getTextWidth(txt);
                    const badgeW = Math.min(45, txtW + 4.2);
                    if (bx + badgeW > maxX) {
                        bx = infoX;
                        by += badgeH + 1.6;
                    }
                    doc.setFillColor(241, 245, 249);
                    doc.setDrawColor(203, 213, 225);
                    doc.setLineWidth(0.2);
                    doc.roundedRect(bx, by - 3.4, badgeW, badgeH, 1.6, 1.6, 'FD');
                    setGray(55);
                    doc.text(truncateForWidth(txt, badgeW - 2.2), bx + 1.1, by);
                    bx += badgeW + 1.8;
                }
                iy = by + badgeH + 1.2;
            }
            if (institutionName) {
                doc.setFontSize(9.5);
                doc.setFont(mainFont, 'italic');
                setGray(51); // #333
                const instLines = doc.splitTextToSize(institutionName, Math.max(25, infoRightLimit - infoX));
                doc.text(instLines, infoX, iy);
                iy += 4;
            }
            let contactEndY = cy + 2;
            if (contactItems.length) {
                const cx = PAGE_W - MR - contactColW;
                let cY = cy + 4;
                doc.setFontSize(8);
                doc.setFont(mainFont, 'normal');
                setGray(68);
                for (const item of contactItems.slice(0, 7)) {
                    const line = truncateForWidth(item, contactColW);
                    doc.text(line, cx, cY);
                    cY += 3.8;
                }
                contactEndY = cY;
            }
            cy = Math.max(iy, profLogoB64 ? cy + 20 : iy, contactEndY) + 3;
            doc.setDrawColor(accent.r, accent.g, accent.b);
            doc.setLineWidth(0.6);
            doc.line(ML, cy, PAGE_W - MR, cy);
            doc.setDrawColor(0);
            cy += 5;
            headerH = cy;
            setBlack();
        }
        function drawStudyInfo() {
            const api = window.PdfMakerSectionUtils;
            if (api && typeof api.drawStudyInfoSection === 'function') {
                const ensureSpaceAt = (cyIn, needed) => { cy = cyIn; ensureSpace(needed); return cy; };
                cy = api.drawStudyInfoSection({ studyType, reportNum, showReportNumber: cfgShowReportNumber, pDate, studyTime, refDoctor, studyReason, CW, ML, cyStart: cy, doc, accent, ensureSpace: ensureSpaceAt, setBlack });
            }
        }
        function drawPatientBlock() {
            const api = window.PdfMakerSectionUtils;
            if (api && typeof api.drawPatientBlockSection === 'function') {
                const ensureSpaceAt = (cyIn, needed) => { cy = cyIn; ensureSpace(needed); return cy; };
                cy = api.drawPatientBlockSection({ pName, pSex, pDni, pInsurance, pAge, pAffiliateNum, ML, CW, accent, doc, ensureSpace: ensureSpaceAt, setBlack, cyStart: cy });
            }
        }
        function renderNode(node) {
            if (!node) return;
            if (node.nodeType === Node.TEXT_NODE) return; // bloques de texto sueltos los ignora
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            const tag = node.tagName.toLowerCase();
            if (['script', 'style', 'button', 'input', 'select', 'textarea'].includes(tag)) return;
            if (node.classList.contains('no-print')                  ) return;
            if (node.classList.contains('ai-note-panel')             ) return;
            if (node.classList.contains('no-data-edit-btn')          ) return;
            if (node.classList.contains('inline-review-btn')         ) return;
            if (node.classList.contains('patient-data-header')       ) return;
            if (node.classList.contains('patient-placeholder-banner')) return;
            if (node.classList.contains('btn-append-inline')         ) return;
            if (node.classList.contains('original-text-banner')      ) return;
            if (node.classList.contains('no-data-field')             ) return;
            if (node.id === 'aiNotePanel'                            ) return;
            if (tag === 'h1') {
                const txt = node.textContent.trim();
                if (!txt) return;
                ensureSpace(35);
                cy += 6;
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text(txt.toUpperCase(), PAGE_W / 2, cy, { align: 'center' });
                cy += 2;
                doc.setDrawColor(accent.r, accent.g, accent.b);
                doc.setLineWidth(0.6);
                doc.line(ML, cy, PAGE_W - MR, cy);
                doc.setDrawColor(0);
                cy += 6;
                setBlack();
                return;
            }
            if (tag === 'h2') {
                const txt = node.textContent.trim();
                if (!txt) return;
                ensureSpace(30);
                cy += 5;
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text(txt.toUpperCase(), ML, cy);
                cy += 2;
                doc.setDrawColor(accent.r, accent.g, accent.b);
                doc.setLineWidth(0.25);
                doc.line(ML, cy, PAGE_W - MR, cy);
                doc.setDrawColor(0);
                cy += 5;
                setBlack();
                return;
            }
            if (tag === 'h3') {
                const txt = node.textContent.trim();
                if (!txt) return;
                ensureSpace(25);
                cy += 4;
                doc.setFontSize(10.5);
                doc.setFont('helvetica', 'bolditalic');
                setGray(51); // #333
                doc.text(txt, ML, cy);
                cy += 5;
                setBlack();
                return;
            }
            if (tag === 'hr') {
                ensureSpace(6);
                cy += 2;
                grayLine(cy);
                cy += 4;
                return;
            }
            if (tag === 'br') {
                cy += 3;
                return;
            }
            if (tag === 'table') {
                const headers = [];
                const bodyRows = [];
                const thead = node.querySelector('thead');
                const tbody = node.querySelector('tbody') || node;
                if (thead) {
                    thead.querySelectorAll('tr').forEach(tr => {
                        headers.push(
                            Array.from(tr.querySelectorAll('th, td')).map(c => c.textContent.trim())
                        );
                    });
                }
                tbody.querySelectorAll('tr').forEach(tr => {
                    if (thead && tr.closest('thead')) return;
                    bodyRows.push(
                        Array.from(tr.querySelectorAll('td, th')).map(c => c.textContent.trim())
                    );
                });
                if (!bodyRows.length && !headers.length) return;
                ensureSpace(25);
                if (typeof doc.autoTable === 'function') {
                    doc.autoTable({
                        startY: cy,
                        head: headers.length ? [headers[0]] : undefined,
                        body: bodyRows,
                        theme: 'striped',
                        headStyles: {
                            fillColor: [accent.r, accent.g, accent.b],
                            textColor: [255, 255, 255],
                            fontSize: 9,
                            fontStyle: 'bold',
                            halign: 'center'
                        },
                        bodyStyles: { fontSize: 9, cellPadding: 2 },
                        alternateRowStyles: { fillColor: [245, 248, 255] },
                        styles: { overflow: 'linebreak' },
                        margin: { left: ML, right: MR }
                    });
                    cy = doc.lastAutoTable.finalY + 5;
                } else {
                    [...(headers.length ? [headers[0]] : []), ...bodyRows].forEach(row => {
                        ensureSpace(6);
                        doc.setFontSize(9);
                        doc.setFont(mainFont, 'normal');
                        doc.text(row.join('  |  '), ML, cy);
                        cy += 5;
                    });
                }
                return;
            }
            if (tag === 'ul' || tag === 'ol') {
                const items = node.querySelectorAll(':scope > li');
                let idx = 0;
                items.forEach(li => {
                    idx++;
                    const bullet = tag === 'ul' ? '• ' : `${idx}. `;
                    ensureSpace(7);
                    doc.setFontSize(mainFontSize);
                    doc.setFont(mainFont, 'normal');
                    setBlack();
                    const txt = bullet + li.textContent.trim();
                    const lines = doc.splitTextToSize(txt, CW - 6);
                    doc.text(lines, ML + 5, cy);
                    cy += lines.length * mainLineH + 1;
                });
                cy += 2;
                return;
            }
            if (tag === 'p' || tag === 'div') {
                const txt = node.textContent.trim();
                if (!txt) { cy += 2; return; }
                const isSP = /^\s*s\/p\.?\s*$/i.test(txt)
                    || /^\s*sin particularidades\.?\s*$/i.test(txt)
                    || /^\s*sin hallazgos\b/i.test(txt)
                    || /^\s*dentro de (lo|par[aá]metros?) normal/i.test(txt)
                    || /^\s*normal\.?\s*$/i.test(txt);
                const hasBold   = node.querySelector('strong, b') !== null;
                const hasItalic = node.querySelector('em, i') !== null;
                if (!hasBold && !hasItalic) {
                    ensureSpace(8);
                    if (isSP) {
                        doc.setFontSize(mainFontSize - 1);
                        doc.setFont(mainFont, 'italic');
                        setGray(150);   // gris claro
                    } else {
                        doc.setFontSize(mainFontSize);
                        doc.setFont(mainFont, 'normal');
                        setBlack();
                    }
                    const lines = doc.splitTextToSize(txt, CW);
                    const lh = isSP ? (mainFontSize - 1) * 0.5 : mainLineH;
                    const blockH = lines.length * lh;
                    if (cy + blockH > FOOTER_Y - 10) {
                        doc.addPage(); pageNum++;
                        if (cfgShowFooter || cfgShowPageNum) drawFooter(pageNum);
                        drawWorkplaceBanner();
                    }
                    doc.text(lines, ML, cy);
                    cy += blockH + 2;
                    if (isSP) { setBlack(); doc.setFontSize(mainFontSize); doc.setFont(mainFont, 'normal'); }
                } else {
                    renderInlineParagraph(node);
                }
                return;
            }
            for (const child of node.childNodes) {
                renderNode(child);
            }
        }
        function renderInlineParagraph(node) {
            const LINE_H   = mainLineH;
            const FONT_SZ  = mainFontSize;
            const MAX_W    = CW;
            doc.setFontSize(FONT_SZ);
            const segments = [];
            function walkInline(n, bold, italic) {
                if (n.nodeType === Node.TEXT_NODE) {
                    if (n.textContent) segments.push({ text: n.textContent, bold, italic });
                } else if (n.nodeType === Node.ELEMENT_NODE) {
                    const t = n.tagName.toLowerCase();
                    const b = bold   || t === 'strong' || t === 'b';
                    const i = italic || t === 'em'     || t === 'i';
                    for (const child of n.childNodes) walkInline(child, b, i);
                }
            }
            walkInline(node, false, false);
            ensureSpace(10);
            let lineX = ML;
            let lineY = cy;
            let usedW = 0;
            for (const seg of segments) {
                const style = seg.bold && seg.italic ? 'bolditalic'
                            : seg.bold              ? 'bold'
                            : seg.italic            ? 'italic'
                            : 'normal';
                doc.setFont(mainFont, style);
                setBlack();
                const tokens = seg.text.split(/(\s+)/);
                for (const tok of tokens) {
                    if (!tok) continue;
                    const tw = doc.getTextWidth(tok);
                    if (tok.trim() && usedW + tw > MAX_W) {
                        lineY += LINE_H;
                        if (lineY > FOOTER_Y - 10) {
                            doc.addPage(); pageNum++;
                            if (cfgShowFooter || cfgShowPageNum) drawFooter(pageNum);
                            drawWorkplaceBanner();
                            lineY = cy;
                        }
                        lineX = ML;
                        usedW = 0;
                    }
                    doc.text(tok, lineX + usedW, lineY);
                    usedW += tw;
                }
            }
            cy = lineY + LINE_H + 2;
        }
        function drawSignature() {
            const api = window.PdfMakerSectionUtils;
            if (api && typeof api.drawSignatureSection === 'function') {
                const ensureSpaceAt = (cyIn, needed) => { cy = cyIn; ensureSpace(needed); return cy; };
                cy = api.drawSignatureSection({ PAGE_W, MR, showSignLine, showSignName, showSignMat, profName, profDisplayName, matricula, especialidad, sigB64, doc, setBlack, setGray, mainFont, ensureSpace: ensureSpaceAt, cyStart: cy });
            }
        }
        drawWorkplaceBanner();
        drawHeader();
        if (cfgShowFooter || cfgShowPageNum) drawFooter(1);
        drawStudyInfo();
        drawPatientBlock();
        const parser    = new DOMParser();
        const parsedDoc = parser.parseFromString(htmlContent || '', 'text/html');
        for (const child of parsedDoc.body.childNodes) {
            renderNode(child);
        }
        drawSignature();
        const cfgShowQR = config.showQR ?? false;
        if (cfgShowQR && typeof generateQRCode === 'function') {
            try {
                const qrParts = [
                    'TPRO-VERIFY',
                    `ID:${(cfgShowReportNumber && reportNum) ? reportNum : 'TPRO-' + Date.now()}`,
                    `Fecha:${pDate}`,
                    profName ? `Prof:${profName}` : '',
                    matricula ? `Mat:${matricula}` : '',
                    pName ? `Pac:${pName}` : '',
                    pDni ? `DNI:${pDni}` : '',
                    studyType ? `Estudio:${studyType}` : '',
                    institutionName ? `Inst:${institutionName}` : ''
                ].filter(Boolean);
                const qrText = qrParts.join('|');
                const qrDataUrl = generateQRCode(qrText);
                if (qrDataUrl) {
                    cy += 6;
                    ensureSpace(24);
                    const qrSize = 17; // 64px ≈ 17mm
                    const qrX = PAGE_W / 2 - qrSize / 2;
                    doc.addImage(qrDataUrl, 'GIF', qrX, cy, qrSize, qrSize);
                    cy += qrSize + 2;
                    doc.setFontSize(6);
                    setGray(153); // #999
                    doc.text('CÓDIGO DE VERIFICACIÓN', PAGE_W / 2, cy, { align: 'center' });
                    setBlack();
                    doc.setFontSize(mainFontSize);
                }
            } catch (_) { /* QR no disponible */ }
        }
        const blob = doc.output('blob');
        const saveBlob = typeof window.saveToDisk === 'function'
            ? window.saveToDisk
            : async (b, name) => {
                const url = URL.createObjectURL(b);
                const a   = document.createElement('a');
                a.href = url; a.download = name;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            };
        await saveBlob(blob, `${fileName}_${fileDate}.pdf`);
        showToast('PDF descargado ✓', 'success');
        if (typeof saveReportToHistory === 'function' && !window._skipReportSave) {
            try {
                saveReportToHistory({
                    htmlContent: htmlContent,
                    fileName:    fileName,
                    patientName: pName,
                    patientDni:  pDni
                });
            } catch (_) { /* no bloquear la descarga si falla el guardado */ }
        }
    } catch (e) {
        console.error('pdfMaker error:', e);
        showToast('Error al crear PDF: ' + e.message, 'error');
    }
}
window.downloadPDFWrapper = downloadPDFWrapper;