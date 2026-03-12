// ============ EDITOR: EXPORT RENDER HELPERS ============

(function initEditorExportRenderUtils() {
    function _stripAccentsForCompare(text) {
        return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function _isGenericStudyType(text) {
        const n = _stripAccentsForCompare(text).toLowerCase().trim();
        return n === ''
            || n === 'informe medico general'
            || n === 'informe medico'
            || n === 'informe general'
            || n === 'informe generico'
            || n === 'generico'
            || n === 'general';
    }

    function _extractStudyTypeFromHtmlHeading(html) {
        const probe = document.createElement('div');
        probe.innerHTML = html || '';
        const heading = probe.querySelector('h1, h2, h3');
        if (!heading) return '';
        const raw = String(heading.textContent || '').trim();
        const m = raw.match(/^INFORME\s+DE\s+(.+)$/i);
        return (m && m[1]) ? m[1].trim() : '';
    }

    function _extractStudyTypeFromPlainText(text) {
        const line = String(text || '').split(/\r?\n/).find(l => /^\s*INFORME\s+DE\s+/i.test(l || ''));
        if (!line) return '';
        const m = String(line).trim().match(/^INFORME\s+DE\s+(.+)$/i);
        return (m && m[1]) ? m[1].trim() : '';
    }

    function _computeEffectiveStudyType(baseStudyType, fallbackTemplateName, editorHtml, plainText) {
        const base = String(baseStudyType || fallbackTemplateName || '').trim();
        const headingStudy = _extractStudyTypeFromHtmlHeading(editorHtml) || _extractStudyTypeFromPlainText(plainText);
        if (_isGenericStudyType(base) && headingStudy) return headingStudy;
        return base;
    }

    async function _loadExportContext(text) {
        const editorEl = document.getElementById('editor');
        const rawEditorText = editorEl?.innerText || '';
        const sourceText = String(text || rawEditorText || '').trim();

        const getCfg = async () => {
            try {
                if (window._pdfConfigCache && typeof window._pdfConfigCache === 'object') return window._pdfConfigCache;
                if (typeof appDB !== 'undefined' && appDB && typeof appDB.get === 'function') {
                    const fromDb = await appDB.get('pdf_config');
                    if (fromDb && typeof fromDb === 'object') return fromDb;
                }
                return JSON.parse(localStorage.getItem('pdf_config') || '{}');
            } catch (_) {
                return {};
            }
        };

        const cfg = await getCfg();
        const extracted = (typeof extractPatientDataFromText === 'function') ? extractPatientDataFromText(sourceText) : {};
        const reqVal = (id) => document.getElementById(id)?.value?.trim() || '';

        const tplKey = window.selectedTemplate || cfg.selectedTemplate || '';
        const tplName = (tplKey && window.MEDICAL_TEMPLATES?.[tplKey]?.name) || '';
        const rawDate = cfg.studyDate || '';
        const studyDate = rawDate
            ? new Date(rawDate + 'T12:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const effectiveStudyType = _computeEffectiveStudyType(
            cfg.studyType,
            tplName,
            editorEl?.innerHTML || '',
            sourceText
        );

        return {
            text: sourceText,
            patientName: extracted.name || cfg.patientName || reqVal('reqPatientName') || reqVal('pdfPatientName') || '',
            patientDni: extracted.dni || cfg.patientDni || reqVal('reqPatientDni') || reqVal('pdfPatientDni') || '',
            patientAge: extracted.age || cfg.patientAge || reqVal('reqPatientAge') || reqVal('pdfPatientAge') || '',
            patientSex: extracted.sex || cfg.patientSex || reqVal('reqPatientSex') || reqVal('pdfPatientSex') || '',
            patientInsurance: extracted.insurance || cfg.patientInsurance || reqVal('reqPatientInsurance') || reqVal('pdfPatientInsurance') || '',
            patientAffiliateNum: extracted.affiliateNum || cfg.patientAffiliateNum || reqVal('reqPatientAffiliateNum') || reqVal('pdfPatientAffiliateNum') || '',
            studyType: effectiveStudyType || reqVal('reqStudyType') || '',
            studyDate,
            studyTime: cfg.studyTime || reqVal('reqStudyTime') || reqVal('pdfStudyTime') || '',
            studyReason: cfg.studyReason || reqVal('reqStudyReason') || reqVal('pdfStudyReason') || '',
            referringDoctor: cfg.referringDoctor || reqVal('reqReferringDoctor') || reqVal('pdfReferringDoctor') || '',
            reportNum: cfg.reportNum || reqVal('pdfReportNumber') || ''
        };
    }

    function _rtfEscapeLine(line) {
        let escaped = String(line || '')
            .replace(/\\/g, '\\\\')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}');

        escaped = escaped.replace(/[^\x20-\x7E]/g, (ch) => {
            const code = ch.charCodeAt(0);
            if (code <= 255) return "\\'" + code.toString(16).padStart(2, '0');
            const signed = code > 32767 ? code - 65536 : code;
            return '\\u' + signed + '?';
        });

        return escaped;
    }

    async function createRTF(text, _fecha) {
        const ctx = await _loadExportContext(text);
        const cleaned = ctx.text
            .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
            .replace(/[\u{2600}-\u{27BF}]/gu, '')
            .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
            .replace(/[\u{200B}-\u{200D}\u{FEFF}]/gu, '')
            .replace(/✏️?/g, '');

        const addField = (arr, label, value) => {
            const v = String(value || '').trim();
            if (!v) return;
            arr.push(`\\b ${_rtfEscapeLine(label)}:\\b0 ${_rtfEscapeLine(v)}\\par`);
        };

        const meta = [];
        addField(meta, 'Fecha', `${ctx.studyDate}${ctx.studyTime ? ' ' + ctx.studyTime : ''}`);
        addField(meta, 'Estudio', ctx.studyType);
        addField(meta, 'Informe N', ctx.reportNum);
        addField(meta, 'Paciente', ctx.patientName);
        addField(meta, 'DNI', ctx.patientDni);
        addField(meta, 'Edad', ctx.patientAge ? `${ctx.patientAge} años` : '');
        addField(meta, 'Sexo', ctx.patientSex === 'M' ? 'Masculino' : ctx.patientSex === 'F' ? 'Femenino' : ctx.patientSex);
        addField(meta, 'Cobertura', ctx.patientInsurance);
        addField(meta, 'N Afiliado', ctx.patientAffiliateNum);
        addField(meta, 'Medico solicitante', ctx.referringDoctor);
        addField(meta, 'Motivo de consulta', ctx.studyReason);

        const lines = cleaned.split('\n');
        const body = lines.map((line) => `${_rtfEscapeLine(line)}\\par`).join('\n');

        return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Arial;}}\\paperw12240\\paperh15840\\margl1080\\margr1080\\margt1080\\margb1080\\f0\\fs22\\sl276\\slmult1\\qc\\b INFORME M\\'c9DICO\\b0\\par\\ql\\par${meta.join('\n')}\\par\\b CONTENIDO DEL INFORME\\b0\\par${body}}`;
    }

    async function createTXT(text) {
        const ctx = await _loadExportContext(text);
        const lines = ['INFORME MEDICO'];

        const pushField = (label, value) => {
            const v = String(value || '').trim();
            if (!v) return;
            lines.push(`${label}: ${v}`);
        };

        pushField('Fecha', `${ctx.studyDate}${ctx.studyTime ? ' ' + ctx.studyTime : ''}`);
        pushField('Estudio', ctx.studyType);
        pushField('Informe N', ctx.reportNum);
        pushField('Paciente', ctx.patientName);
        pushField('DNI', ctx.patientDni);
        pushField('Edad', ctx.patientAge ? `${ctx.patientAge} años` : '');
        pushField('Sexo', ctx.patientSex === 'M' ? 'Masculino' : ctx.patientSex === 'F' ? 'Femenino' : ctx.patientSex);
        pushField('Cobertura', ctx.patientInsurance);
        pushField('N Afiliado', ctx.patientAffiliateNum);
        pushField('Medico solicitante', ctx.referringDoctor);
        pushField('Motivo de consulta', ctx.studyReason);

        lines.push('');
        lines.push('CONTENIDO DEL INFORME');
        lines.push('');
        lines.push(ctx.text || '');
        return lines.join('\n');
    }

    async function createHTML() {
        const editorEl = document.getElementById('editor');
        if (!editorEl) return '<html><body>Sin contenido</body></html>';

        const profData = (typeof appDB !== 'undefined' ? await appDB.get('prof_data') : null) || {};
        const config = window._pdfConfigCache || (typeof appDB !== 'undefined' ? await appDB.get('pdf_config') : null) || {};

        const esc = (t) => t != null ? String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
        const norm = typeof normalizeFieldText === 'function' ? normalizeFieldText : (t) => t || '';
        const escName = (t) => esc(norm(t || '', 'name'));
        const escUpper = (t) => esc((t || '').toUpperCase());
        const escSentence = (t) => esc(norm(t || '', 'sentence'));

        const activePro = config.activeProfessional || null;
        const rawProfName = activePro?.nombre || profData.nombre || '';
        const profDisplay = (typeof window.getProfessionalDisplay === 'function')
            ? window.getProfessionalDisplay(rawProfName, activePro?.sexo || profData.sexo || '').fullName
            : (String(rawProfName || '').trim() || 'Profesional');
        const profName = escName(profDisplay) || '';
        const matricula = esc(activePro?.matricula || profData.matricula || '');
        const espRaw = activePro?.especialidades
            || (Array.isArray(profData.specialties) ? profData.specialties.filter(s => s && s !== 'Todas').join(' / ') : (profData.especialidad || ''));
        const especialidad = escSentence(espRaw);
        const profDispName = profName;
        const accentColor = activePro?.headerColor || profData.headerColor || '#1a56a0';

        const profTelefono = esc(activePro?.telefono || profData.telefono || '');
        const profEmail = esc(activePro?.email || profData.email || '');
        const profWhatsapp = esc(activePro?.whatsapp || '');
        const profInstagram = esc(activePro?.instagram || '');
        const profFacebook = esc(activePro?.facebook || '');
        const profXSocial = esc(activePro?.x || '');
        const profYoutube = esc(activePro?.youtube || '');

        const wpProfiles = (typeof appDB !== 'undefined' ? await appDB.get('workplace_profiles') : null) || [];
        const wpIdx = config.activeWorkplaceIndex;
        const activeWp = (wpIdx !== undefined && wpIdx !== null) ? wpProfiles[Number(wpIdx)] : wpProfiles[0];
        const wpName = escName(activeWp?.name || '');
        const wpEmail = esc(activeWp?.email || config.workplaceEmail || '');
        const wkAddr = esc(config.workplaceAddress || activeWp?.address || '');
        const wkPhone = esc(config.workplacePhone || activeWp?.phone || '');

        const _wpLogoRaw = activeWp?.logo || '';
        const instLogoSrc = (_wpLogoRaw && _wpLogoRaw.startsWith('data:')) ? _wpLogoRaw : (typeof appDB !== 'undefined' ? (await appDB.get('pdf_logo')) || '' : '');
        const profLogoSrc = (activePro?.logo && activePro.logo.startsWith('data:')) ? activePro.logo : '';
        const sigSrc = (activePro?.firma && activePro.firma.startsWith('data:')) ? activePro.firma : (typeof appDB !== 'undefined' ? (await appDB.get('pdf_signature')) || '' : '');
        const hasInstLogo = !!(instLogoSrc && instLogoSrc.startsWith('data:image/'));
        const hasProfLogo = !!(profLogoSrc && profLogoSrc.startsWith('data:image/'));
        const hasSig = !!(sigSrc && sigSrc.startsWith('data:image/'));
        const instLogoSize = config.instLogoSizePx || 60;
        const firmaSize = config.firmaSizePx || 60;

        const extracted = (typeof extractPatientDataFromText === 'function') ? extractPatientDataFromText(editorEl.innerText) : {};
        const reqVal = (id) => document.getElementById(id)?.value?.trim() || '';
        const patientName = escName(extracted.name || config.patientName || reqVal('reqPatientName') || reqVal('pdfPatientName') || '');
        const patientDni = esc(extracted.dni || config.patientDni || reqVal('reqPatientDni') || reqVal('pdfPatientDni') || '');
        const patientAge = esc(extracted.age || config.patientAge || reqVal('reqPatientAge') || reqVal('pdfPatientAge') || '');
        const rawSex = extracted.sex || config.patientSex || reqVal('reqPatientSex') || reqVal('pdfPatientSex') || '';
        const patientSex = rawSex === 'M' ? 'Masculino' : rawSex === 'F' ? 'Femenino' : escName(rawSex);
        const patientIns = escUpper(config.patientInsurance || reqVal('reqPatientInsurance') || reqVal('pdfPatientInsurance') || '');
        const affiliateNum = esc(config.patientAffiliateNum || reqVal('reqPatientAffiliateNum') || reqVal('pdfPatientAffiliateNum') || '');

        const tplKey = window.selectedTemplate || config.selectedTemplate || '';
        const tplName = (tplKey && window.MEDICAL_TEMPLATES?.[tplKey]?.name) || '';
        const studyType = escSentence(_computeEffectiveStudyType(
            config.studyType || document.getElementById('reqStudyType')?.value || '',
            tplName,
            editorEl?.innerHTML || '',
            editorEl?.innerText || ''
        ));
        const rawDate = config.studyDate || '';
        const studyDate = rawDate ? new Date(rawDate + 'T12:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const studyTime = esc(document.getElementById('reqStudyTime')?.value || document.getElementById('pdfStudyTime')?.value || config.studyTime || '');
        const studyReason = escSentence(config.studyReason || document.getElementById('reqStudyReason')?.value || '');
        const refDoctor = escName(config.referringDoctor || document.getElementById('reqReferringDoctor')?.value || '');
        const reportNum = esc(document.getElementById('pdfReportNumber')?.value || config.reportNum || '');
        const footerText = esc(config.footerText || 'Este informe es válido únicamente con la firma del profesional a cargo.');
        const showSignLine = config.showSignLine ?? true;
        const showSignName = config.showSignName ?? true;
        const showSignMat = config.showSignMatricula ?? true;
        const showSignImage = config.showSignImage ?? hasSig;

        const _clone = editorEl.cloneNode(true);
        _clone.querySelectorAll('.patient-data-header, .patient-placeholder-banner, .btn-append-inline, .original-text-banner, .no-print, .ai-note-panel, .no-data-edit-btn, .no-data-field, #aiNotePanel').forEach(el => el.remove());
        const firstEl = _clone.firstElementChild;
        if (firstEl && /^H[1-3]$/i.test(firstEl.tagName) && /^\s*INFORME\s+DE\b/i.test(firstEl.textContent || '')) {
            firstEl.remove();
        }
        const bodyContent = _clone.innerHTML;

        let wpSection = '';
        const hasWpData = wpName || wkAddr || wkPhone || wpEmail;
        if (hasWpData) {
            const wpDetails = [wkAddr, wkPhone ? 'Tel: ' + wkPhone : '', wpEmail].filter(Boolean);
            wpSection = `<div class="preview-workplace"><div class="pvw-block">`
                + (hasInstLogo ? `<img class="pvw-logo" src="${instLogoSrc}" style="max-height:${instLogoSize}px;">` : '')
                + `<div class="pvw-text">`
                + (wpName ? `<div class="pvw-name">${wpName}</div>` : '')
                + (wpDetails.length ? `<div class="pvw-details">${wpDetails.join(' &nbsp;•&nbsp; ')}</div>` : '')
                + `</div></div></div>`;
        }

        let headerSection = '';
        const isAdminNoProf = (!activePro || !activePro.nombre) && (!profData.nombre || profData.nombre === 'Administrador' || profData.nombre === 'Admin');
        if (!isAdminNoProf && profName) {
            const espArr = (espRaw || '').replace(/^ALL$/i, 'Medicina General').split(/[,\/]/).map(s => s.replace(/^General$/i, 'Medicina General').trim()).filter(Boolean);
            const espBadgesHtml = espArr.map(s => `<span class="pvh-badge">${esc(s)}</span>`).join('');
            const cItems = [];
            if (profTelefono) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9742;</span>${profTelefono}</div>`);
            if (profEmail) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9993;</span>${profEmail}</div>`);
            if (profWhatsapp) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#128241;</span>${profWhatsapp}</div>`);
            if (profInstagram) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">@</span>${profInstagram}</div>`);
            if (profFacebook) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">f</span>${profFacebook}</div>`);
            if (profXSocial) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#120143;</span>${profXSocial}</div>`);
            if (profYoutube) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9654;</span>${profYoutube}</div>`);
            const contactHtml = cItems.length ? `<div class="pvh-contact">${cItems.join('')}</div>` : '';
            headerSection = `<div class="preview-header"><div class="pvh-body">`
                + (hasProfLogo ? `<img src="${profLogoSrc}" style="height:40px;max-height:40px;width:auto;object-fit:contain;flex-shrink:0;background:transparent;border:none;border-radius:0;">` : '')
                + `<div class="pvh-info"><div><span class="pvh-name">Estudio realizado por: ${profDispName}</span></div>`
                + (espBadgesHtml ? `<div class="pvh-badges">${espBadgesHtml}</div>` : '')
                + (matricula ? `<div class="pvh-mat">Mat. ${matricula}</div>` : '')
                + `</div>${contactHtml}</div></div>`;
        }

        let patientSection = '';
        const pCells = [];
        if (patientName) pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">Paciente</span><span class="pvp-val pvp-bold">${patientName}</span></div>`);
        if (patientDni) pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">DNI</span><span class="pvp-val">${patientDni}</span></div>`);
        if (patientAge) pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">Edad</span><span class="pvp-val">${patientAge} años</span></div>`);
        if (patientSex) pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">Sexo</span><span class="pvp-val">${patientSex}</span></div>`);
        if (patientIns) pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">Cobertura</span><span class="pvp-val">${patientIns}</span></div>`);
        if (affiliateNum) pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">Nº Afiliado</span><span class="pvp-val">${affiliateNum}</span></div>`);
        if (pCells.length) patientSection = `<div class="preview-patient"><div class="pvp-grid">${pCells.join('')}</div></div>`;

        let row1 = '';
        row1 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">ESTUDIO:</span><span class="pvs-val">${studyType || '—'}</span></div>`;
        row1 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">INFORME Nº:</span><span class="pvs-val">${reportNum || '—'}</span></div>`;
        row1 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">FECHA:</span><span class="pvs-val">${studyDate}${studyTime ? ' ' + studyTime : ''}</span></div>`;
        let row2 = '';
        if (refDoctor) row2 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">SOLICITANTE:</span><span class="pvs-val">${refDoctor}</span></div>`;
        if (studyReason) row2 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">MOTIVO:</span><span class="pvs-val">${studyReason}</span></div>`;
        const studyTitle = (studyType && String(studyType).trim()) ? `INFORME DE ${studyType}` : 'INFORME MEDICO';
        const studySection = `<div class="preview-study"><div class="report-h1">${studyTitle}</div><div class="pvs-grid pvs-3col">${row1}</div>` + (row2 ? `<div class="pvs-grid pvs-2col">${row2}</div>` : '') + `</div>`;

        let sigSection = '';
        if (!isAdminNoProf && profName) {
            sigSection = '<div class="preview-signature"><div class="pvsig-block">';
            if (showSignImage && hasSig) sigSection += `<img src="${sigSrc}" class="pvsig-img" style="max-height:${firmaSize}px;">`;
            if (showSignLine) sigSection += '<div class="pvsig-line"></div>';
            if (showSignName && profName) sigSection += `<div class="pvsig-name">${profDispName}</div>`;
            if (showSignMat && matricula) sigSection += `<div class="pvsig-mat">Mat. ${matricula}</div>`;
            if (especialidad) sigSection += `<div class="pvsig-spec">${especialidad}</div>`;
            sigSection += '</div></div>';
        }

        const footerParts = [];
        if (footerText) footerParts.push(`<span>${footerText}</span>`);
        footerParts.push(`<span style="margin-left:auto;">Fecha: ${new Date().toLocaleDateString('es-ES')}</span>`);
        const footerSection = `<div class="preview-footer"><div class="pvf-wrap">${footerParts.join('')}</div></div>`;

        let qrSection = '';
        const showQR = config.showQR ?? false;
        if (showQR && typeof generateQRCode === 'function') {
            const qrParts = [
                'TPRO-VERIFY',
                `ID:${reportNum || 'TPRO-' + Date.now()}`,
                `Fecha:${new Date().toLocaleDateString('es-ES')}`,
                profName ? `Prof:${profName.replace(/<[^>]+>/g, '')}` : '',
                matricula ? `Mat:${matricula.replace(/<[^>]+>/g, '')}` : '',
                patientName ? `Pac:${patientName.replace(/<[^>]+>/g, '')}` : '',
                patientDni ? `DNI:${patientDni.replace(/<[^>]+>/g, '')}` : '',
                studyType ? `Estudio:${studyType.replace(/<[^>]+>/g, '')}` : '',
                wpName ? `Inst:${wpName.replace(/<[^>]+>/g, '')}` : ''
            ].filter(Boolean);
            const qrData = qrParts.join('|');
            const qrImgSrc = generateQRCode(qrData || 'Transcriptor Medico Pro');
            if (qrImgSrc) {
                qrSection = `<div class="preview-qr"><img src="${qrImgSrc}" alt="QR"><span class="pvqr-label">Codigo de verificacion</span></div>`;
            }
        }

        const fontMap = { helvetica: 'Helvetica, Arial, sans-serif', times: "'Times New Roman', Times, serif", courier: "'Courier New', Courier, monospace" };
        const cfgFont = (config.font || 'helvetica').toLowerCase();
        const fontFamily = fontMap[cfgFont] || fontMap.helvetica;
        const fontSize = parseInt(config.fontSize, 10) || 10;
        const marginCSS = { narrow: '10mm', normal: '18mm', wide: '28mm' }[config.margins] || '18mm';

        const _hexToRgb = (hex) => {
            const m = hex.replace('#', '').match(/.{2}/g);
            return m ? m.map(c => parseInt(c, 16)) : [26, 86, 160];
        };
        const [ar, ag, ab] = _hexToRgb(accentColor);
        const accentLight = `rgb(${Math.round(ar * 0.3 + 255 * 0.7)},${Math.round(ag * 0.3 + 255 * 0.7)},${Math.round(ab * 0.3 + 255 * 0.7)})`;

        return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informe Médico — ${patientName || studyType || 'Sin título'}</title>
<style>
:root { --pa: ${accentColor}; }
@page { size: A4; margin: ${marginCSS}; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: ${fontFamily}; font-size: ${fontSize}pt; line-height: 1.5; color: #111; background: #fff; max-width: 210mm; margin: 0 auto; padding: 0 ${marginCSS} ${marginCSS}; border-top: 5px solid var(--pa); }
.preview-workplace { background: var(--pa); color: white; margin: 0 -${marginCSS}; padding: 8px ${marginCSS} 7px; font-family: Helvetica, Arial, sans-serif; }
.pvw-block { display: flex; align-items: center; justify-content: flex-start; gap: 14px; }
.pvw-logo { max-height: 52px; max-width: 90px; object-fit: contain; flex-shrink: 0; border: none; border-radius: 0; background: transparent; }
.pvw-text { text-align: center; }
.pvw-name { font-size: 11pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.pvw-details { font-size: 8pt; opacity: 0.9; margin-top: 2px; letter-spacing: 0.02em; }
.preview-header { padding: 12px 0 10px; border-bottom: 2px solid var(--pa); margin-bottom: 12px; }
.pvh-body { display: flex; align-items: center; gap: 14px; }
.pvh-info { flex: 1; }
.pvh-name { font-size: 14pt; font-weight: 700; color: var(--pa); letter-spacing: 0.02em; }
.pvh-badges { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px; }
.pvh-badge { background: ${accentLight}; color: var(--pa); border: 1px solid ${accentLight}; border-radius: 12px; padding: 1px 8px; font-size: 8pt; font-weight: 600; white-space: nowrap; font-family: Helvetica, Arial, sans-serif; }
.pvh-mat { font-size: 8.5pt; color: #555; margin-top: 3px; }
.pvh-contact { margin-left: auto; text-align: right; font-size: 8pt; color: #555; font-family: Helvetica, Arial, sans-serif; min-width: 130px; }
.pvh-ci { display: flex; align-items: center; gap: 5px; justify-content: flex-end; margin-bottom: 3px; white-space: nowrap; }
.pvh-ci-icon { width: 14px; text-align: center; font-size: 9.5pt; color: var(--pa); flex-shrink: 0; }
.preview-patient { margin-bottom: 10px; }
.pvp-grid { background: #fafbfc; border: 1px solid #d0d7de; border-left: 4px solid var(--pa); border-radius: 4px; padding: 10px 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 20px; }
.pvp-cell { display: flex; flex-direction: column; gap: 2px; }
.pvp-lbl { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pa); font-family: Helvetica, Arial, sans-serif; font-weight: 600; opacity: 0.75; }
.pvp-val { font-size: 10pt; color: #111; font-weight: 700; font-family: Helvetica, Arial, sans-serif; }
.pvp-bold { font-weight: 700; }
.preview-study { margin-bottom: 16px; }
.pvs-grid { display: grid; gap: 6px 24px; font-size: 8.5pt; color: #333; background: #f4f7fb; padding: 10px 16px; border: 1px solid #e3e8ef; font-family: Helvetica, Arial, sans-serif; }
.pvs-grid.pvs-3col { grid-template-columns: repeat(3, 1fr); border-radius: 4px 4px 0 0; border-bottom: none; }
.pvs-grid.pvs-2col { grid-template-columns: 1fr 1fr; border-radius: 0 0 4px 4px; border-top: 1px dashed #dde3ee; }
.pvs-cell { display: flex; flex-direction: column; gap: 2px; padding: 2px 0; }
.pvs-lbl { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pa); font-weight: 600; opacity: 0.75; }
.pvs-val { font-size: 9pt; color: #222; font-weight: 700; font-family: Helvetica, Arial, sans-serif; }
.preview-content { margin: 8px 0 24px; }
.preview-content h1,.report-h1 { font-size: 13pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pa); border-bottom: 2px solid var(--pa); padding-bottom: 4px; margin: 20px 0 10px; text-align: center; }
.report-h1 { letter-spacing: 0.10em; margin: 18px 0 10px; }
.preview-content h2,.report-h2 { font-size: 11pt; font-weight: 700; color: var(--pa); margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 1px solid ${accentLight}; }
.report-h2 { text-transform: uppercase; letter-spacing: 0.07em; margin: 14px 0 6px; }
.preview-content h3,.report-h3 { font-size: 10.5pt; font-weight: 600; font-style: italic; color: #333; margin: 12px 0 5px; }
.report-h3 { color: #222; margin: 10px 0 5px; font-style: normal; }
.preview-content p,.report-p { margin: 2px 0 6px; line-height: 1.5; text-align: justify; }
.preview-content ul,.preview-content ol { padding-left: 1.5em; margin: 4px 0 8px; }
.preview-content li { margin-bottom: 4px; line-height: 1.5; }
.preview-content hr { border: none; border-top: 1px solid #ddd; margin: 14px 0; }
.preview-content table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 10px 0 16px; }
.preview-content thead th { background: var(--pa); color: white; font-weight: 700; padding: 6px 10px; text-align: center; font-family: Helvetica, Arial, sans-serif; font-size: 8.5pt; }
.preview-content tbody tr:nth-child(even) td { background: #f0f4fb; }
.preview-content tbody td { padding: 5px 10px; border-bottom: 1px solid #dde3ee; color: #111; }
.preview-content table:not(:has(thead)) tr:first-child td,.preview-content table tr th { background: var(--pa); color: white; font-weight: 700; padding: 6px 10px; font-family: Helvetica, Arial, sans-serif; font-size: 8.5pt; }
.preview-signature { margin-top: 72px; margin-bottom: 8px; }
.pvsig-block { text-align: center; width: 240px; margin-left: auto; }
.pvsig-img { max-height: 60px; display: block; margin: 0 auto; background: transparent; }
.pvsig-line { border: none; border-top: 1.5px solid #333; width: 200px; margin: 0 auto; }
.pvsig-name { font-size: 10pt; font-weight: 700; margin-top: 9px; text-align: center; }
.pvsig-mat { font-size: 9pt; color: #555; margin-top: 2px; text-align: center; }
.pvsig-spec { font-size: 8.5pt; color: #666; font-style: italic; margin-top: 1px; text-align: center; }
.preview-qr { text-align: center; margin-top: 12px; }
.preview-qr img { width: 64px; height: 64px; image-rendering: pixelated; }
.pvqr-label { font-size: 6pt; color: #999; display: block; text-align: center; font-family: Helvetica, Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
.preview-footer { margin-top: 20px; border-top: 1.5px solid #ccc; padding-top: 8px; }
.pvf-wrap { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 7.5pt; color: #888; font-family: Helvetica, Arial, sans-serif; gap: 4px; }
@media print { body { border-top: none; padding: 0; margin: 0; max-width: none; } .preview-workplace { margin: 0; } h1,h2,h3,.report-h1,.report-h2,.report-h3 { break-after: avoid; page-break-after: avoid; } .preview-signature,.pvsig-block { break-inside: avoid; page-break-inside: avoid; } }
</style>
</head>
<body>
${wpSection}
${headerSection}
${patientSection}
${studySection}
<div class="preview-content">${bodyContent}</div>
${sigSection}
${qrSection}
${footerSection}
</body>
</html>`;
    }

    window.createRTF = createRTF;
    window.createTXT = createTXT;
    window.createHTML = createHTML;
})();
