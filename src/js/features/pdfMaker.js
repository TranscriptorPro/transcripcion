// ============ PDF MAKER (jsPDF) ============
// Relies on global window.jspdf and global DOM state

async function downloadPDFWrapper(text, fileName, fecha, fileDate) {
    if (typeof jspdf === 'undefined') {
        showToast('Cargando motor PDF...', 'success');
        await new Promise(r => setTimeout(r, 500));
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const profData = JSON.parse(localStorage.getItem('prof_data')) || {};
        const selectedWorkplace = $('workplaceSelect').value;

        // Legacy configuration from modal scope
        // Note: Relies on pdfSettings being defined globally or within scope
        const pdfSettings = typeof window.pdfSettings !== 'undefined' ? window.pdfSettings : {
            header: '',
            footer: "Página {page} • Transcriptor Pro"
        };

        const addHeaderFooter = (pageNumber, totalPages) => {
            doc.setFontSize(9);
            doc.setTextColor(100);

            // Header: Professional Name & Workplace
            doc.setFont('helvetica', 'bold');
            doc.text(profData.nombre || '', 105, 12, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text(`${profData.matricula || ''} • ${selectedWorkplace || ''}`, 105, 17, { align: 'center' });

            // Custom Header Lines
            if (pdfSettings.header) {
                const headerLines = pdfSettings.header.split('\n');
                let hy = 25;
                headerLines.forEach(l => { doc.text(l, 105, hy, { align: 'center' }); hy += 4; });
            }

            // Footer: Page & Date
            doc.setFont('helvetica', 'italic');
            const footerText = (pdfSettings.footer || "Página {page} • Transcriptor Pro")
                .replace('{page}', pageNumber).replace('{date}', fecha);
            doc.text(footerText, 105, 285, { align: 'center' });

            return 30; // Return content start Y
        };

        const hHeight = addHeaderFooter(1, 1);

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('INFORME MÉDICO', 105, hHeight + 10, { align: 'center' });

        // Patient Info Block
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        let cy = hHeight + 22;

        const pName = $('patientName') ? $('patientName').value : '---';
        const pDni = $('patientDni') ? $('patientDni').value : '---';
        const pDate = ($('studyDate') && $('studyDate').value) ? new Date($('studyDate').value).toLocaleDateString('es-ES') : fecha;

        doc.text(`Paciente:`, 20, cy);
        doc.setFont('helvetica', 'normal');
        doc.text(pName, 45, cy);

        doc.setFont('helvetica', 'bold');
        doc.text(`DNI:`, 120, cy);
        doc.setFont('helvetica', 'normal');
        doc.text(pDni, 135, cy);

        cy += 7;
        doc.setFont('helvetica', 'bold');
        doc.text(`Fecha:`, 20, cy);
        doc.setFont('helvetica', 'normal');
        doc.text(pDate, 45, cy);

        cy += 12;

        // Content
        const paragraphs = text.split('\n');
        for (const para of paragraphs) {
            if (!para.trim()) { cy += 5; continue; }

            let isTitle = para.startsWith('#');
            let cleanPara = para.replace(/^#+\s*/, '').replace(/\*\*/g, '');

            if (cy > 270) {
                doc.addPage();
                addHeaderFooter(doc.internal.getNumberOfPages(), 0);
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

        // Final Signature
        cy += 30;
        if (cy > 270) { doc.addPage(); addHeaderFooter(doc.internal.getNumberOfPages(), 0); cy = 50; }
        doc.line(130, cy, 190, cy);
        doc.setFontSize(9);
        doc.text(profData.nombre || '', 160, cy + 5, { align: 'center' });
        doc.text(profData.matricula || '', 160, cy + 10, { align: 'center' });

        doc.save(`${fileName}_${fileDate}.pdf`);
        showToast('PDF generado ✓', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error al crear PDF', 'error');
    }
}
