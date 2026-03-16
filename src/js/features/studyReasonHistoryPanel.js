// ============ PANEL: MOTIVOS / INDICACIÓN CLÍNICA ============
(function () {
    'use strict';

    function fmtDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return isNaN(d) ? '—' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function esc(v) {
        return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window._refreshStudyReasonPanel = null;

    window.initStudyReasonHistoryPanel = function () {
        const overlay   = document.getElementById('studyReasonOverlay');
        const closeBtn  = document.getElementById('btnCloseStudyReasonPanel');
        const getTbody  = () => document.getElementById('studyReasonTbody');
        const getSearch = () => document.getElementById('studyReasonSearchPanel');
        if (!overlay) return;

        function getReasonRows(filter) {
            const all = typeof window.getAllStudyReasons === 'function' ? window.getAllStudyReasons() : [];
            if (!filter) return all;
            const q = typeof window._normStr === 'function' ? window._normStr(filter) : String(filter || '').toLowerCase();
            return all.filter(r => (typeof window._normStr === 'function' ? window._normStr(r.reason || '') : String(r.reason || '').toLowerCase()).includes(q));
        }

        function startReasonInlineEdit(tr, rowData, onDone) {
            const reasonTd  = tr.cells[0];
            const actionsTd = tr.cells[3];
            const prevReason  = reasonTd.innerHTML;
            const prevActions = actionsTd.innerHTML;
            reasonTd.innerHTML  = `<input type="text" value="${esc(rowData.reason)}" style="width:100%;padding:.2rem .4rem;border:1px solid #ccc;border-radius:4px;font-size:.875rem;">`;
            actionsTd.innerHTML = `<button type="button" style="padding:.2rem .5rem;font-size:.72rem;background:#1a56a0;color:#fff;border:none;border-radius:5px;cursor:pointer;margin-right:4px;">Guardar</button>` +
                                  `<button type="button" style="padding:.2rem .5rem;font-size:.72rem;background:#6b7280;color:#fff;border:none;border-radius:5px;cursor:pointer;">Cancelar</button>`;
            const input = reasonTd.querySelector('input');
            input?.focus();
            input?.select();
            const [saveBtn, cancelBtn] = actionsTd.querySelectorAll('button');
            const abort = () => { reasonTd.innerHTML = prevReason; actionsTd.innerHTML = prevActions; };
            cancelBtn.addEventListener('click', abort);
            saveBtn.addEventListener('click', () => {
                const next = (input ? input.value : '').trim();
                if (!next) { abort(); return; }
                const ok = typeof window.updateStudyReason === 'function'
                    ? window.updateStudyReason(rowData.reason, next)
                    : false;
                if (ok) { if (typeof onDone === 'function') onDone(); }
                else abort();
            });
            input?.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter')  saveBtn.click();
                if (evt.key === 'Escape') abort();
            });
        }

        function renderReasons(filter) {
            const tbody = getTbody();
            if (!tbody) return;
            const rows = getReasonRows(filter);
            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay motivos registrados.</td></tr>';
                return;
            }
            tbody.innerHTML = rows.map((r) => `
                <tr>
                    <td style="padding:.45rem .5rem;">${esc(r.reason)}</td>
                    <td style="padding:.45rem .5rem;">${fmtDate(r.lastUsed)}</td>
                    <td style="padding:.45rem .5rem;">${Number(r.usageCount || 0)}</td>
                    <td style="padding:.45rem .5rem;text-align:center;white-space:nowrap;"></td>
                </tr>`).join('');

            // Adjuntar listeners directamente en los botones generados (sin delegación)
            const trs = tbody.querySelectorAll('tr');
            rows.forEach((rowData, idx) => {
                const tr = trs[idx];
                if (!tr) return;
                const actionsTd = tr.cells[3];

                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.textContent = '✏';
                editBtn.style.cssText = 'padding:.25rem .5rem;font-size:.75rem;background:#e5e7eb;border:none;border-radius:5px;cursor:pointer;margin-right:4px;';
                editBtn.addEventListener('click', () => {
                    startReasonInlineEdit(tr, rowData, () => renderReasons(getSearch()?.value || ''));
                });

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.textContent = '🗑';
                delBtn.style.cssText = 'padding:.25rem .5rem;font-size:.75rem;background:#ef4444;color:#fff;border:none;border-radius:5px;cursor:pointer;';
                delBtn.addEventListener('click', async () => {
                    const ok = typeof window.showCustomConfirm === 'function'
                        ? await window.showCustomConfirm('Eliminar motivo clínico', `¿Eliminar "${rowData.reason}" del historial?`)
                        : window.confirm(`¿Eliminar "${rowData.reason}" del historial?`);
                    if (!ok) return;
                    if (typeof window.deleteStudyReason === 'function') window.deleteStudyReason(rowData.reason);
                    renderReasons(getSearch()?.value || '');
                });

                actionsTd.appendChild(editBtn);
                actionsTd.appendChild(delBtn);
            });
        }

        closeBtn?.addEventListener('click', () => overlay.classList.remove('active'));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });

        const searchEl = getSearch();
        if (searchEl && !searchEl._srListener) {
            searchEl._srListener = true;
            searchEl.addEventListener('input', (e) => renderReasons(e.target.value));
        }

        window._refreshStudyReasonPanel = () => renderReasons(getSearch()?.value || '');
        renderReasons(getSearch()?.value || '');
    };
})();
