// ============ PDF MAKER (jsPDF) ============
// Relies on global window.jspdf

async function downloadPDFWrapper(text, fileName, fecha, fileDate) {
    if (typeof jspdf === 'undefined') {
        showToast('Cargando motor PDF...', 'success');
        await new Promise(r => setTimeout(r, 500));
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
        const config   = JSON.parse(localStorage.getItem('pdf_config')  || '{}');

        // --- Datos del profesional ---
        const profName    = profData.nombre    || '';
        const matricula   = profData.matricula || '';

        // --- Datos del paciente (desde pdf_config, no desde el DOM) ---
        const pName   = config.patientName  || '---';
        const pDni    = config.patientDni   || '---';
        const pAge    = config.patientAge   ? `${config.patientAge} años` : '';
        const rawDate = config.studyDate || '';
        const pDate   = rawDate
            ? new Date(rawDate + 'T12:00').toLocaleDateString('es-ES')
            : fecha;

        // --- Configuración de encabezado/pie ---
        const pdfSettings = {
            header: config.header || '',
            footer: config.footerText || 'Página {page} • Transcriptor Pro'
        };

        const addHeaderFooter = (pageNumber) => {
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.setFont('helvetica', 'bold');
            doc.text(profName, 105, 12, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text(matricula, 105, 17, { align: 'center' });

            if (pdfSettings.header) {
                const headerLines = pdfSettings.header.split('\n');
                let hy = 25;
                headerLines.forEach(l => { doc.text(l, 105, hy, { align: 'center' }); hy += 4; });
            }

            doc.setFont('helvetica', 'italic');
            const footerText = pdfSettings.footer
                .replace('{page}', pageNumber)
                .replace('{date}', fecha);
            doc.text(footerText, 105, 285, { align: 'center' });

            return 30;
        };

        const hHeight = addHeaderFooter(1);

        // --- Título ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('INFORME MÉDICO', 105, hHeight + 10, { align: 'center' });

        // --- Bloque de datos del paciente ---
        doc.setFontSize(11);
        let cy = hHeight + 22;

        doc.setFont('helvetica', 'bold');  doc.text('Paciente:', 20, cy);
        doc.setFont('helvetica', 'normal'); doc.text(pName, 45, cy);
        doc.setFont('helvetica', 'bold');  doc.text('DNI:', 120, cy);
        doc.setFont('helvetica', 'normal'); doc.text(pDni, 135, cy);
        cy += 7;
        doc.setFont('helvetica', 'bold');  doc.text('Fecha:', 20, cy);
        doc.setFont('helvetica', 'normal'); doc.text(pDate, 45, cy);
        if (pAge) {
            doc.setFont('helvetica', 'bold');  doc.text('Edad:', 120, cy);
            doc.setFont('helvetica', 'normal'); doc.text(pAge, 137, cy);
        }
        cy += 12;

        // --- Contenido ---
        const paragraphs = text.split('\n');
        for (const para of paragraphs) {
            if (!para.trim()) { cy += 5; continue; }

            const isTitle = para.startsWith('#');
            const cleanPara = para.replace(/^#+\s*/, '').replace(/\*\*/g, '');

            if (cy > 270) {
                doc.addPage();
                addHeaderFooter(doc.internal.getNumberOfPages());
                cy = 35;
            }

            if (isTitle) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                cy += 4;
            } else {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(11);
            }

            const lines = doc.splitTextToSize(cleanPara, 170);
            doc.text(lines, 20, cy);
            cy += (lines.length * 6) + 2;
        }

        // --- Firma ---
        cy += 30;
        if (cy > 270) { doc.addPage(); addHeaderFooter(doc.internal.getNumberOfPages()); cy = 50; }
        doc.line(130, cy, 190, cy);
        doc.setFontSize(9);
        doc.text(profName,  160, cy + 5,  { align: 'center' });
        doc.text(matricula, 160, cy + 10, { align: 'center' });

        // --- Descarga sin Zone.Identifier (File System Access API o fallback) ---
        const blob = doc.output('blob');
        const saveBlob = (typeof window.saveToDisk === 'function') ? window.saveToDisk : async (b, name) => {
            const url = URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = url; a.download = name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
        await saveBlob(blob, `${fileName}_${fileDate}.pdf`);

        showToast('PDF descargado ✓', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error al crear PDF: ' + e.message, 'error');
    }
}
