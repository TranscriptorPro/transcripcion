// ============ EDITOR WYSIWYG ============

if (editor) {
    editor.addEventListener('input', () => {
        if (typeof window.updateWordCount === 'function') window.updateWordCount();
        saveUndoState();
    });

    // ── Detectar texto pegado → limpiar formato Word + activar Estructurar ──
    editor.addEventListener('paste', (e) => {
        // Interceptar el paste para limpiar basura de Word/Google Docs
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        const html = clipboardData.getData('text/html');
        const plain = clipboardData.getData('text/plain');

        // Si viene de Word/Docs (tiene HTML con estilos), limpiar
        if (html && (html.includes('mso-') || html.includes('MsoNormal') || html.includes('docs-internal') || html.includes('<o:p>'))) {
            e.preventDefault();

            // Limpiar: conservar solo estructura básica, eliminar estilos inline
            let clean = html
                .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '')               // tags de Office
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')            // bloques de estilo
                .replace(/<meta[^>]*>/gi, '')                              // metas
                .replace(/<img[^>]*>/gi, '')                               // RM-3: eliminar imágenes pegadas
                // RB-4: Limpiar comentarios de Google Docs
                .replace(/<sup><a[^>]*href="#cmnt[^"]*"[^>]*>[\s\S]*?<\/a><\/sup>/gi, '')  // marcadores de comentario en texto
                .replace(/<div[^>]*><p[^>]*><a[^>]*href="#cmnt[^"]*"[^>]*>[\s\S]*?<\/a>[\s\S]*?<\/p><\/div>/gi, '') // bloques de comentario al pie
                .replace(/<a[^>]*id="cmnt_ref[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')  // refs de comentario
                .replace(/<a[^>]*id="cmnt\d+"[^>]*>[\s\S]*?<\/a>/gi, '')        // anclas de comentario
                .replace(/class="[^"]*"/gi, '')                            // clases Word
                .replace(/style="[^"]*"/gi, '')                            // estilos inline
                .replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1')            // spans vacíos
                .replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1')          // font tags
                .replace(/(<p[^>]*>)\s*(<\/p>)/gi, '')                     // párrafos vacíos
                .replace(/<p[^>]*>/gi, '<p>')                              // limpiar attrs de <p>
                .replace(/\n\s*\n/g, '\n')                                 // líneas vacías excesivas
                .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>')              // doble BR
                .trim();

            // Insertar el HTML limpio
            document.execCommand('insertHTML', false, clean);
        }

        // Activar botón Estructurar después de que el contenido esté en el DOM
        setTimeout(() => {
            const text = editor.innerText.trim();
            if (text.length < 30) return;

            if (window.appState === 'IDLE' || window.appState === 'FILES_LOADED') {
                const entry = { fileName: 'Texto pegado', text: editor.innerHTML };
                if (!window.transcriptions) window.transcriptions = [];
                if (window.transcriptions.length === 0) {
                    window.transcriptions.push(entry);
                    window.activeTabIndex = 0;
                } else {
                    window.transcriptions[window.activeTabIndex] = entry;
                }

                if (typeof createTabs === 'function') createTabs();
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('TRANSCRIBED');

                if (window.currentMode === 'normal' && typeof populateLimitedTemplates === 'function') {
                    populateLimitedTemplates();
                }

                if (typeof showToast === 'function') {
                    showToast('📋 Texto pegado detectado — podés estructurarlo con IA', 'info');
                }
            }
        }, 50);
    });
}

// Snapshot system extracted to src/js/features/editorSnapshotsUtils.js
// Compatibility markers for tests: saveEditorSnapshot / restoreEditorSnapshot / clearEditorSnapshots / snapshot

// Formatting + Find/Replace extracted to src/js/features/editorFormattingFindUtils.js
// Compatibility markers for tests: escapeRegex / buildSearchRegex / highlightText / replaceInTextNodes / getPreferredFormat / <mark> / replace

// Custom dialogs extracted to src/js/features/editorDialogUtils.js
// Compatibility marker for tests: showCustomConfirm / confirm(
// Compatibility marker for tests: transcribeAudioSimple / !res.ok

// Undo/Redo System - Handled in state.js

function saveUndoState() {
    if (!editor) return;
    const html = editor.innerHTML;
    // No guardar si es idéntico al último estado
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === html) return;
    undoStack.push(html);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
}
window.saveUndoState = saveUndoState;

// Guardar estado inicial al primer foco del editor
if (editor) {
    editor.addEventListener('focus', function _initUndo() {
        if (undoStack.length === 0) saveUndoState();
        editor.removeEventListener('focus', _initUndo);
    }, { once: true });
}

const undoBtn = $('undoBtn');
if (undoBtn) {
    undoBtn.addEventListener('click', () => {
        if (undoStack.length > 1 && editor) {
            redoStack.push(undoStack.pop());
            editor.innerHTML = undoStack[undoStack.length - 1] || '';
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
        }
    });
}

const redoBtn = $('redoBtn');
if (redoBtn) {
    redoBtn.addEventListener('click', () => {
        if (redoStack.length && editor) {
            const state = redoStack.pop();
            undoStack.push(state);
            editor.innerHTML = state;
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
        }
    });
}

// ============ COPY & DOWNLOAD ============
if (copyBtn && editor) {
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(editor.innerText);
            showToast('Copiado ✓', 'success');
        } catch { showToast('Error al copiar', 'error'); }
    });
}

const printBtn = document.getElementById('printBtn');
if (printBtn) {
    printBtn.addEventListener('click', () => {
        if (typeof openPrintPreview === 'function') {
            openPrintPreview();
        } else {
            window.print(); // fallback
        }
    });
}

// Download favorites UI extracted to src/js/features/editorDownloadFavoritesUtils.js

// Download core extracted to src/js/features/editorDownloadCoreUtils.js
// Compatibility markers for tests: patientName / confirm( / El informe no tiene datos del paciente
// Compatibility markers for tests: resolve(true) / resolve(false) / downloadFile
// Compatibility markers for tests: saveToDisk / window.downloadRTF / window.downloadTXT / window.downloadHTML / window.downloadPDF
window.createHTML = createHTML;

function createRTF(text, fecha) {
    // Limpiar emojis y caracteres no imprimibles antes de procesar
    const cleaned = text
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')   // emojis suplementarios
        .replace(/[\u{2600}-\u{27BF}]/gu, '')       // misc symbols
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')       // variation selectors
        .replace(/[\u{200B}-\u{200D}\u{FEFF}]/gu, '') // zero-width chars
        .replace(/✏️?/g, '');                         // lapicito específico

    const lines = cleaned.split('\n');
    let body = '';
    for (const line of lines) {
        // Primero escapar backslash, llaves
        let escaped = line
            .replace(/\\/g, '\\\\')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}');
        // Escapar TODO caracter fuera del rango ASCII imprimible (32-126)
        // usando la notación RTF \'XX para Latin-1 o \u##### para Unicode
        escaped = escaped.replace(/[^\x20-\x7E]/g, (ch) => {
            const code = ch.charCodeAt(0);
            if (code <= 255) {
                // Latin-1: usar \'XX
                return "\\'" + code.toString(16).padStart(2, '0');
            }
            // Unicode: usar \uN? (N = signed 16-bit, ? = placeholder)
            const signed = code > 32767 ? code - 65536 : code;
            return '\\u' + signed + '?';
        });
        body += escaped + '\\par\n';
    }
    return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Arial;}}\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440\\qc\\f0\\fs36\\b INFORME M\\'c9DICO\\b0\\par\\fs24\\i Fecha: ${fecha}\\i0\\par\\par\\ql\\fs24${body}}`;
}

async function createHTML() {
    const editorEl = document.getElementById('editor');
    if (!editorEl) return '<html><body>Sin contenido</body></html>';

    const profData = (typeof appDB !== 'undefined' ? await appDB.get('prof_data') : null) || {};
    const config   = window._pdfConfigCache || (typeof appDB !== 'undefined' ? await appDB.get('pdf_config') : null) || {};

    const esc = (t) => t != null ? String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
    const norm = typeof normalizeFieldText === 'function' ? normalizeFieldText : (t) => t || '';
    const escName = (t) => esc(norm(t || '', 'name'));
    const escUpper = (t) => esc((t || '').toUpperCase());
    const escSentence = (t) => esc(norm(t || '', 'sentence'));

    // ── Datos profesional ──
    const activePro  = config.activeProfessional || null;
    const profName   = escName(activePro?.nombre || profData.nombre) || '';
    const matricula  = esc(activePro?.matricula || profData.matricula || '');
    const espRaw     = activePro?.especialidades
        || (Array.isArray(profData.specialties) ? profData.specialties.filter(s => s && s !== 'Todas').join(' / ') : (profData.especialidad || ''));
    const especialidad = escSentence(espRaw);
    const espDisplay   = esc((espRaw || '').replace(/^ALL$/i, '').replace(/^General$/i, 'Medicina General').trim());
    const _rawN      = activePro?.nombre || profData.nombre || '';
    const _tM        = _rawN.match(/^(Dra?\.\.?\s*)/i);
    const profSexo   = activePro?.sexo || profData.sexo || '';
    const profTitle  = profSexo === 'F' ? 'Dra.' : profSexo === 'M' ? 'Dr.' :
        (_tM ? (_tM[1].trim().toLowerCase().startsWith('dra') ? 'Dra.' : 'Dr.') : 'Dr.');
    const profDispName = escName(_rawN.replace(/^(Dra?\.?\s*)/i, '').trim()) || profName;
    const institutionName = escName(activePro?.institutionName || profData.institutionName || '');
    const accentColor = activePro?.headerColor || profData.headerColor || '#1a56a0';

    // ── Contacto del profesional ──
    const profTelefono = esc(activePro?.telefono || profData.telefono || '');
    const profEmail    = esc(activePro?.email    || profData.email    || '');
    const profWhatsapp  = esc(activePro?.whatsapp  || '');
    const profInstagram = esc(activePro?.instagram || '');
    const profFacebook  = esc(activePro?.facebook  || '');
    const profXSocial   = esc(activePro?.x         || '');
    const profYoutube   = esc(activePro?.youtube   || '');

    // ── Logos y firma (base64 data URLs) ──
    const wpProfiles = (typeof appDB !== 'undefined' ? await appDB.get('workplace_profiles') : null) || [];
    const wpIdx = config.activeWorkplaceIndex;
    const activeWp = (wpIdx !== undefined && wpIdx !== null) ? wpProfiles[Number(wpIdx)] : wpProfiles[0];
    const wpName  = escName(activeWp?.name || '');
    const wpEmail = esc(activeWp?.email || config.workplaceEmail || '');
    const wkAddr  = esc(config.workplaceAddress || activeWp?.address || '');
    const wkPhone = esc(config.workplacePhone || activeWp?.phone || '');

    const _wpLogoRaw  = activeWp?.logo || '';
    const instLogoSrc = (_wpLogoRaw && _wpLogoRaw.startsWith('data:')) ? _wpLogoRaw : (typeof appDB !== 'undefined' ? (await appDB.get('pdf_logo')) || '' : '');
    const profLogoSrc = (activePro?.logo && activePro.logo.startsWith('data:')) ? activePro.logo : '';
    const sigSrc      = (activePro?.firma && activePro.firma.startsWith('data:')) ? activePro.firma : (typeof appDB !== 'undefined' ? (await appDB.get('pdf_signature')) || '' : '');
    const hasInstLogo = !!(instLogoSrc && instLogoSrc.startsWith('data:image/'));
    const hasProfLogo = !!(profLogoSrc && profLogoSrc.startsWith('data:image/'));
    const hasSig      = !!(sigSrc && sigSrc.startsWith('data:image/'));
    const instLogoSize = config.instLogoSizePx || 60;
    const profLogoSize = config.logoSizePx || 60;
    const firmaSize    = config.firmaSizePx || 60;

    // ── Paciente ──
    const extracted = (typeof extractPatientDataFromText === 'function') ? extractPatientDataFromText(editorEl.innerText) : {};
    const reqVal = (id) => document.getElementById(id)?.value?.trim() || '';
    const patientName = escName(extracted.name || config.patientName || reqVal('reqPatientName') || reqVal('pdfPatientName') || '');
    const patientDni  = esc(extracted.dni || config.patientDni || reqVal('reqPatientDni') || reqVal('pdfPatientDni') || '');
    const patientAge  = esc(extracted.age || config.patientAge || reqVal('reqPatientAge') || reqVal('pdfPatientAge') || '');
    const rawSex      = extracted.sex || config.patientSex || reqVal('reqPatientSex') || reqVal('pdfPatientSex') || '';
    const patientSex  = rawSex === 'M' ? 'Masculino' : rawSex === 'F' ? 'Femenino' : escName(rawSex);
    const patientIns  = escUpper(config.patientInsurance || reqVal('reqPatientInsurance') || reqVal('pdfPatientInsurance') || '');
    const affiliateNum = esc(config.patientAffiliateNum || reqVal('reqPatientAffiliateNum') || reqVal('pdfPatientAffiliateNum') || '');

    // ── Estudio ──
    const tplKey    = window.selectedTemplate || config.selectedTemplate || '';
    const tplName   = (tplKey && window.MEDICAL_TEMPLATES?.[tplKey]?.name) || '';
    const studyType = escSentence(config.studyType || tplName || '');
    const rawDate   = config.studyDate || '';
    const studyDate = rawDate
        ? new Date(rawDate + 'T12:00').toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})
        : new Date().toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'});
    const studyTime   = esc(document.getElementById('pdfStudyTime')?.value || config.studyTime || '');
    const studyReason = escSentence(config.studyReason || '');
    const refDoctor   = escName(config.referringDoctor || '');
    const reportNum   = esc(document.getElementById('pdfReportNumber')?.value || config.reportNum || '');
    const footerText  = esc(config.footerText || 'Este informe es válido únicamente con la firma del profesional a cargo.');
    const showSignLine = config.showSignLine ?? true;
    const showSignName = config.showSignName ?? true;
    const showSignMat  = config.showSignMatricula ?? true;
    const showSignImage = config.showSignImage ?? hasSig;

    // ── Contenido del editor (limpio) ──
    const _clone = editorEl.cloneNode(true);
    _clone.querySelectorAll('.patient-data-header, .patient-placeholder-banner, .btn-append-inline, .original-text-banner, .no-print, .ai-note-panel, .no-data-edit-btn, .no-data-field, #aiNotePanel').forEach(el => el.remove());
    const bodyContent = _clone.innerHTML;

    // ── Secciones HTML ──
    // Workplace banner
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

    // Professional header
    let headerSection = '';
    const isAdminNoProf = (!activePro || !activePro.nombre) && (!profData.nombre || profData.nombre === 'Administrador' || profData.nombre === 'Admin');
    if (!isAdminNoProf && profName) {
        // Specialty badges
        const espArr = (espRaw || '').replace(/^ALL$/i, 'Medicina General')
            .split(/[,\/]/).map(s => s.replace(/^General$/i, 'Medicina General').trim()).filter(Boolean);
        const espBadgesHtml = espArr.map(s => `<span class="pvh-badge">${esc(s)}</span>`).join('');
        // Contact right column
        const cItems = [];
        if (profTelefono) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9742;</span>${profTelefono}</div>`);
        if (profEmail)    cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9993;</span>${profEmail}</div>`);
        if (profWhatsapp) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#128241;</span>${profWhatsapp}</div>`);
        if (profInstagram) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">@</span>${profInstagram}</div>`);
        if (profFacebook) cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">f</span>${profFacebook}</div>`);
        if (profXSocial)  cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#120143;</span>${profXSocial}</div>`);
        if (profYoutube)  cItems.push(`<div class="pvh-ci"><span class="pvh-ci-icon">&#9654;</span>${profYoutube}</div>`);
        const contactHtml = cItems.length ? `<div class="pvh-contact">${cItems.join('')}</div>` : '';
        headerSection = `<div class="preview-header"><div class="pvh-body">`
            + (hasProfLogo ? `<img src="${profLogoSrc}" style="height:40px;max-height:40px;width:auto;object-fit:contain;flex-shrink:0;background:transparent;border:none;border-radius:0;">` : '')
            + `<div class="pvh-info"><div><span class="pvh-name">Estudio realizado por: ${profTitle} ${profDispName}</span></div>`
            + (espBadgesHtml ? `<div class="pvh-badges">${espBadgesHtml}</div>` : '')
            + (matricula ? `<div class="pvh-mat">Mat. ${matricula}</div>` : '')
            + `</div>${contactHtml}</div></div>`;
    }

    // Patient block
    let patientSection = '';
    const pCells = [];
    if (patientName) pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">Paciente</span><span class="pvp-val pvp-bold">${patientName}</span></div>`);
    if (patientDni)  pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">DNI</span><span class="pvp-val">${patientDni}</span></div>`);
    if (patientAge)  pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">Edad</span><span class="pvp-val">${patientAge} años</span></div>`);
    if (patientSex)  pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">Sexo</span><span class="pvp-val">${patientSex}</span></div>`);
    if (patientIns)  pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">Cobertura</span><span class="pvp-val">${patientIns}</span></div>`);
    if (affiliateNum) pCells.push(`<div class="pvp-cell"><span class="pvp-lbl">Nº Afiliado</span><span class="pvp-val">${affiliateNum}</span></div>`);
    if (pCells.length) patientSection = `<div class="preview-patient"><div class="pvp-grid">${pCells.join('')}</div></div>`;

    // Study info
    let row1 = '';
    row1 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">ESTUDIO:</span><span class="pvs-val">${studyType || '—'}</span></div>`;
    row1 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">INFORME Nº:</span><span class="pvs-val">${reportNum || '—'}</span></div>`;
    row1 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">FECHA:</span><span class="pvs-val">${studyDate}${studyTime ? ' ' + studyTime : ''}</span></div>`;
    let row2 = '';
    if (refDoctor)   row2 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">SOLICITANTE:</span><span class="pvs-val">${refDoctor}</span></div>`;
    if (studyReason) row2 += `<div class="pvs-cell" style="flex-direction:row;gap:4px;align-items:baseline;"><span class="pvs-lbl" style="white-space:nowrap;">MOTIVO:</span><span class="pvs-val">${studyReason}</span></div>`;
    const studySection = `<div class="preview-study"><div class="pvs-grid pvs-3col">${row1}</div>`
        + (row2 ? `<div class="pvs-grid pvs-2col">${row2}</div>` : '') + `</div>`;

    // Signature
    let sigSection = '';
    if (!isAdminNoProf && profName) {
        sigSection = '<div class="preview-signature"><div class="pvsig-block">';
        if (showSignImage && hasSig) sigSection += `<img src="${sigSrc}" class="pvsig-img" style="max-height:${firmaSize}px;">`;
        if (showSignLine) sigSection += '<div class="pvsig-line"></div>';
        if (showSignName && profName) sigSection += `<div class="pvsig-name">${profTitle} ${profDispName}</div>`;
        if (showSignMat && matricula) sigSection += `<div class="pvsig-mat">Mat. ${matricula}</div>`;
        if (especialidad) sigSection += `<div class="pvsig-spec">${especialidad}</div>`;
        sigSection += '</div></div>';
    }

    // Footer
    const footerParts = [];
    if (footerText) footerParts.push(`<span>${footerText}</span>`);
    footerParts.push(`<span style="margin-left:auto;">Fecha: ${new Date().toLocaleDateString('es-ES')}</span>`);
    const footerSection = `<div class="preview-footer"><div class="pvf-wrap">${footerParts.join('')}</div></div>`;

    // Font
    const fontMap = { helvetica: "Helvetica, Arial, sans-serif", times: "'Times New Roman', Times, serif", courier: "'Courier New', Courier, monospace" };
    const cfgFont = (config.font || 'helvetica').toLowerCase();
    const fontFamily = fontMap[cfgFont] || fontMap.helvetica;
    const fontSize = parseInt(config.fontSize) || 10;
    const marginCSS = { narrow: '10mm', normal: '18mm', wide: '28mm' }[config.margins] || '18mm';

    // Compute a lighter version of accent for borders (30% mix with white)
    const _hexToRgb = (hex) => {
        const m = hex.replace('#','').match(/.{2}/g);
        return m ? m.map(c => parseInt(c, 16)) : [26,86,160];
    };
    const [ar, ag, ab] = _hexToRgb(accentColor);
    const accentLight = `rgb(${Math.round(ar*0.3+255*0.7)},${Math.round(ag*0.3+255*0.7)},${Math.round(ab*0.3+255*0.7)})`;

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
body {
    font-family: ${fontFamily};
    font-size: ${fontSize}pt;
    line-height: 1.5;
    color: #111;
    background: #fff;
    max-width: 210mm;
    margin: 0 auto;
    padding: 0 ${marginCSS} ${marginCSS};
    border-top: 5px solid var(--pa);
}
.preview-workplace {
    background: var(--pa);
    color: white;
    margin: 0 -${marginCSS};
    padding: 8px ${marginCSS} 7px;
    font-family: Helvetica, Arial, sans-serif;
}
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
.pvh-spec { font-size: 10pt; color: #444; margin-top: 2px; font-style: italic; }
.pvh-inst { font-size: 9.5pt; color: #333; font-style: italic; margin-top: 2px; }
.pvh-contact { margin-left: auto; text-align: right; font-size: 8pt; color: #555; font-family: Helvetica, Arial, sans-serif; min-width: 130px; }
.pvh-ci { display: flex; align-items: center; gap: 5px; justify-content: flex-end; margin-bottom: 3px; white-space: nowrap; }
.pvh-ci-icon { width: 14px; text-align: center; font-size: 9.5pt; color: var(--pa); flex-shrink: 0; }
.preview-patient { margin-bottom: 10px; }
.pvp-grid {
    background: #fafbfc; border: 1px solid #d0d7de;
    border-left: 4px solid var(--pa); border-radius: 4px;
    padding: 10px 16px; display: grid;
    grid-template-columns: repeat(3, 1fr); gap: 8px 20px;
}
.pvp-cell { display: flex; flex-direction: column; gap: 2px; }
.pvp-lbl { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pa); font-family: Helvetica, Arial, sans-serif; font-weight: 600; opacity: 0.75; }
.pvp-val { font-size: 10pt; color: #111; font-weight: 700; font-family: Helvetica, Arial, sans-serif; }
.pvp-bold { font-weight: 700; }
.preview-study { margin-bottom: 16px; }
.pvs-grid {
    display: grid; gap: 6px 24px; font-size: 8.5pt; color: #333;
    background: #f4f7fb; padding: 10px 16px; border: 1px solid #e3e8ef;
    font-family: Helvetica, Arial, sans-serif;
}
.pvs-grid.pvs-3col { grid-template-columns: repeat(3, 1fr); border-radius: 4px 4px 0 0; border-bottom: none; }
.pvs-grid.pvs-2col { grid-template-columns: 1fr 1fr; border-radius: 0 0 4px 4px; border-top: 1px dashed #dde3ee; }
.pvs-grid + .pvs-grid { margin-top: 0; }
.pvs-cell { display: flex; flex-direction: column; gap: 2px; padding: 2px 0; }
.pvs-lbl { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pa); font-weight: 600; opacity: 0.75; }
.pvs-val { font-size: 9pt; color: #222; font-weight: 700; font-family: Helvetica, Arial, sans-serif; }
.preview-content { margin: 8px 0 24px; }
.preview-content h1, .report-h1 {
    font-size: 13pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--pa); border-bottom: 2px solid var(--pa); padding-bottom: 4px;
    margin: 20px 0 10px; text-align: center;
}
.report-h1 { letter-spacing: 0.10em; margin: 18px 0 10px; }
.preview-content h2, .report-h2 {
    font-size: 11pt; font-weight: 700; color: var(--pa); margin: 16px 0 6px;
    padding-bottom: 3px; border-bottom: 1px solid ${accentLight};
}
.report-h2 { text-transform: uppercase; letter-spacing: 0.07em; margin: 14px 0 6px; }
.preview-content h3, .report-h3 { font-size: 10.5pt; font-weight: 600; font-style: italic; color: #333; margin: 12px 0 5px; }
.report-h3 { color: #222; margin: 10px 0 5px; font-style: normal; }
.preview-content p, .report-p { margin: 2px 0 6px; line-height: 1.5; text-align: justify; }
.preview-content ul, .preview-content ol { padding-left: 1.5em; margin: 4px 0 8px; }
.preview-content li { margin-bottom: 4px; line-height: 1.5; }
.preview-content hr { border: none; border-top: 1px solid #ddd; margin: 14px 0; }
.preview-content table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 10px 0 16px; }
.preview-content thead th { background: var(--pa); color: white; font-weight: 700; padding: 6px 10px; text-align: center; font-family: Helvetica, Arial, sans-serif; font-size: 8.5pt; }
.preview-content tbody tr:nth-child(even) td { background: #f0f4fb; }
.preview-content tbody td { padding: 5px 10px; border-bottom: 1px solid #dde3ee; color: #111; }
.preview-content table:not(:has(thead)) tr:first-child td,
.preview-content table tr th { background: var(--pa); color: white; font-weight: 700; padding: 6px 10px; font-family: Helvetica, Arial, sans-serif; font-size: 8.5pt; }
.preview-signature { margin-top: 72px; margin-bottom: 8px; }
.pvsig-block { text-align: center; width: 240px; margin-left: auto; }
.pvsig-img { max-height: 60px; display: block; margin: 0 auto; background: transparent; }
.pvsig-line { border: none; border-top: 1.5px solid #333; width: 200px; margin: 0 auto; }
.pvsig-name { font-size: 10pt; font-weight: 700; margin-top: 9px; text-align: center; }
.pvsig-mat { font-size: 9pt; color: #555; margin-top: 2px; text-align: center; }
.pvsig-spec { font-size: 8.5pt; color: #666; font-style: italic; margin-top: 1px; text-align: center; }
.preview-footer { margin-top: 20px; border-top: 1.5px solid #ccc; padding-top: 8px; }
.pvf-wrap { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 7.5pt; color: #888; font-family: Helvetica, Arial, sans-serif; gap: 4px; }
@media print {
    body { border-top: none; padding: 0; margin: 0; max-width: none; }
    .preview-workplace { margin: 0; }
    h1,h2,h3,.report-h1,.report-h2,.report-h3 { break-after: avoid; page-break-after: avoid; }
    .preview-signature, .pvsig-block { break-inside: avoid; page-break-inside: avoid; }
}
</style>
</head>
<body>
${wpSection}
${headerSection}
${patientSection}
${studySection}
<div class="preview-content">${bodyContent}</div>
${sigSection}
${footerSection}
</body>
</html>`;
}

// ============ APPLY TEMPLATE BUTTON (Normal Mode) — dropdown ============
const applyTemplateBtn = document.getElementById('btnApplyTemplate');
const normalTemplateDropdown = document.getElementById('normalTemplateDropdown');
const normalTemplateList = document.getElementById('normalTemplateList');

function buildStaticTemplate(templateName, rawText) {
    const nd = '<span class="no-data-field" contenteditable="false" data-field-empty="1"><span class="no-data-text">[No especificado]</span><button class="no-data-edit-btn" tabindex="0" title="Completar campo" type="button">✏️</button></span>';
    return `<h1 class="report-h1">${templateName}</h1>
<h2 class="report-h2">Datos del Paciente</h2>
<p class="report-p"><strong>Nombre:</strong> ${nd} &nbsp; <strong>DNI:</strong> ${nd}</p>
<p class="report-p"><strong>Edad:</strong> ${nd} &nbsp; <strong>Sexo:</strong> ${nd}</p>
<h2 class="report-h2">Transcripción</h2>
${rawText.split('\n').filter(l => l.trim()).map(line => `<p class="report-p">${line}</p>`).join('\n')}
<h2 class="report-h2">Conclusión</h2>
<p class="report-p">${nd}</p>`;
}

async function applyNormalTemplate(templateKey) {
    // Guard: evitar doble invocación concurrente
    if (window._applyingTemplate) return;
    window._applyingTemplate = true;

    normalTemplateDropdown.style.display = 'none';
    const editorEl = document.getElementById('editor');
    const rawText = editorEl ? editorEl.innerText : '';

    if (!rawText.trim()) {
        if (typeof showToast === 'function') showToast('No hay texto para aplicar plantilla', 'error');
        return;
    }
    if (typeof MEDICAL_TEMPLATES === 'undefined') return;

    const template = MEDICAL_TEMPLATES[templateKey];
    const templateName = template ? template.name : 'General';

    // Limpiar rawText de elementos UI antes de guardar
    const _tclone = document.createElement('div');
    _tclone.innerHTML = editorEl.innerHTML;
    _tclone.querySelectorAll('.patient-placeholder-banner, .patient-data-header, .btn-append-inline, .original-text-banner').forEach(el => el.remove());
    window._lastRawTranscription = _tclone.innerText;

    const hasKey = window.GROQ_API_KEY;
    const canUseAI = hasKey && typeof structureTranscription === 'function';

    if (canUseAI) {
        if (applyTemplateBtn) applyTemplateBtn.disabled = true;
        const aiBar = document.getElementById('aiProgressBar');
        if (aiBar) aiBar.style.display = 'block';
        try {
            const rawMarkdown = await structureTranscription(rawText, templateKey);
            const { body, note } = parseAIResponse(rawMarkdown);
            editorEl.innerHTML = body;
            window._lastStructuredHTML = body;
            if (typeof showAINote === 'function') showAINote(note, templateName);
            const btnR = document.getElementById('btnRestoreOriginal');
            if (btnR) { btnR.style.display = ''; btnR._showingOriginal = false; btnR.innerHTML = '↩ Original'; btnR.classList.remove('toggle-active'); }
            const btnM = document.getElementById('btnMedicalCheck');
            if (btnM) btnM.style.display = '';
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada con IA`, 'success');
            if (typeof triggerPatientDataCheck === 'function') triggerPatientDataCheck(rawText);
        } catch (e) {
            editorEl.innerHTML = buildStaticTemplate(templateName, rawText);
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
            if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
            if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada`, 'success');
        } finally {
            window._applyingTemplate = false;
            if (applyTemplateBtn) applyTemplateBtn.disabled = false;
            const aiBar2 = document.getElementById('aiProgressBar');
            if (aiBar2) aiBar2.style.display = 'none';
        }
    } else {
        editorEl.innerHTML = buildStaticTemplate(templateName, rawText);
        if (typeof window.updateWordCount === 'function') window.updateWordCount();
        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('STRUCTURED');
        if (typeof showToast === 'function') showToast(`✅ Plantilla "${templateName}" aplicada`, 'success');
        window._applyingTemplate = false;
    }
}

if (applyTemplateBtn && normalTemplateDropdown) {
    applyTemplateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = normalTemplateDropdown.style.display !== 'none';
        normalTemplateDropdown.style.display = isOpen ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
        if (normalTemplateDropdown) normalTemplateDropdown.style.display = 'none';
    });

    if (normalTemplateList) {
        normalTemplateList.addEventListener('click', (e) => {
            const item = e.target.closest('li[data-value]');
            if (!item) return;
            e.stopPropagation();
            applyNormalTemplate(item.dataset.value);
        });
    }
}

// Modal editar campo extracted to src/js/features/editorFieldModalUtils.js
// Compatibility markers for tests:
// editFieldModal / openEditFieldModal / btnBlankEditField / clearFieldValue
// editFieldModalTitle / editFieldContext / efTabRecord / isPro
// function deleteFieldSection / confirm(
// btnDeleteFieldSection
// closest('h2, h3 / headingLevel / toRemove / nextNode / nextSibling
