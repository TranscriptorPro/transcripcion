// ============ PDF MAKER (jsPDF + jsPDF-AutoTable) ============
// Recibe htmlContent (editor.innerHTML) para preservar H1/H2/H3/tablas/negritas

// Helper fuera de la función principal para ser reutilizable
function _hexToRgb(hex) {
    if (!hex || !hex.startsWith('#')) return { r: 26, g: 86, b: 160 };
    const h = hex.replace('#', '');
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
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        // ── Datos de configuración ───────────────────────────────────
        const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
        const config   = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        const logoB64  = localStorage.getItem('pdf_logo')      || '';
        const sigB64   = localStorage.getItem('pdf_signature') || '';

        const profName     = profData.nombre      || '';
        const matricula    = profData.matricula   || '';
        const especialidad = profData.specialties || profData.especialidades || '';
        const institutionName = profData.institutionName || '';
        const accent       = _hexToRgb(profData.headerColor || '#1a56a0');

        const pName      = config.patientName      || '';
        const pDni       = config.patientDni       || '';
        const pAge       = config.patientAge       ? `${config.patientAge} años` : '';
        const pSex       = config.patientSex       || '';
        const pInsurance = config.patientInsurance || '';
        const rawDate    = config.studyDate        || '';
        const pDate      = rawDate
            ? new Date(rawDate + 'T12:00').toLocaleDateString('es-ES')
            : fecha;
        const studyType   = config.studyType         || '';
        const refDoctor   = config.referringDoctor   || '';
        const studyReason = config.studyReason       || '';
        const footerText  = config.footerText        || '';
        const showSignLine = config.showSignLine !== false;
        const showSignName = config.showSignName !== false;
        const showSignMat  = config.showSignMatricula !== false;

        // ── Constantes de layout ─────────────────────────────────────
        const PAGE_W    = 210;
        const PAGE_H    = 297;
        const ML        = 20;   // margen izquierdo
        const MR        = 20;   // margen derecho
        const CW        = PAGE_W - ML - MR;  // ancho de contenido
        const FOOTER_Y  = 285;

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
                drawFooter(pageNum);
                cy = headerH;
            }
        }

        // ── Pie de página ─────────────────────────────────────────────
        function drawFooter(num) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            setGray(120);
            const parts = [];
            if (footerText) parts.push(footerText);
            parts.push(`Página ${num}`);
            doc.text(parts.join('  •  '), PAGE_W / 2, FOOTER_Y, { align: 'center' });
            setBlack();
        }

        // ── Encabezado (solo página 1) ───────────────────────────────
        function drawHeader() {
            cy = 10;
            let infoX = ML;

            // Logo (izquierda)
            if (logoB64) {
                try {
                    const imgW = 28, imgH = 18;
                    // Detectar tipo de imagen por cabecera base64
                    const imgType = logoB64.includes('data:image/png') ? 'PNG' : 'JPEG';
                    const b64data = logoB64.includes(',') ? logoB64.split(',')[1] : logoB64;
                    doc.addImage(b64data, imgType, ML, cy, imgW, imgH);
                    infoX = ML + imgW + 6;
                } catch (e) {
                    infoX = ML;
                }
            }

            // Nombre del profesional
            let iy = cy + 5;
            if (profName) {
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text(profName, infoX, iy);
                iy += 5;
            }
            if (especialidad) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                setGray(70);
                doc.text(especialidad, infoX, iy);
                iy += 4;
            }
            if (institutionName) {
                doc.setFontSize(8.5);
                setGray(80);
                doc.text(institutionName, infoX, iy);
                iy += 4;
            }
            if (matricula) {
                doc.setFontSize(8);
                setGray(100);
                doc.text('Mat. Prof.: ' + matricula, infoX, iy);
                iy += 4;
            }

            cy = Math.max(iy, logoB64 ? cy + 20 : iy) + 2;
            accentLine(cy);
            cy += 4;
            headerH = cy;
            setBlack();
        }

        // ── Datos del estudio ────────────────────────────────────────
        function drawStudyInfo() {
            const items = [];
            if (studyType)   items.push(`Estudio: ${studyType}`);
            items.push(`Fecha: ${pDate}`);
            if (refDoctor)   items.push(`Solicitante: ${refDoctor}`);
            if (studyReason) items.push(`Motivo: ${studyReason}`);
            if (!items.length) return;

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'italic');
            setGray(60);
            const line = doc.splitTextToSize(items.join('  |  '), CW);
            doc.text(line, ML, cy);
            cy += line.length * 4.5 + 3;
            setBlack();
        }

        // ── Datos del paciente ───────────────────────────────────────
        function drawPatientBlock() {
            const cells = [];
            if (pName)     cells.push(['Paciente', pName]);
            if (pDni)      cells.push(['DNI', pDni]);
            if (pAge)      cells.push(['Edad', pAge]);
            if (pSex)      cells.push(['Sexo', pSex]);
            if (pInsurance)cells.push(['OS/Prepaga', pInsurance]);
            if (!cells.length) return;

            // Usamos rectángulo de fondo suave si caben datos
            if (typeof doc.autoTable === 'function') {
                doc.autoTable({
                    startY: cy,
                    body: cells.map(([k, v]) => ({ k, v })),
                    columns: [
                        { dataKey: 'k', header: '' },
                        { dataKey: 'v', header: '' }
                    ],
                    theme: 'plain',
                    styles: { fontSize: 9, cellPadding: { top: 1, bottom: 1, left: 1, right: 1 } },
                    columnStyles: {
                        k: { fontStyle: 'bold', textColor: [80, 80, 80], cellWidth: 28 },
                        v: { textColor: [0, 0, 0] }
                    },
                    tableWidth: CW,
                    margin: { left: ML },
                    showHead: 'never'
                });
                cy = doc.lastAutoTable.finalY + 3;
            } else {
                doc.setFontSize(9);
                cells.forEach(([k, v]) => {
                    doc.setFont('helvetica', 'bold');
                    doc.text(k + ': ', ML, cy);
                    doc.setFont('helvetica', 'normal');
                    doc.text(v, ML + doc.getTextWidth(k + ': '), cy);
                    cy += 5;
                });
            }
            grayLine(cy);
            cy += 5;
        }

        // ── Renderizado del contenido HTML ───────────────────────────
        function renderNode(node) {
            if (!node) return;
            if (node.nodeType === Node.TEXT_NODE) return; // bloques de texto sueltos los ignora
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            const tag = node.tagName.toLowerCase();

            // Saltar elementos de UI
            if (['script', 'style', 'button', 'input', 'select', 'textarea'].includes(tag)) return;
            if (node.classList.contains('no-print')         ) return;
            if (node.classList.contains('ai-note-panel')    ) return;
            if (node.classList.contains('no-data-edit-btn') ) return;
            if (node.id === 'aiNotePanel'                   ) return;

            // ── H1: título de sección grande, centrado ───────────────
            if (tag === 'h1') {
                const txt = node.textContent.trim();
                if (!txt) return;
                ensureSpace(18);
                cy += 3;
                doc.setFontSize(15);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text(txt.toUpperCase(), PAGE_W / 2, cy, { align: 'center' });
                cy += 2;
                accentLine(cy, true);
                cy += 6;
                setBlack();
                return;
            }

            // ── H2: subtítulo sólido con línea bajo el texto ─────────
            if (tag === 'h2') {
                const txt = node.textContent.trim();
                if (!txt) return;
                ensureSpace(14);
                cy += 4;
                doc.setFontSize(11.5);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text(txt, ML, cy);
                const tw = doc.getTextWidth(txt);
                cy += 1;
                doc.setDrawColor(accent.r, accent.g, accent.b);
                doc.setLineWidth(0.4);
                doc.line(ML, cy, ML + tw + 5, cy);
                doc.setDrawColor(0);
                cy += 5;
                setBlack();
                return;
            }

            // ── H3: encabezado terciario ──────────────────────────────
            if (tag === 'h3') {
                const txt = node.textContent.trim();
                if (!txt) return;
                ensureSpace(10);
                cy += 3;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bolditalic');
                setGray(40);
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
                        doc.setFont('helvetica', 'normal');
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
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    setBlack();
                    const txt = bullet + li.textContent.trim();
                    const lines = doc.splitTextToSize(txt, CW - 6);
                    doc.text(lines, ML + 5, cy);
                    cy += lines.length * 5 + 1;
                });
                cy += 2;
                return;
            }

            // ── P / DIV: párrafo de texto ─────────────────────────────
            if (tag === 'p' || tag === 'div') {
                const txt = node.textContent.trim();
                if (!txt) { cy += 2; return; }

                // Verificar si hay formatos mixtos
                const hasBold   = node.querySelector('strong, b') !== null;
                const hasItalic = node.querySelector('em, i') !== null;

                if (!hasBold && !hasItalic) {
                    // Texto plano → splitTextToSize para wrapping correcto
                    ensureSpace(8);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    setBlack();
                    const lines = doc.splitTextToSize(txt, CW);
                    const blockH = lines.length * 5;
                    if (cy + blockH > FOOTER_Y - 10) {
                        doc.addPage(); pageNum++; drawFooter(pageNum); cy = headerH;
                    }
                    doc.text(lines, ML, cy);
                    cy += blockH + 2;
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
            const LINE_H   = 5;
            const FONT_SZ  = 10;
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
                doc.setFont('helvetica', style);
                setBlack();

                // Dividir en palabras preservando espacios
                const tokens = seg.text.split(/(\s+)/);
                for (const tok of tokens) {
                    if (!tok) continue;
                    const tw = doc.getTextWidth(tok);
                    if (tok.trim() && usedW + tw > MAX_W) {
                        lineY += LINE_H;
                        if (lineY > FOOTER_Y - 10) {
                            doc.addPage(); pageNum++; drawFooter(pageNum); lineY = headerH;
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

        // ── Bloque de firma ───────────────────────────────────────────
        function drawSignature() {
            cy += 10;
            ensureSpace(40);

            if (sigB64) {
                try {
                    const imgType = sigB64.includes('data:image/png') ? 'PNG' : 'JPEG';
                    const b64data = sigB64.includes(',') ? sigB64.split(',')[1] : sigB64;
                    doc.addImage(b64data, imgType, 130, cy, 50, 20);
                    cy += 22;
                } catch (e) { /* imagen inválida */ }
            }
            if (showSignLine) {
                doc.setDrawColor(0);
                doc.setLineWidth(0.4);
                doc.line(130, cy, 190, cy);
                cy += 4;
            }
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            setBlack();
            if (showSignName && profName) {
                doc.text(profName, 160, cy, { align: 'center' });
                cy += 4;
            }
            if (showSignMat && matricula) {
                doc.text('Mat. ' + matricula, 160, cy, { align: 'center' });
                cy += 4;
            }
            if (especialidad) {
                doc.text(especialidad, 160, cy, { align: 'center' });
            }
        }

        // ── ¡Ejecutar todo! ───────────────────────────────────────────
        drawHeader();
        drawFooter(1);
        drawStudyInfo();
        drawPatientBlock();

        // Parsear y renderizar el contenido HTML del editor
        const parser    = new DOMParser();
        const parsedDoc = parser.parseFromString(htmlContent || '', 'text/html');
        for (const child of parsedDoc.body.childNodes) {
            renderNode(child);
        }

        drawSignature();

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

    } catch (e) {
        console.error('pdfMaker error:', e);
        showToast('Error al crear PDF: ' + e.message, 'error');
    }
}

window.downloadPDFWrapper = downloadPDFWrapper;
