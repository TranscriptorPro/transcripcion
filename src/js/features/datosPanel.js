// ============ PANEL UNIFICADO: MIS DATOS ============
// Historial de informes · Pacientes · Médicos solicitantes · Motivos/indicación
// Incluye backup completo (exportar/importar todo en un clic).
(function () {
    'use strict';

    // ── Helpers ──────────────────────────────────────────────────────────────
    function esc(v) {
        return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function fmtDate(iso) {
        if (!iso) return '\u2014';
        const d = new Date(iso);
        return isNaN(d) ? '\u2014' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    function fmtTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return isNaN(d) ? '' : d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }
    function norm(s) {
        return typeof window._normStr === 'function'
            ? window._normStr(s || '')
            : String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // ── Estado interno ────────────────────────────────────────────────────────
    var _activeTab = 'history';
    var _editPatientData = null;

    // ── Render: Historial de informes ─────────────────────────────────────────
    function renderHistory(filter) {
        var tbody = document.getElementById('dp-tbody-history');
        if (!tbody) return;
        var rpts = typeof window.getAllReports === 'function' ? window.getAllReports() : [];
        var statsEl = document.getElementById('dp-history-stats');
        if (statsEl) {
            var stats = typeof window.getReportHistoryStats === 'function' ? window.getReportHistoryStats() : { total: rpts.length, patients: 0, sizeKB: 0 };
            statsEl.textContent = stats.total + ' informes \u00B7 ' + stats.patients + ' pacientes \u00B7 ' + stats.sizeKB + ' KB';
        }
        if (filter) {
            var q = norm(filter);
            rpts = rpts.filter(function (r) {
                return (r.patientName && norm(r.patientName).includes(q)) ||
                    (r.patientDni && r.patientDni.includes(q)) ||
                    (r.templateName && norm(r.templateName).includes(q));
            });
        }
        if (!rpts.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay informes en el historial.</td></tr>';
            return;
        }
        tbody.innerHTML = rpts.map(function (r) {
            return '<tr>' +
                '<td style="padding:.4rem .5rem;">' + esc(r.patientName || 'Sin nombre') + '</td>' +
                '<td style="padding:.4rem .5rem;">' + esc(r.templateName || r.templateKey || '\u2014') + '</td>' +
                '<td style="padding:.4rem .5rem;">' + fmtDate(r.date) + '</td>' +
                '<td style="padding:.4rem .5rem;font-size:.8rem;color:var(--text-secondary);">' + fmtTime(r.date) + '</td>' +
                '<td style="padding:.4rem .5rem;white-space:nowrap;text-align:center;">' +
                '<button class="btn btn-primary dp-view-report" data-id="' + esc(r.id) + '" style="padding:.2rem .5rem;font-size:.73rem;margin-right:3px;">\uD83D\uDC41 Ver</button>' +
                '<button class="btn dp-del-report" data-id="' + esc(r.id) + '" data-name="' + esc(r.patientName || '') + '" data-date="' + esc(fmtDate(r.date)) + '" style="padding:.2rem .5rem;font-size:.73rem;background:var(--error,#ef4444);color:#fff;">\uD83D\uDDD1</button>' +
                '</td></tr>';
        }).join('');
        if (!tbody._dp1) {
            tbody._dp1 = true;
            tbody.addEventListener('click', async function (e) {
                var vBtn = e.target.closest('.dp-view-report');
                var dBtn = e.target.closest('.dp-del-report');
                if (vBtn && typeof window.viewReport === 'function') {
                    window.viewReport(vBtn.dataset.id);
                }
                if (dBtn) {
                    var ok = typeof window.showCustomConfirm === 'function'
                        ? await window.showCustomConfirm('\uD83D\uDDD1\uFE0F Eliminar informe', '\u00BFEliminar informe de "' + dBtn.dataset.name + '" (' + dBtn.dataset.date + ')? Esta acci\u00F3n no se puede deshacer.')
                        : window.confirm('\u00BFEliminar informe?');
                    if (!ok) return;
                    if (typeof window.deleteReport === 'function') window.deleteReport(dBtn.dataset.id);
                    renderHistory(document.getElementById('dp-search-history') ? document.getElementById('dp-search-history').value : '');
                    if (typeof showToast === 'function') showToast('Informe eliminado', 'info');
                }
            });
        }
    }

    // ── Render: Pacientes ─────────────────────────────────────────────────────
    function renderPatients(filter) {
        var tbody = document.getElementById('dp-tbody-patients');
        if (!tbody) return;
        var reg = typeof window.getAllPatients === 'function' ? window.getAllPatients() : [];
        if (filter) {
            var q = norm(filter);
            reg = reg.filter(function (p) { return (p.name && norm(p.name).includes(q)) || (p.dni && p.dni.includes(q)); });
        }
        if (!reg.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay pacientes registrados.</td></tr>';
            return;
        }
        tbody.innerHTML = reg.map(function (p, i) {
            return '<tr data-dp-idx="' + i + '">' +
                '<td style="padding:.4rem .5rem;">' + esc(p.name || '\u2014') + '</td>' +
                '<td style="padding:.4rem .5rem;">' + esc(p.dni || '\u2014') + '</td>' +
                '<td style="padding:.4rem .5rem;">' + esc(p.age ? p.age + ' a\u00F1os' : '\u2014') + '</td>' +
                '<td style="padding:.4rem .5rem;">' + fmtDate(p.lastSeen) + '</td>' +
                '<td style="padding:.4rem .5rem;text-align:center;">' + Number(p.visits || 1) + '</td>' +
                '<td style="padding:.4rem .5rem;text-align:center;white-space:nowrap;">' +
                '<button class="btn btn-secondary dp-edit-patient" data-dp-idx="' + i + '" style="padding:.2rem .5rem;font-size:.73rem;margin-right:3px;">\u270F</button>' +
                '<button class="btn dp-del-patient" data-name="' + esc(p.name || '') + '" data-dni="' + esc(p.dni || '') + '" style="padding:.2rem .5rem;font-size:.73rem;background:var(--error,#ef4444);color:#fff;">\uD83D\uDDD1</button>' +
                '</td></tr>';
        }).join('');
        if (!tbody._dp2) {
            tbody._dp2 = true;
            tbody.addEventListener('click', async function (e) {
                var eBtn = e.target.closest('.dp-edit-patient');
                var dBtn = e.target.closest('.dp-del-patient');
                if (eBtn) {
                    var allPts = typeof window.getAllPatients === 'function' ? window.getAllPatients() : [];
                    var p = allPts[parseInt(eBtn.dataset.dpIdx)];
                    if (!p) return;
                    _editPatientData = p;
                    var set = function (id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; };
                    set('dp-re-name', p.name); set('dp-re-dni', p.dni);
                    set('dp-re-age', p.age); set('dp-re-sex', p.sex);
                    set('dp-re-insurance', p.insurance); set('dp-re-affiliate', p.affiliateNum);
                    var form = document.getElementById('dp-edit-patient-form');
                    if (form) { form.style.display = 'block'; var nameEl = document.getElementById('dp-re-name'); if (nameEl) nameEl.focus(); }
                }
                if (dBtn) {
                    var ok = typeof window.showCustomConfirm === 'function'
                        ? await window.showCustomConfirm('\uD83D\uDDD1\uFE0F Eliminar paciente', '\u00BFEliminar al paciente "' + dBtn.dataset.name + '"? Esta acci\u00F3n no se puede deshacer.')
                        : window.confirm('\u00BFEliminar paciente "' + dBtn.dataset.name + '"?');
                    if (!ok) return;
                    if (typeof window.deletePatientFromRegistry === 'function') window.deletePatientFromRegistry(dBtn.dataset.name, dBtn.dataset.dni);
                    renderPatients(document.getElementById('dp-search-patients') ? document.getElementById('dp-search-patients').value : '');
                    if (typeof showToast === 'function') showToast('Paciente eliminado', 'info');
                }
            });
        }
    }

    // ── Render: Médicos solicitantes ──────────────────────────────────────────
    function renderDoctors(filter) {
        var tbody = document.getElementById('dp-tbody-doctors');
        if (!tbody) return;
        var all = typeof window.getAllReferringDoctors === 'function' ? window.getAllReferringDoctors() : [];
        if (filter) {
            var q = norm(filter);
            all = all.filter(function (d) { return d.name && norm(d.name).includes(q); });
        }
        if (!all.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay m\u00E9dicos solicitantes registrados.</td></tr>';
            return;
        }
        tbody.innerHTML = all.map(function (d) {
            return '<tr>' +
                '<td style="padding:.4rem .5rem;">' + esc(d.name) + '</td>' +
                '<td style="padding:.4rem .5rem;">' + fmtDate(d.lastUsed) + '</td>' +
                '<td style="padding:.4rem .5rem;">' + Number(d.usageCount || 0) + '</td>' +
                '<td style="padding:.4rem .5rem;text-align:center;white-space:nowrap;"></td>' +
                '</tr>';
        }).join('');
        var trs = tbody.querySelectorAll('tr');
        all.forEach(function (rowData, idx) {
            var tr = trs[idx];
            if (!tr) return;
            var td = tr.cells[3];
            var editBtn = document.createElement('button');
            editBtn.type = 'button'; editBtn.textContent = '\u270F';
            editBtn.style.cssText = 'padding:.2rem .5rem;font-size:.73rem;background:#e5e7eb;border:none;border-radius:5px;cursor:pointer;margin-right:4px;';
            editBtn.addEventListener('click', function () { _startInlineEdit(tr, 0, rowData.name, function (next) { return typeof window.updateReferringDoctor === 'function' && window.updateReferringDoctor(rowData.name, next); }, function () { renderDoctors(document.getElementById('dp-search-doctors') ? document.getElementById('dp-search-doctors').value : ''); }); });
            var delBtn = document.createElement('button');
            delBtn.type = 'button'; delBtn.textContent = '\uD83D\uDDD1';
            delBtn.style.cssText = 'padding:.2rem .5rem;font-size:.73rem;background:#ef4444;color:#fff;border:none;border-radius:5px;cursor:pointer;';
            delBtn.addEventListener('click', async function () {
                var ok = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('Eliminar m\u00E9dico solicitante', '\u00BFEliminar "' + rowData.name + '" del historial?')
                    : window.confirm('\u00BFEliminar "' + rowData.name + '"?');
                if (!ok) return;
                if (typeof window.deleteReferringDoctor === 'function') window.deleteReferringDoctor(rowData.name);
                renderDoctors(document.getElementById('dp-search-doctors') ? document.getElementById('dp-search-doctors').value : '');
            });
            td.appendChild(editBtn); td.appendChild(delBtn);
        });
    }

    // ── Render: Motivos / indicación clínica ──────────────────────────────────
    function renderReasons(filter) {
        var tbody = document.getElementById('dp-tbody-reasons');
        if (!tbody) return;
        var all = typeof window.getAllStudyReasons === 'function' ? window.getAllStudyReasons() : [];
        if (filter) {
            var q = norm(filter);
            all = all.filter(function (r) { return r.reason && norm(r.reason).includes(q); });
        }
        if (!all.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay motivos registrados.</td></tr>';
            return;
        }
        tbody.innerHTML = all.map(function (r) {
            return '<tr>' +
                '<td style="padding:.4rem .5rem;">' + esc(r.reason) + '</td>' +
                '<td style="padding:.4rem .5rem;">' + fmtDate(r.lastUsed) + '</td>' +
                '<td style="padding:.4rem .5rem;">' + Number(r.usageCount || 0) + '</td>' +
                '<td style="padding:.4rem .5rem;text-align:center;white-space:nowrap;"></td>' +
                '</tr>';
        }).join('');
        var trs = tbody.querySelectorAll('tr');
        all.forEach(function (rowData, idx) {
            var tr = trs[idx];
            if (!tr) return;
            var td = tr.cells[3];
            var editBtn = document.createElement('button');
            editBtn.type = 'button'; editBtn.textContent = '\u270F';
            editBtn.style.cssText = 'padding:.2rem .5rem;font-size:.73rem;background:#e5e7eb;border:none;border-radius:5px;cursor:pointer;margin-right:4px;';
            editBtn.addEventListener('click', function () { _startInlineEdit(tr, 0, rowData.reason, function (next) { return typeof window.updateStudyReason === 'function' && window.updateStudyReason(rowData.reason, next); }, function () { renderReasons(document.getElementById('dp-search-reasons') ? document.getElementById('dp-search-reasons').value : ''); }); });
            var delBtn = document.createElement('button');
            delBtn.type = 'button'; delBtn.textContent = '\uD83D\uDDD1';
            delBtn.style.cssText = 'padding:.2rem .5rem;font-size:.73rem;background:#ef4444;color:#fff;border:none;border-radius:5px;cursor:pointer;';
            delBtn.addEventListener('click', async function () {
                var ok = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('Eliminar motivo cl\u00EDnico', '\u00BFEliminar "' + rowData.reason + '" del historial?')
                    : window.confirm('\u00BFEliminar "' + rowData.reason + '"?');
                if (!ok) return;
                if (typeof window.deleteStudyReason === 'function') window.deleteStudyReason(rowData.reason);
                renderReasons(document.getElementById('dp-search-reasons') ? document.getElementById('dp-search-reasons').value : '');
            });
            td.appendChild(editBtn); td.appendChild(delBtn);
        });
    }

    // ── Edición inline genérica (para doctores y motivos) ────────────────────
    function _startInlineEdit(tr, cellIdx, currentValue, saveFn, onDone) {
        var cell = tr.cells[cellIdx];
        var actionsTd = tr.cells[3];
        var prevCell = cell.innerHTML;
        var prevActions = actionsTd.innerHTML;
        cell.innerHTML = '<input type="text" value="' + esc(currentValue) + '" style="width:100%;padding:.2rem .4rem;border:1px solid #ccc;border-radius:4px;font-size:.82rem;">';
        actionsTd.innerHTML =
            '<button type="button" style="padding:.2rem .5rem;font-size:.72rem;background:#1a56a0;color:#fff;border:none;border-radius:5px;cursor:pointer;margin-right:4px;">Guardar</button>' +
            '<button type="button" style="padding:.2rem .5rem;font-size:.72rem;background:#6b7280;color:#fff;border:none;border-radius:5px;cursor:pointer;">Cancelar</button>';
        var input = cell.querySelector('input');
        if (input) { input.focus(); input.select(); }
        var btns = actionsTd.querySelectorAll('button');
        var saveBtn = btns[0]; var cancelBtn = btns[1];
        var abort = function () { cell.innerHTML = prevCell; actionsTd.innerHTML = prevActions; };
        cancelBtn.addEventListener('click', abort);
        saveBtn.addEventListener('click', function () {
            var next = (input ? input.value : '').trim();
            if (!next) { abort(); return; }
            if (saveFn(next)) { if (typeof onDone === 'function') onDone(); } else abort();
        });
        if (input) {
            input.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter') saveBtn.click();
                if (ev.key === 'Escape') abort();
            });
        }
    }

    // ── Gestión de tabs ───────────────────────────────────────────────────────
    var TAB_STYLE_BASE = 'padding:.5rem 1.1rem;background:transparent;border:none;border-bottom:3px solid transparent;cursor:pointer;font-size:.85rem;transition:all .15s;';

    function switchTab(tab) {
        _activeTab = tab;
        document.querySelectorAll('.dp-tab').forEach(function (b) {
            var active = b.dataset.tab === tab;
            b.style.cssText = TAB_STYLE_BASE + (active
                ? 'border-bottom-color:var(--accent,#1a56a0);color:var(--accent,#1a56a0);font-weight:600;'
                : 'color:var(--text-secondary,#6b7280);font-weight:400;');
        });
        document.querySelectorAll('.dp-tab-content').forEach(function (c) {
            c.style.display = c.id === 'dp-tab-' + tab ? 'block' : 'none';
        });
        refreshTab(tab);
    }

    function refreshTab(tab) {
        var fns = {
            history: function () { renderHistory((document.getElementById('dp-search-history') || {}).value || ''); },
            patients: function () { renderPatients((document.getElementById('dp-search-patients') || {}).value || ''); },
            doctors: function () { renderDoctors((document.getElementById('dp-search-doctors') || {}).value || ''); },
            reasons: function () { renderReasons((document.getElementById('dp-search-reasons') || {}).value || ''); }
        };
        (fns[tab] || fns['history'])();
    }

    // ── Backup: exportar todo ─────────────────────────────────────────────────
    function exportAll() {
        var datos = {
            _export_date: new Date().toISOString(),
            _type: 'mis-datos',
            _version: '2.0',
            report_history: localStorage.getItem('report_history') || '[]',
            patient_registry: localStorage.getItem('patient_registry') || '[]',
            referring_doctor_registry: localStorage.getItem('referring_doctor_registry') || '[]',
            study_reason_history: localStorage.getItem('study_reason_history') || '[]'
        };
        var blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'mis-datos-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        if (typeof showToast === 'function') showToast('\u2705 Backup exportado', 'success');
    }

    // ── Backup: importar todo ─────────────────────────────────────────────────
    function importAll(file) {
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var data = JSON.parse(ev.target.result);
                if (!data || typeof data !== 'object') throw new Error('Formato inv\u00E1lido');
                var keys = ['report_history', 'patient_registry', 'referring_doctor_registry', 'study_reason_history'];
                var count = 0;
                keys.forEach(function (k) { if (k in data) { localStorage.setItem(k, data[k]); count++; } });
                if (!count) throw new Error('El archivo no contiene datos v\u00E1lidos de Mis Datos');
                if (typeof showToast === 'function') showToast('\u2705 ' + count + ' registros restaurados. Recargando...', 'success');
                setTimeout(function () { location.reload(); }, 1400);
            } catch (err) {
                if (typeof showToast === 'function') showToast('\u274C Error al importar: ' + (err.message || String(err)), 'error');
            }
        };
        reader.readAsText(file);
    }

    // ── Inicializar ───────────────────────────────────────────────────────────
    window.initDatosPanel = function () {
        var overlay = document.getElementById('datosPanelOverlay');
        if (!overlay) return;

        // Tabs
        document.querySelectorAll('.dp-tab').forEach(function (btn) {
            btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
        });

        // Cerrar modal
        var closeBtn = document.getElementById('btnCloseDatosPanel');
        if (closeBtn) closeBtn.addEventListener('click', function () { overlay.classList.remove('active'); });
        overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('active'); });

        // Búsquedas en tiempo real
        var searches = [
            ['dp-search-history', function () { renderHistory((document.getElementById('dp-search-history') || {}).value || ''); }],
            ['dp-search-patients', function () { renderPatients((document.getElementById('dp-search-patients') || {}).value || ''); }],
            ['dp-search-doctors', function () { renderDoctors((document.getElementById('dp-search-doctors') || {}).value || ''); }],
            ['dp-search-reasons', function () { renderReasons((document.getElementById('dp-search-reasons') || {}).value || ''); }]
        ];
        searches.forEach(function (s) {
            var el = document.getElementById(s[0]);
            if (el) el.addEventListener('input', s[1]);
        });

        // Formulario edición pacientes
        var cancelEditBtn = document.getElementById('dp-cancel-edit-patient');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', function () {
                var form = document.getElementById('dp-edit-patient-form');
                if (form) form.style.display = 'none';
                _editPatientData = null;
            });
        }
        var saveEditBtn = document.getElementById('dp-save-edit-patient');
        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', function () {
                if (!_editPatientData) return;
                var get = function (id) { var el = document.getElementById(id); return el ? (el.value || '').trim() : ''; };
                var updated = {
                    name: get('dp-re-name'), dni: get('dp-re-dni'),
                    age: get('dp-re-age'), sex: get('dp-re-sex'),
                    insurance: get('dp-re-insurance'), affiliateNum: get('dp-re-affiliate')
                };
                if (typeof window.updatePatientInRegistry === 'function') {
                    window.updatePatientInRegistry(_editPatientData.name, _editPatientData.dni, updated);
                }
                var form = document.getElementById('dp-edit-patient-form');
                if (form) form.style.display = 'none';
                _editPatientData = null;
                renderPatients((document.getElementById('dp-search-patients') || {}).value || '');
                if (typeof showToast === 'function') showToast('Paciente actualizado \u2713', 'success');
            });
        }

        // Backup
        var exportBtn = document.getElementById('btnExportAllData');
        if (exportBtn) exportBtn.addEventListener('click', exportAll);
        var importInput = document.getElementById('inputImportAllData');
        if (importInput) {
            importInput.addEventListener('change', function (e) {
                var f = e.target.files && e.target.files[0];
                if (f) importAll(f);
                e.target.value = '';
            });
        }

        // Limpiar historial
        var clearHistBtn = document.getElementById('dp-clear-history');
        if (clearHistBtn) {
            clearHistBtn.addEventListener('click', async function () {
                var stats = typeof window.getReportHistoryStats === 'function' ? window.getReportHistoryStats() : { total: 0 };
                if (stats.total === 0) {
                    if (typeof showToast === 'function') showToast('El historial ya est\u00E1 vac\u00EDo', 'info');
                    return;
                }
                var ok = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('\uD83D\uDDD1\uFE0F Limpiar historial', '\u00BFEliminar los ' + stats.total + ' informes? Esta acci\u00F3n no se puede deshacer.')
                    : window.confirm('\u00BFLimpiar el historial de informes?');
                if (!ok) return;
                localStorage.setItem('report_history', '[]');
                renderHistory('');
                if (typeof showToast === 'function') showToast('Historial limpiado', 'info');
            });
        }

        // Exponer refresh global para uso externo
        window._refreshDatosPanel = function () { refreshTab(_activeTab); };

        // Render tab inicial
        switchTab('history');
    };

    // ── Abrir en tab específico ───────────────────────────────────────────────
    window.openDatosPanel = function (tab) {
        var overlay = document.getElementById('datosPanelOverlay');
        if (!overlay) return;
        overlay.classList.add('active');
        switchTab(tab || _activeTab || 'history');
    };

})();
