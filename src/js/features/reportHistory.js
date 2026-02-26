// ============ HISTORIAL DE INFORMES (Report History) ============
// Almacena informes generados en localStorage bajo 'report_history'.
// Cada informe queda vinculado al paciente (nombre + DNI) y la plantilla usada.
// El médico puede ver informes anteriores (solo lectura) y re-exportarlos a PDF.

const REPORT_HISTORY_KEY = 'report_history';

// ---- Leer / escribir ----
function _getReportHistory() {
    try { return JSON.parse(localStorage.getItem(REPORT_HISTORY_KEY) || '[]'); }
    catch (_) { return []; }
}

function _setReportHistory(arr) {
    localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(arr));
}

// ---- Guardar informe ----
// Se invoca al descargar PDF o al imprimir — momento en que el informe se considera "final".
window.saveReportToHistory = function (data) {
    if (!data || !data.htmlContent) return null;

    const pdfConfig = JSON.parse(localStorage.getItem('pdf_config') || '{}');
    const patientName = data.patientName || pdfConfig.patientName || '';
    const patientDni  = data.patientDni  || pdfConfig.patientDni  || '';

    const templateKey  = data.templateKey || window.selectedTemplate || 'generico';
    const templateName = (typeof MEDICAL_TEMPLATES !== 'undefined' && MEDICAL_TEMPLATES[templateKey])
        ? MEDICAL_TEMPLATES[templateKey].name
        : templateKey;

    const entry = {
        id:           'rpt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        patientName:  patientName,
        patientDni:   patientDni,
        templateKey:  templateKey,
        templateName: templateName,
        date:         new Date().toISOString(),
        htmlContent:  data.htmlContent,
        fileName:     data.fileName || 'informe',
        patientData: {
            name:         patientName,
            dni:          patientDni,
            age:          data.patientAge  || pdfConfig.patientAge  || '',
            sex:          data.patientSex  || pdfConfig.patientSex  || '',
            insurance:    data.insurance   || pdfConfig.patientInsurance    || '',
            affiliateNum: data.affiliateNum|| pdfConfig.patientAffiliateNum || ''
        }
    };

    const history = _getReportHistory();
    history.unshift(entry);

    // Intentar guardar; si localStorage está lleno, eliminar los más antiguos
    try {
        _setReportHistory(history);
    } catch (e) {
        // QuotaExceededError — ir eliminando los más viejos hasta que quepa
        let trimmed = history;
        while (trimmed.length > 1) {
            trimmed.pop();
            try {
                _setReportHistory(trimmed);
                if (typeof showToast === 'function')
                    showToast('⚠️ Almacenamiento lleno. Se eliminaron informes antiguos.', 'warning');
                break;
            } catch (_) { /* sigue eliminando */ }
        }
    }
    return entry.id;
};

// ---- Obtener todos los informes ----
window.getAllReports = function () {
    return _getReportHistory();
};

// ---- Obtener informes de un paciente (por nombre normalizado O por DNI) ----
window.getPatientReports = function (nameOrDni) {
    if (!nameOrDni) return [];
    const q    = _normStr(nameOrDni);
    const dniQ = nameOrDni.replace(/\D/g, '');
    return _getReportHistory().filter(r => {
        if (dniQ && r.patientDni && r.patientDni.replace(/\D/g, '') === dniQ) return true;
        if (r.patientName && _normStr(r.patientName).includes(q)) return true;
        return false;
    });
};

// ---- Obtener un informe por ID ----
window.getReportById = function (id) {
    return _getReportHistory().find(r => r.id === id) || null;
};

// ---- Eliminar un informe ----
window.deleteReport = function (id) {
    const history = _getReportHistory().filter(r => r.id !== id);
    _setReportHistory(history);
};

// ---- Eliminar TODOS los informes de un paciente ----
window.deletePatientReports = function (nameOrDni) {
    if (!nameOrDni) return;
    const q    = _normStr(nameOrDni);
    const dniQ = nameOrDni.replace(/\D/g, '');
    const history = _getReportHistory().filter(r => {
        if (dniQ && r.patientDni && r.patientDni.replace(/\D/g, '') === dniQ) return false;
        if (r.patientName && _normStr(r.patientName) === q) return false;
        return true;
    });
    _setReportHistory(history);
};

// ---- Exportar historial completo como JSON ----
window.exportReportHistory = function () {
    const history = _getReportHistory();
    if (history.length === 0) {
        if (typeof showToast === 'function') showToast('No hay informes para exportar', 'info');
        return;
    }
    const json = JSON.stringify(history, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `historial_informes_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast(`${history.length} informes exportados ✓`, 'success');
};

// ---- Importar historial desde JSON ----
window.importReportHistory = function (jsonData) {
    try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        if (!Array.isArray(data)) throw new Error('El archivo no contiene un array válido');

        const existing    = _getReportHistory();
        const existingIds = new Set(existing.map(r => r.id));
        let added = 0;

        data.forEach(r => {
            if (!r.id || !r.htmlContent) return;
            if (existingIds.has(r.id)) return; // evitar duplicados
            existing.push(r);
            added++;
        });

        // Ordenar por fecha descendente
        existing.sort((a, b) => new Date(b.date) - new Date(a.date));
        _setReportHistory(existing);
        if (typeof showToast === 'function') showToast(`${added} informes importados ✓`, 'success');
        return added;
    } catch (e) {
        if (typeof showToast === 'function') showToast('Error al importar: ' + e.message, 'error');
        return 0;
    }
};

// ---- Estadísticas rápidas ----
window.getReportHistoryStats = function () {
    const history = _getReportHistory();
    const patients = new Set(history.map(r => r.patientDni || r.patientName).filter(Boolean));
    return {
        total:    history.length,
        patients: patients.size,
        oldest:   history.length ? history[history.length - 1].date : null,
        newest:   history.length ? history[0].date : null,
        sizeKB:   Math.round((localStorage.getItem(REPORT_HISTORY_KEY) || '').length / 1024)
    };
};

// ============ UI: VISOR DE INFORME (solo lectura) ============
window.viewReport = function (reportId) {
    const report = getReportById(reportId);
    if (!report) {
        if (typeof showToast === 'function') showToast('Informe no encontrado', 'error');
        return;
    }

    // Crear o reutilizar overlay
    let overlay = document.getElementById('reportViewerOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'reportViewerOverlay';
        overlay.className = 'overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width:900px;width:95%;max-height:92vh;display:flex;flex-direction:column;">
                <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;border-bottom:1px solid var(--border);">
                    <div>
                        <h3 id="rvTitle" style="margin:0;font-size:1.1rem;"></h3>
                        <small id="rvMeta" style="color:var(--text-secondary);"></small>
                    </div>
                    <button id="btnCloseReportViewer" class="btn btn-secondary" style="padding:.35rem .75rem;font-size:1.1rem;" title="Cerrar">&times;</button>
                </div>
                <div id="rvContent" style="flex:1;overflow-y:auto;padding:1.5rem;background:white;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-size:0.95rem;line-height:1.6;"></div>
                <div style="display:flex;gap:.5rem;justify-content:flex-end;padding:1rem 1.5rem;border-top:1px solid var(--border);flex-wrap:wrap;">
                    <button id="btnReExportPdf" class="btn btn-primary" style="gap:.4rem;">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5A1.1 1.1 0 0 0 2.1 14h11.8a1.1 1.1 0 0 0 1.1-1.1v-2.5a.5.5 0 0 1 1 0v2.5A2.1 2.1 0 0 1 13.9 15H2.1A2.1 2.1 0 0 1 0 12.9v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                        Re-exportar PDF
                    </button>
                    <button id="btnDeleteReport" class="btn" style="background:var(--error);color:white;gap:.4rem;">
                        🗑 Eliminar
                    </button>
                    <button id="btnCloseReportViewerFooter" class="btn btn-secondary">Cerrar</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        // Cerrar al hacer click en overlay
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
        document.getElementById('btnCloseReportViewer').addEventListener('click', () => overlay.classList.remove('active'));
        document.getElementById('btnCloseReportViewerFooter').addEventListener('click', () => overlay.classList.remove('active'));
    }

    // Llenar datos
    const title = document.getElementById('rvTitle');
    const meta  = document.getElementById('rvMeta');
    const content = document.getElementById('rvContent');

    const dateStr = new Date(report.date).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    title.textContent = `${report.patientName || 'Sin nombre'} — ${report.templateName || report.templateKey}`;
    meta.textContent  = `${dateStr} · ${report.fileName}`;
    content.innerHTML = report.htmlContent;

    // Botón re-exportar PDF
    const btnReExport = document.getElementById('btnReExportPdf');
    btnReExport.onclick = async () => {
        if (typeof downloadPDFWrapper !== 'function') {
            if (typeof showToast === 'function') showToast('Motor PDF no disponible', 'error');
            return;
        }
        // Cargar temporalmente los datos del paciente para el PDF
        const pdfConfig = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        const origConfig = { ...pdfConfig };

        if (report.patientData) {
            if (report.patientData.name)    pdfConfig.patientName         = report.patientData.name;
            if (report.patientData.dni)     pdfConfig.patientDni          = report.patientData.dni;
            if (report.patientData.age)     pdfConfig.patientAge          = report.patientData.age;
            if (report.patientData.sex)     pdfConfig.patientSex          = report.patientData.sex;
            if (report.patientData.insurance)    pdfConfig.patientInsurance    = report.patientData.insurance;
            if (report.patientData.affiliateNum) pdfConfig.patientAffiliateNum = report.patientData.affiliateNum;
            localStorage.setItem('pdf_config', JSON.stringify(pdfConfig));
        }

        try {
            const fecha = new Date(report.date).toLocaleDateString('es-ES');
            const fDate = report.date.split('T')[0];
            window._skipReportSave = true; // evitar guardar duplicado al re-exportar
            await downloadPDFWrapper(report.htmlContent, report.fileName + '_copia', fecha, fDate);
            if (typeof showToast === 'function') showToast('PDF re-exportado ✓', 'success');
        } finally {
            window._skipReportSave = false;
            // Restaurar config original
            localStorage.setItem('pdf_config', JSON.stringify(origConfig));
        }
    };

    // Botón eliminar
    const btnDelete = document.getElementById('btnDeleteReport');
    btnDelete.onclick = () => {
        if (!confirm('¿Eliminar este informe del historial? Esta acción no se puede deshacer.')) return;
        deleteReport(report.id);
        overlay.classList.remove('active');
        if (typeof showToast === 'function') showToast('Informe eliminado', 'info');
        // Si hay panel de historial abierto, refrescar
        if (typeof _refreshReportHistoryPanel === 'function') _refreshReportHistoryPanel();
    };

    overlay.classList.add('active');
};

// ============ UI: PANEL DE HISTORIAL DE INFORMES ============
window.initReportHistoryPanel = function () {
    const overlay = document.getElementById('reportHistoryOverlay');
    const openBtn = document.getElementById('btnOpenReportHistory');
    if (!overlay || !openBtn) return;

    function fmtDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return isNaN(d) ? '—' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function fmtTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return isNaN(d) ? '' : d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }

    // ---- Render tabla ----
    function renderTable(filter) {
        const tbody = document.getElementById('reportHistoryTbody');
        if (!tbody) return;
        let reports = _getReportHistory();

        if (filter) {
            const q = _normStr(filter);
            reports = reports.filter(r =>
                (r.patientName && _normStr(r.patientName).includes(q)) ||
                (r.patientDni && r.patientDni.includes(q)) ||
                (r.templateName && _normStr(r.templateName).includes(q))
            );
        }

        // Stats
        const statsEl = document.getElementById('reportHistoryStats');
        if (statsEl) {
            const stats = getReportHistoryStats();
            statsEl.textContent = `${stats.total} informes · ${stats.patients} pacientes · ${stats.sizeKB} KB`;
        }

        if (reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay informes en el historial.</td></tr>';
            return;
        }

        tbody.innerHTML = reports.map(r => {
            const safeName = (r.patientName || 'Sin nombre').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeTpl  = (r.templateName || r.templateKey || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;');
            return `
            <tr>
                <td>${safeName}</td>
                <td>${safeTpl}</td>
                <td>${fmtDate(r.date)}</td>
                <td style="font-size:.8rem;color:var(--text-secondary);">${fmtTime(r.date)}</td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-primary rh-view-btn" data-id="${r.id}" style="padding:.25rem .6rem;font-size:.75rem;">
                        👁 Ver
                    </button>
                    <button class="btn rh-delete-btn" data-id="${r.id}" style="padding:.25rem .5rem;font-size:.75rem;background:var(--error);color:white;">
                        🗑
                    </button>
                </td>
            </tr>`;
        }).join('');

        // Event delegation
        if (!tbody._delegated) {
            tbody._delegated = true;
            tbody.addEventListener('click', e => {
                const viewBtn = e.target.closest('.rh-view-btn');
                const delBtn  = e.target.closest('.rh-delete-btn');
                if (viewBtn) {
                    viewReport(viewBtn.dataset.id);
                }
                if (delBtn) {
                    const report = getReportById(delBtn.dataset.id);
                    if (report && confirm(`¿Eliminar informe de "${report.patientName}" (${fmtDate(report.date)})?`)) {
                        deleteReport(delBtn.dataset.id);
                        renderTable(document.getElementById('reportHistorySearch')?.value);
                    }
                }
            });
        }
    }

    // Exponer refresh para uso externo
    window._refreshReportHistoryPanel = () => renderTable(document.getElementById('reportHistorySearch')?.value);

    // ---- Abrir / cerrar panel ----
    openBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        renderTable();
        document.getElementById('reportHistorySearch')?.focus();
    });

    function closePanel() { overlay.classList.remove('active'); }
    const closeBtn = document.getElementById('btnCloseReportHistory');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });

    // ---- Búsqueda en tiempo real ----
    document.getElementById('reportHistorySearch')?.addEventListener('input', e => renderTable(e.target.value));

    // ---- Export JSON ----
    document.getElementById('btnExportReportHistory')?.addEventListener('click', () => exportReportHistory());

    // ---- Import JSON ----
    document.getElementById('inputImportReportHistory')?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            importReportHistory(ev.target.result);
            renderTable();
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // ---- Limpiar todo ----
    document.getElementById('btnClearReportHistory')?.addEventListener('click', () => {
        const stats = getReportHistoryStats();
        if (stats.total === 0) {
            if (typeof showToast === 'function') showToast('El historial ya está vacío', 'info');
            return;
        }
        if (!confirm(`¿Eliminar TODOS los informes del historial? (${stats.total} informes)\n\nEsta acción no se puede deshacer. Recomendamos exportar antes.`)) return;
        _setReportHistory([]);
        renderTable();
        if (typeof showToast === 'function') showToast('Historial limpiado', 'info');
    });
};

// ============ INTEGRACIÓN: Ver informes de un paciente desde el registro ============
window.viewPatientReportHistory = function (patientName, patientDni) {
    const reports = getPatientReports(patientDni || patientName);
    if (reports.length === 0) {
        if (typeof showToast === 'function') showToast(`No hay informes guardados para ${patientName}`, 'info');
        return;
    }

    // Crear mini-modal con lista de informes del paciente
    let modal = document.getElementById('patientReportsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'patientReportsModal';
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width:650px;width:90%;">
                <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;border-bottom:1px solid var(--border);">
                    <h3 id="prModalTitle" style="margin:0;font-size:1rem;"></h3>
                    <button id="btnClosePatientReports" class="btn btn-secondary" style="padding:.3rem .6rem;">&times;</button>
                </div>
                <div id="prModalBody" style="max-height:60vh;overflow-y:auto;padding:1rem 1.5rem;"></div>
                <div style="padding:.75rem 1.5rem;border-top:1px solid var(--border);text-align:right;">
                    <button id="btnClosePatientReportsFooter" class="btn btn-secondary">Cerrar</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        document.getElementById('btnClosePatientReports').addEventListener('click', () => modal.classList.remove('active'));
        document.getElementById('btnClosePatientReportsFooter').addEventListener('click', () => modal.classList.remove('active'));
    }

    const title = document.getElementById('prModalTitle');
    const body  = document.getElementById('prModalBody');

    title.textContent = `Informes de ${patientName}`;

    const fmtDate = iso => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
               ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:.5rem;">
            ${reports.map(r => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:.65rem .85rem;background:var(--surface-alt,#f5f5f5);border-radius:8px;border:1px solid var(--border);">
                    <div>
                        <div style="font-weight:600;font-size:.9rem;">${(r.templateName || r.templateKey).replace(/</g, '&lt;')}</div>
                        <div style="font-size:.78rem;color:var(--text-secondary);">${fmtDate(r.date)}</div>
                    </div>
                    <button class="btn btn-primary pr-view-btn" data-id="${r.id}" style="padding:.3rem .7rem;font-size:.8rem;">
                        👁 Ver
                    </button>
                </div>
            `).join('')}
        </div>`;

    // Event delegation
    body.onclick = e => {
        const btn = e.target.closest('.pr-view-btn');
        if (btn) {
            modal.classList.remove('active');
            viewReport(btn.dataset.id);
        }
    };

    modal.classList.add('active');
};

// ---- Helper: _normStr (redefinir si no existe) ----
if (typeof _normStr === 'undefined') {
    window._normStr = function (s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };
}
