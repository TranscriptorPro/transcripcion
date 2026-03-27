window.PdfMakerSectionUtils = window.PdfMakerSectionUtils || {};

window.PdfMakerSectionUtils.drawStudyInfoSection = function(ctx) {
    const { studyType, reportNum, showReportNumber = true, pDate, studyTime, refDoctor, studyReason, CW, ML, cyStart, doc, accent, ensureSpace, setBlack } = ctx;
    const fields = [];
    if (showReportNumber) fields.push({ label: 'INFORME Nº:', value: reportNum || '—' });
    if (pDate || studyTime) fields.push({ label: 'FECHA:', value: `${pDate}${studyTime ? ' ' + studyTime + ' hs.' : ''}` });
    if (refDoctor) fields.push({ label: 'SOLICITANTE:', value: refDoctor });
    if (studyReason) fields.push({ label: 'MOTIVO:', value: studyReason });
    if (!fields.length) fields.push({ label: 'INFORME Nº:', value: reportNum || '—' });

    const padX = 4.2;
    const padY = 2.6;
    const rowH = 5.5;
    const innerW = CW - 2 * padX;
    const boxH = padY * 2 + rowH;
    const hasStudyTitle = !!(studyType && String(studyType).trim());
    const titleText = hasStudyTitle ? `INFORME DE ${String(studyType).toUpperCase()}` : 'INFORME MEDICO';
    const titleBlockH = 10;

    let cy = cyStart;
    cy = ensureSpace(cy, boxH + 4 + titleBlockH);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text(titleText, ML + (CW / 2), cy + 4.5, { align: 'center' });
    doc.setDrawColor(accent.r, accent.g, accent.b);
    doc.setLineWidth(0.5);
    doc.line(ML, cy + 6.5, ML + CW, cy + 6.5);
    cy += titleBlockH;

    doc.setFillColor(244, 247, 251);
    doc.setDrawColor(227, 232, 239);
    doc.setLineWidth(0.25);
    doc.roundedRect(ML, cy, CW, boxH, 1.2, 1.2, 'FD');

    const colW = innerW / fields.length;
    let ry = cy + padY + 3.5;
    for (let i = 0; i < fields.length; i++) {
        const cx = ML + padX + i * colW;
        if (i > 0) {
            doc.setDrawColor(221, 227, 238);
            doc.setLineWidth(0.15);
            doc.line(cx - 1.8, cy + 1.6, cx - 1.8, cy + boxH - 1.6);
        }
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accent.r, accent.g, accent.b);
        doc.text(fields[i].label, cx, ry);
        const lblW = doc.getTextWidth(fields[i].label);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 34, 34);
        const maxValueW = Math.max(12, colW - lblW - 3.5);
        const wrapped = doc.splitTextToSize(String(fields[i].value || ''), maxValueW);
        let valueText = (wrapped && wrapped.length) ? String(wrapped[0] || '') : '';
        while (valueText.length > 1 && doc.getTextWidth(valueText + '...') > maxValueW) {
            valueText = valueText.slice(0, -1);
        }
        if (wrapped && wrapped.length > 1) valueText += '...';
        doc.text(valueText, cx + lblW + 1.5, ry);
    }

    doc.setDrawColor(0);
    cy += boxH + 4;
    setBlack();
    return cy;
};

window.PdfMakerSectionUtils.drawPatientBlockSection = function(ctx) {
    const { pName, pSex, pDni, pInsurance, pAge, pAffiliateNum, ML, CW, accent, doc, ensureSpace, setBlack, cyStart } = ctx;
    const col1 = [];
    const col2 = [];
    const col3 = [];
    if (pName) col1.push({ label: 'PACIENTE', value: pName });
    if (pSex) col1.push({ label: 'SEXO', value: pSex });
    if (pDni) col2.push({ label: 'DNI', value: pDni });
    if (pInsurance) col2.push({ label: 'COBERTURA', value: pInsurance });
    if (pAge) col3.push({ label: 'EDAD', value: pAge });
    if (pAffiliateNum) col3.push({ label: 'Nº AFILIADO', value: pAffiliateNum });
    if (!col1.length && !col2.length && !col3.length) return cyStart;

    const padX = 4.2;
    const padY = 3;
    const groupH = 7;
    const groupGap = 3;
    const maxGroups = Math.max(col1.length, col2.length, col3.length);
    const boxH = padY * 2 + maxGroups * groupH + Math.max(0, maxGroups - 1) * groupGap;
    const accentBorderW = 1.2;

    let cy = ensureSpace(cyStart, boxH + 4);

    doc.setFillColor(250, 251, 252);
    doc.setDrawColor(208, 215, 222);
    doc.setLineWidth(0.25);
    doc.roundedRect(ML, cy, CW, boxH, 1.2, 1.2, 'FD');
    doc.setFillColor(accent.r, accent.g, accent.b);
    doc.rect(ML, cy, accentBorderW, boxH, 'F');

    const innerW = CW - 2 * padX;
    const colW = innerW / 3;
    const columns = [col1, col2, col3];

    for (let c = 0; c < 3; c++) {
        const col = columns[c];
        const cx = ML + padX + c * colW;
        let gy = cy + padY;
        for (let g = 0; g < col.length; g++) {
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(accent.r, accent.g, accent.b);
            doc.text(col[g].label, cx, gy + 3);
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
    return cy;
};

window.PdfMakerSectionUtils.drawSignatureSection = function(ctx) {
    const { PAGE_W, MR, showSignLine, showSignName, showSignMat, profName, profDisplayName, matricula, especialidad, sigB64, doc, setBlack, setGray, mainFont, ensureSpace, cyStart } = ctx;
    const canDrawSignatureImage = !!sigB64;
    const canDrawSignLine = showSignLine === true;
    const canDrawSignName = showSignName && !!profName;
    const canDrawSignMat = showSignMat && (!!matricula || !!especialidad);

    // Si no hay contenido visible en firma, no reservar espacio ni paginar.
    if (!canDrawSignatureImage && !canDrawSignLine && !canDrawSignName && !canDrawSignMat) {
        return cyStart;
    }

    let cy = cyStart + 18;
    cy = ensureSpace(cy, 45);

    const sigBlockW = 63;
    const sigLineW = 53;
    const sigStartX = PAGE_W - MR - sigBlockW;
    const sigCenterX = sigStartX + sigBlockW / 2;
    const lineX = sigCenterX - sigLineW / 2;
    const signW = 40;
    const signH = 16;

    // Referencia unica: la linea de firma es el ancla.
    // La firma siempre queda centrada respecto a esa linea y 3px por encima.
    const lineY = cy + (sigB64 ? (signH + 3) : 0);

    if (sigB64) {
        try {
            const imgType = sigB64.includes('data:image/png') ? 'PNG' : 'JPEG';
            const b64data = sigB64.includes(',') ? sigB64.split(',')[1] : sigB64;
            doc.addImage(b64data, imgType, sigCenterX - (signW / 2), lineY - signH - 3, signW, signH);
        } catch (_) {}
    }
    if (showSignLine) {
        doc.setDrawColor(51, 51, 51);
        doc.setLineWidth(0.4);
        doc.line(lineX, lineY, lineX + sigLineW, lineY);
        doc.setDrawColor(0);
    }
    cy = lineY + 3;
    if (showSignName && profName) {
        doc.setFontSize(10);
        doc.setFont(mainFont, 'bold');
        setBlack();
        doc.text(profDisplayName || profName, sigCenterX, cy, { align: 'center' });
        cy += 4;
    }
    if (showSignMat && matricula) {
        doc.setFontSize(9);
        doc.setFont(mainFont, 'normal');
        setGray(85);
        doc.text('Mat. ' + matricula, sigCenterX, cy, { align: 'center' });
        cy += 3.5;
    }
    if (especialidad) {
        doc.setFontSize(8.5);
        doc.setFont(mainFont, 'italic');
        setGray(102);
        doc.text(especialidad, sigCenterX, cy, { align: 'center' });
    }
    setBlack();
    return cy;
};
