// Poblar paneles de preview con HTML que replica el layout real del PDF (pdfMaker.js)
    function _buildPdfSimHtml(prefix) {
        return `
        <div class="preview-title">
            <span>📄 Vista previa del informe PDF</span>
            <button class="preview-close" onclick="document.getElementById('${prefix}SimBox').style.display='none'" title="Cerrar">&times;</button>
        </div>
        <div class="pdf-sim-page" style="--sim-accent:#1a56a0;">
            <div id="${prefix}SimBanner" class="pdf-sim-banner" style="background:var(--sim-accent,#1a56a0);">
                <div id="${prefix}SimLogoLeft" style="flex-shrink:0;"></div>
                <div style="flex:1;text-align:right;">
                    <div id="${prefix}SimWpName" style="font-weight:700;font-size:11px;text-transform:uppercase;"></div>
                    <div id="${prefix}SimWpDetails" style="font-size:7.5px;opacity:.85;"></div>
                </div>
            </div>
            <div class="pdf-sim-header" id="${prefix}SimProfBar" style="border-bottom-color:var(--sim-accent,#1a56a0);">
                <div id="${prefix}SimLogoRight" style="flex-shrink:0;"></div>
                <div style="flex:1;">
                    <div style="font-size:11px;font-weight:700;color:var(--sim-accent,#1a56a0);">Estudio realizado por: <span id="${prefix}SimProfName"></span></div>
                    <div id="${prefix}SimProfSpec" style="font-size:8px;color:#64748b;font-style:italic;margin-top:2px;"></div>
                </div>
            </div>
            <div class="pdf-sim-study-row">
                <div style="flex:1;"><b style="color:#64748b;">Estudio:</b> <span id="${prefix}SimStudy">—</span></div>
                <div style="flex:1;text-align:center;"><b style="color:#64748b;">Informe Nº:</b> 0001</div>
                <div style="flex:1;text-align:right;"><b style="color:#64748b;">Fecha:</b> <span id="${prefix}SimDate"></span></div>
            </div>
            <div class="pdf-sim-body">
                <p style="font-size:9px;color:#64748b;margin:2px 0;"><b>Paciente:</b> Juan Pérez &nbsp; <b>DNI:</b> 12.345.678 &nbsp; <b>Edad:</b> 45 años</p>
                <hr style="border:none;border-top:1px solid #ddd;margin:6px 0;">
                <p style="font-size:9px;color:#aaa;margin:4px 0;">Contenido del informe médico...</p>
                <p style="font-size:8px;color:#ccc;margin:4px 0;">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                <p style="font-size:8px;color:#ccc;margin:4px 0;">Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
            </div>
            <div id="${prefix}SimFirma" class="pdf-sim-firma">
                <div id="${prefix}SimFirmaImg" style="margin-bottom:2px;"></div>
                <div style="border-top:1px solid #333;width:80px;margin:2px 0 0 auto;"></div>
                <div id="${prefix}SimFirmaName" style="font-size:8px;text-align:right;">Dr. Nombre · Mat. MP-000</div>
            </div>
            <div class="pdf-sim-footer">
                <span id="${prefix}SimFooter">© Transcriptor Médico Pro</span> &nbsp;•&nbsp; <span id="${prefix}SimPageNum">Página 1</span>
            </div>
        </div>`;
    }
    document.getElementById('imgprocSimBox').innerHTML = _buildPdfSimHtml('imgproc');
    document.getElementById('apvSimBox').innerHTML = _buildPdfSimHtml('apv');
    