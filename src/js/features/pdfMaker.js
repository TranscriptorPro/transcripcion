// ============ PDF MAKER (jsPDF + jsPDF-AutoTable) ============
// Recibe htmlContent (editor.innerHTML) para preservar H1/H2/H3/tablas/negritas

// Helper fuera de la función principal para ser reutilizable
function _hexToRgb(hex) {
    if (!hex || !hex.startsWith('#')) return { r: 26, g: 86, b: 160 };
    let h = hex.replace('#', '');
    // Soporte para hex corto (#FFF → FFFFFF)
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

        // ── Datos de configuración (leer ANTES de crear el doc) ──────
        const profData  = (typeof safeJSONParse === 'function') ? await safeJSONParse('prof_data', {}) : (await appDB.get('prof_data')) || {};
        const config    = (typeof safeJSONParse === 'function') ? await safeJSONParse('pdf_config', {}) : (await appDB.get('pdf_config')) || {};
        const activePro = config.activeProfessional || null;

        // ── Crear documento con formato/orientación del usuario ──────
        const pgSize = (config.pageSize || 'a4').toLowerCase();
        const orient = (config.orientation || 'portrait').toLowerCase();
        const doc = new jsPDF({ unit: 'mm', format: pgSize, orientation: orient });

        const PAGE_W = doc.internal.pageSize.getWidth();
        const PAGE_H = doc.internal.pageSize.getHeight();

        // ── Márgenes configurables ───────────────────────────────────
        const marginMap = { narrow: 10, normal: 20, wide: 30 };
        const ML       = marginMap[config.margins] || 20;
        const MR       = marginMap[config.margins] || 20;
        const MT       = marginMap[config.margins] || 20; // margen superior
        const CW       = PAGE_W - ML - MR;
        const FOOTER_Y = PAGE_H - 12;

        // ── Fuente y tamaño configurables ────────────────────────────
        const mainFont     = config.font || 'helvetica';
        const mainFontSize = parseInt(config.fontSize) || 10;
        const mainLineH    = mainFontSize * 0.5;

        // ── Flags de visibilidad ─────────────────────────────────────
        const cfgShowHeader  = config.showHeader  !== false;
        const cfgShowFooter  = config.showFooter  !== false;
        const cfgShowPageNum = config.showPageNum !== false;
        const cfgShowDate    = config.showDate    === true;

        // Datos del lugar de trabajo (con fallback al workplace activo)
        const wpProfiles = (await appDB.get('workplace_profiles')) || [];
        const wpIdx = config.activeWorkplaceIndex;
        const activeWp = (wpIdx !== undefined && wpIdx !== null) ? wpProfiles[Number(wpIdx)] : wpProfiles[0];

        // Logo institucional: del workplace o fallback global pdf_logo
        const wpLogo = activeWp?.logo || '';
        const instLogoB64 = (wpLogo && wpLogo.startsWith('data:'))
            ? wpLogo : ((await appDB.get('pdf_logo')) || '');
        // Logo del profesional: del profesional activo
        let profLogoB64 = (activePro?.logo && activePro.logo.startsWith('data:'))
            ? activePro.logo : '';
        // Firma del profesional
        let sigB64  = (activePro?.firma && activePro.firma.startsWith('data:'))
            ? activePro.firma : ((await appDB.get('pdf_signature')) || '');

        // A3: Plan NORMAL/TRIAL no incluye logo profesional ni firma digital
        const isPro = typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.hasProMode;
        if (typeof CLIENT_CONFIG !== 'undefined' && !isPro) {
            profLogoB64 = '';
            sigB64 = '';
        }

        // Compatibilidad: si no hay logo institucional pero sí logo genérico, usarlo
        const logoB64 = instLogoB64 || profLogoB64;

        // Datos del profesional: activo sobreescribe prof_data
        const profName     = activePro?.nombre         || profData.nombre      || '';
        const matricula    = activePro?.matricula      || profData.matricula   || '';
        // especialidad puede ser Array → convertir a string
        const rawEsp       = activePro?.especialidades || profData.specialties || profData.especialidades || '';
        const especialidad = Array.isArray(rawEsp)
            ? rawEsp.filter(e => e && e !== 'Todas').join(' / ')
            : (rawEsp || '');
        const institutionName = activePro?.institutionName || profData.institutionName || '';
        const accent       = _hexToRgb(activePro?.headerColor || profData.headerColor || '#1a56a0');
        const wpAddress = config.workplaceAddress || activeWp?.address || '';
        const wpPhone   = config.workplacePhone   || activeWp?.phone   || '';
        const wpName    = activeWp?.name || '';
        const wpEmail   = activeWp?.email || config.workplaceEmail || '';

        const pName      = config.patientName      || '';
        const pDni       = config.patientDni       || '';
        const pAge       = config.patientAge       ? `${config.patientAge} años` : '';
        const pSex       = config.patientSex       || '';
        const pInsurance = config.patientInsurance || '';
        const pAffiliateNum = config.patientAffiliateNum || '';
        const rawDate    = config.studyDate        || '';
        const pDate      = rawDate
            ? new Date(rawDate + 'T12:00').toLocaleDateString('es-ES')
            : fecha;
        const studyTime   = config.studyTime         || '';
        const tplKey      = config.selectedTemplate || '';
        const tplNameFb   = (tplKey && typeof MEDICAL_TEMPLATES !== 'undefined' && MEDICAL_TEMPLATES[tplKey]?.name) || '';
        const studyType   = config.studyType || tplNameFb || '';
        const reportNum   = config.reportNum         || '';
        const refDoctor   = config.referringDoctor   || '';
        const studyReason = config.studyReason       || '';
        const footerText  = config.footerText        || '';
        const showSignLine = config.showSignLine !== false;
        const showSignName = config.showSignName !== false;
        const showSignMat  = config.showSignMatricula !== false;

        let cy      = 10;
        let pageNum = 1;
        let headerH = 10;  // se actualiza tras dibujar el encabezado

        // ── Color helpers ────────────────────────────────────────────
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

        // ── Asegurar espacio o saltar de página ──────────────────────
        function ensureSpace(needed) {
            if (cy + needed > FOOTER_Y - 10) {
                doc.addPage();
                pageNum++;
                if (cfgShowFooter || cfgShowPageNum) drawFooter(pageNum);
                drawWorkplaceBanner();  // solo banner del lugar se repite
                // cy ya queda posicionado después del banner
            }
        }

        // ── Pie de página ─────────────────────────────────────────────
        function drawFooter(num) {
            if (!cfgShowFooter && !cfgShowPageNum) return;
            // Línea separadora superior
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
            if (leftParts.length) {
                doc.text(leftParts.join('  '), ML, FOOTER_Y);
            }
            if (cfgShowPageNum) {
                doc.text(`Página ${num}`, PAGE_W - MR, FOOTER_Y, { align: 'right' });
            }
            setBlack();
        }

        // ── Banner de lugar de trabajo (se repite en cada página) ─────
        function drawWorkplaceBanner() {
            if (!cfgShowHeader) { cy = 10; return; }
            const hasWpData = wpName || wpAddress || wpPhone || wpEmail;
            if (!hasWpData && !instLogoB64) { cy = 10; return; }

            // Rectángulo de color de fondo (match: .preview-workplace → padding 8px/7px)
            const bannerH = 16;
            doc.setFillColor(accent.r, accent.g, accent.b);
            doc.rect(0, 0, PAGE_W, bannerH, 'F');

            let contentX = ML;
            // Logo institucional (match: .pvw-logo → max-height:48px ≈ 12.7mm)
            if (instLogoB64) {
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

            // Texto del lugar (match: .pvw-name 11pt bold uppercase + .pvw-details 8pt)
            doc.setTextColor(255, 255, 255);
            if (wpName) {
                doc.setFontSize(11);
                doc.setFont(mainFont, 'bold');
                doc.text(wpName.toUpperCase(), contentX, 7);
            }
            const wpDetails = [wpAddress, wpPhone ? 'Tel: ' + wpPhone : '', wpEmail].filter(Boolean);
            if (wpDetails.length) {
                doc.setFontSize(8);
                doc.setFont(mainFont, 'normal');
                doc.text(wpDetails.join(' • '), contentX, 12);
            }
            setBlack();
            cy = bannerH + 4;
        }

        // ── Encabezado profesional (solo página 1) ───────────────────
        function drawHeader() {
            if (!cfgShowHeader) { headerH = cy; return; }
            let infoX = ML;

            // Logo/foto del profesional (match: .pvh-logo → max-height:68px ≈ 18mm)
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

            // (match: .pvh-name 14pt bold accent)
            let iy = cy + 5;
            if (profName) {
                doc.setFontSize(14);
                doc.setFont(mainFont, 'bold');
                setAccent();
                doc.text('Estudio realizado por: ' + profName, infoX, iy);
                iy += 5.5;
            }
            // (match: .pvh-spec 10pt italic #444)
            const specMatParts = [];
            if (especialidad) specMatParts.push(especialidad);
            if (matricula) specMatParts.push('Mat. ' + matricula);
            if (specMatParts.length) {
                doc.setFontSize(10);
                doc.setFont(mainFont, 'italic');
                setGray(68); // #444
                doc.text(specMatParts.join(' • '), infoX, iy);
                iy += 4.5;
            }
            // (match: .pvh-inst 9.5pt italic #333)
            if (institutionName) {
                doc.setFontSize(9.5);
                doc.setFont(mainFont, 'italic');
                setGray(51); // #333
                doc.text(institutionName, infoX, iy);
                iy += 4;
            }

            cy = Math.max(iy, profLogoB64 ? cy + 20 : iy) + 3;
            // (match: .preview-header border-bottom 2px solid accent)
            doc.setDrawColor(accent.r, accent.g, accent.b);
            doc.setLineWidth(0.6);
            doc.line(ML, cy, PAGE_W - MR, cy);
            doc.setDrawColor(0);
            cy += 5;
            headerH = cy;
            setBlack();
        }

        // ── Datos del estudio (match: .pvs-grid con 2 filas) ─────────
        function drawStudyInfo() {
            const row1 = [];
            row1.push({ label: 'ESTUDIO:', value: studyType || '—' });
            row1.push({ label: 'INFORME Nº:', value: reportNum || '—' });
            row1.push({ label: 'FECHA:', value: `${pDate}${studyTime ? ' ' + studyTime : ''}` });

            const row2 = [];
            if (refDoctor)   row2.push({ label: 'SOLICITANTE:', value: refDoctor });
            if (studyReason) row2.push({ label: 'MOTIVO:', value: studyReason });

            const padX = 4.2, padY = 2.6;
            const rowH = 5.5;
            const innerW = CW - 2 * padX;
            let boxH = padY * 2 + rowH;
            if (row2.length) boxH += 1 + rowH;

            ensureSpace(boxH + 4);

            // Fondo (match: .pvs-grid bg:#f4f7fb border:#e3e8ef)
            doc.setFillColor(244, 247, 251);
            doc.setDrawColor(227, 232, 239);
            doc.setLineWidth(0.25);
            doc.roundedRect(ML, cy, CW, boxH, 1.2, 1.2, 'FD');

            // Fila 1: 3 columnas (match: .pvs-3col)
            const col3W = innerW / 3;
            let ry = cy + padY + 3.5;
            for (let i = 0; i < row1.length; i++) {
                const cx = ML + padX + i * col3W;
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(accent.r, accent.g, accent.b);
                doc.text(row1[i].label, cx, ry);
                const lblW = doc.getTextWidth(row1[i].label);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(34, 34, 34);
                doc.text(row1[i].value, cx + lblW + 1.5, ry);
            }

            // Fila 2 con separador punteado (match: .pvs-2col + border-top dashed)
            if (row2.length) {
                const sepY = cy + padY + rowH + 0.5;
                doc.setDrawColor(221, 227, 238);
                doc.setLineWidth(0.2);
                // Línea punteada manual
                let dx = ML + padX;
                const endX = ML + CW - padX;
                while (dx < endX) {
                    const segEnd = Math.min(dx + 1.5, endX);
                    doc.line(dx, sepY, segEnd, sepY);
                    dx += 3;
                }
                const col2W = innerW / row2.length;
                ry = sepY + rowH - 0.5;
                for (let i = 0; i < row2.length; i++) {
                    const cx = ML + padX + i * col2W;
                    doc.setFontSize(6.5);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(accent.r, accent.g, accent.b);
                    doc.text(row2[i].label, cx, ry);
                    const lblW = doc.getTextWidth(row2[i].label);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(34, 34, 34);
                    doc.text(row2[i].value, cx + lblW + 1.5, ry);
                }
            }

            doc.setDrawColor(0);
            cy += boxH + 4;
            setBlack();
        }

        // ── Datos del paciente (match: .pvp-grid 3 columnas) ─────────
        function drawPatientBlock() {
            // Distribuir datos en 3 columnas × 2 filas
            const col1 = [], col2 = [], col3 = [];
            if (pName)        col1.push({ label: 'PACIENTE', value: pName });
            if (pSex)         col1.push({ label: 'SEXO', value: pSex });
            if (pDni)         col2.push({ label: 'DNI', value: pDni });
            if (pInsurance)   col2.push({ label: 'COBERTURA', value: pInsurance });
            if (pAge)         col3.push({ label: 'EDAD', value: pAge });
            if (pAffiliateNum)col3.push({ label: 'Nº AFILIADO', value: pAffiliateNum });

            if (!col1.length && !col2.length && !col3.length) return;

            const padX = 4.2, padY = 3;
            const groupH = 7;
            const groupGap = 3;
            const maxGroups = Math.max(col1.length, col2.length, col3.length);
            const boxH = padY * 2 + maxGroups * groupH + Math.max(0, maxGroups - 1) * groupGap;
            const accentBorderW = 1.2; // 4px

            ensureSpace(boxH + 4);

            // Fondo (match: .pvp-grid bg:#fafbfc border:#d0d7de border-left:4px accent)
            doc.setFillColor(250, 251, 252);
            doc.setDrawColor(208, 215, 222);
            doc.setLineWidth(0.25);
            doc.roundedRect(ML, cy, CW, boxH, 1.2, 1.2, 'FD');
            // Borde izquierdo accent
            doc.setFillColor(accent.r, accent.g, accent.b);
            doc.rect(ML, cy, accentBorderW, boxH, 'F');

            // Dibujar columnas
            const innerW = CW - 2 * padX;
            const colW = innerW / 3;
            const columns = [col1, col2, col3];

            for (let c = 0; c < 3; c++) {
                const col = columns[c];
                const cx = ML + padX + c * colW;
                let gy = cy + padY;
                for (let g = 0; g < col.length; g++) {
                    // Label (match: .pvp-lbl 6.5pt uppercase accent)
                    doc.setFontSize(6.5);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(accent.r, accent.g, accent.b);
                    doc.text(col[g].label, cx, gy + 3);
                    // Value (match: .pvp-val 10pt bold #111)
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(17, 17, 17);
                    doc.text(col[g].value, cx, gy + 7);
                    gy += groupH + groupGap;
                }
            }

            doc.setDrawColor(0);
            cy += boxH + 4;
            setBlack();
        }

        // ── Renderizado del contenido HTML ───────────────────────────
        function renderNode(node) {
            if (!node) return;
            if (node.nodeType === Node.TEXT_NODE) return; // bloques de texto sueltos los ignora
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            const tag = node.tagName.toLowerCase();

            // Saltar elementos de UI
            if (['script', 'style', 'button', 'input', 'select', 'textarea'].includes(tag)) return;
            if (node.classList.contains('no-print')                  ) return;
            if (node.classList.contains('ai-note-panel')             ) return;
            if (node.classList.contains('no-data-edit-btn')          ) return;
            if (node.classList.contains('patient-data-header')       ) return;
            if (node.classList.contains('patient-placeholder-banner')) return;
            if (node.classList.contains('btn-append-inline')         ) return;
            if (node.classList.contains('original-text-banner')      ) return;
            if (node.classList.contains('no-data-field')             ) return;
            if (node.id === 'aiNotePanel'                            ) return;

            // ── H1: título de sección grande, centrado (match: h1 13pt bold uppercase accent, border-bottom 2px) ──
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

            // ── H2: subtítulo (match: h2 11pt bold uppercase accent, border-bottom 1px accent 30%) ──
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

            // ── H3: encabezado terciario (match: h3 10.5pt semibold italic #333) ──
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

            // ── HR: separador ─────────────────────────────────────────
            if (tag === 'hr') {
                ensureSpace(6);
                cy += 2;
                grayLine(cy);
                cy += 4;
                return;
            }

            // ── BR: salto de línea ────────────────────────────────────
            if (tag === 'br') {
                cy += 3;
                return;
            }

            // ── TABLE: tabla real con autoTable ───────────────────────
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
                    // Fallback texto plano
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

            // ── UL / OL: listas ───────────────────────────────────────
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

            // ── P / DIV: párrafo de texto ─────────────────────────────
            if (tag === 'p' || tag === 'div') {
                const txt = node.textContent.trim();
                if (!txt) { cy += 2; return; }

                // ── Etapa 6: s/p en gris discreto ─────────────────────
                const isSP = /^\s*s\/p\.?\s*$/i.test(txt)
                    || /^\s*sin particularidades\.?\s*$/i.test(txt)
                    || /^\s*sin hallazgos\b/i.test(txt)
                    || /^\s*dentro de (lo|par[aá]metros?) normal/i.test(txt)
                    || /^\s*normal\.?\s*$/i.test(txt);

                // Verificar si hay formatos mixtos
                const hasBold   = node.querySelector('strong, b') !== null;
                const hasItalic = node.querySelector('em, i') !== null;

                if (!hasBold && !hasItalic) {
                    // Texto plano → splitTextToSize para wrapping correcto
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
                    // Texto con bold/italic inline → segmentos
                    renderInlineParagraph(node);
                }
                return;
            }

            // ── Contenedores genéricos → recursión ───────────────────
            for (const child of node.childNodes) {
                renderNode(child);
            }
        }

        // ── Renderizado de párrafo con bold/italic inline ────────────
        function renderInlineParagraph(node) {
            const LINE_H   = mainLineH;
            const FONT_SZ  = mainFontSize;
            const MAX_W    = CW;
            doc.setFontSize(FONT_SZ);

            // Construir lista de segmentos {text, bold, italic}
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

                // Dividir en palabras preservando espacios
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

        // ── Bloque de firma (match: .pvsig-block width:240px=63mm, right-aligned) ──
        function drawSignature() {
            cy += 18;
            ensureSpace(45);

            // (match: .pvsig-block margin-left:auto → right-aligned, width 63mm)
            const sigBlockW = 63;
            const sigLineW  = 53; // 200px ≈ 53mm
            const sigStartX = PAGE_W - MR - sigBlockW;
            const sigCenterX = sigStartX + sigBlockW / 2;
            const lineX     = sigCenterX - sigLineW / 2;

            // Imagen de firma (match: .pvsig-img max-height:60px ≈ 16mm)
            if (sigB64) {
                try {
                    const imgType = sigB64.includes('data:image/png') ? 'PNG' : 'JPEG';
                    const b64data = sigB64.includes(',') ? sigB64.split(',')[1] : sigB64;
                    doc.addImage(b64data, imgType, sigCenterX - 20, cy, 40, 16);
                    cy += 16;
                } catch (e) { /* imagen inválida */ }
            }
            // Línea de firma (match: .pvsig-line 1.5px solid #333)
            if (showSignLine) {
                doc.setDrawColor(51, 51, 51);
                doc.setLineWidth(0.4);
                doc.line(lineX, cy, lineX + sigLineW, cy);
                doc.setDrawColor(0);
                cy += 3;
            }
            // Nombre (match: .pvsig-name 10pt bold)
            if (showSignName && profName) {
                doc.setFontSize(10);
                doc.setFont(mainFont, 'bold');
                setBlack();
                doc.text(profName, sigCenterX, cy, { align: 'center' });
                cy += 4;
            }
            // Matrícula (match: .pvsig-mat 9pt #555)
            if (showSignMat && matricula) {
                doc.setFontSize(9);
                doc.setFont(mainFont, 'normal');
                setGray(85); // #555
                doc.text('Mat. ' + matricula, sigCenterX, cy, { align: 'center' });
                cy += 3.5;
            }
            // Especialidad (match: .pvsig-spec 8.5pt italic #666)
            if (especialidad) {
                doc.setFontSize(8.5);
                doc.setFont(mainFont, 'italic');
                setGray(102); // #666
                doc.text(especialidad, sigCenterX, cy, { align: 'center' });
            }
            setBlack();
        }

        // ── ¡Ejecutar todo! ───────────────────────────────────────────
        drawWorkplaceBanner();
        drawHeader();
        if (cfgShowFooter || cfgShowPageNum) drawFooter(1);
        drawStudyInfo();
        drawPatientBlock();

        // Parsear y renderizar el contenido HTML del editor
        const parser    = new DOMParser();
        const parsedDoc = parser.parseFromString(htmlContent || '', 'text/html');
        for (const child of parsedDoc.body.childNodes) {
            renderNode(child);
        }

        drawSignature();

        // ── Etapa 6: QR de verificación centrado (match: .preview-qr text-align:center) ──
        const cfgShowQR = config.showQR ?? false;
        if (cfgShowQR && typeof generateQRCode === 'function') {
            try {
                const qrParts = [
                    'TPRO-VERIFY',
                    `ID:${reportNum || 'TPRO-' + Date.now()}`,
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

        // ── Descarga (File System Access API o fallback) ─────────────
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

        // ── Guardar informe en historial (solo si no es re-exportación) ──
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
