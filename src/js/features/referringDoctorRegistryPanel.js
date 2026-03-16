// ============ PANEL: MÉDICOS SOLICITANTES ============
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

    // Lazy-init: se llama en cada apertura del panel (no al cargar la página)
    window._refreshDoctorRegistryPanel = null;

    window.initReferringDoctorRegistryPanel = function () {
        const overlay  = document.getElementById('doctorRegistryOverlay');
        const closeBtn = document.getElementById('btnCloseDoctorRegistryPanel');
        const getTbody  = () => document.getElementById('doctorRegistryTbody');
        const getSearch = () => document.getElementById('doctorRegistrySearch');
        if (!overlay) return;

        function getDoctorRows(filter) {
            const all = typeof window.getAllReferringDoctors === 'function' ? window.getAllReferringDoctors() : [];
            if (!filter) return all;
            const q = typeof window._normStr === 'function' ? window._normStr(filter) : String(filter || '').toLowerCase();
            return all.filter(d => (typeof window._normStr === 'function' ? window._normStr(d.name || '') : String(d.name || '').toLowerCase()).includes(q));
        }

        function startDoctorInlineEdit(tr, rowData, onDone) {
            const nameTd    = tr.cells[0];
            const actionsTd = tr.cells[3];
            const prevName    = nameTd.innerHTML;
            const prevActions = actionsTd.innerHTML;
            nameTd.innerHTML    = `<input type="text" value="${esc(rowData.name)}" style="width:100%;padding:.2rem .4rem;border:1px solid #ccc;border-radius:4px;font-size:.875rem;">`;
            actionsTd.innerHTML = `<button type="button" style="padding:.2rem .5rem;font-size:.72rem;background:#1a56a0;color:#fff;border:none;border-radius:5px;cursor:pointer;margin-right:4px;">Guardar</button>` +
                                  `<button type="button" style="padding:.2rem .5rem;font-size:.72rem;background:#6b7280;color:#fff;border:none;border-radius:5px;cursor:pointer;">Cancelar</button>`;
            const input = nameTd.querySelector('input');
            input?.focus();
            input?.select();
            const [saveBtn, cancelBtn] = actionsTd.querySelectorAll('button');
            const abort = () => { nameTd.innerHTML = prevName; actionsTd.innerHTML = prevActions; };
            cancelBtn.addEventListener('click', abort);
            saveBtn.addEventListener('click', () => {
                const next = (input ? input.value : '').trim();
                if (!next) { abort(); return; }
                const ok = typeof window.updateReferringDoctor === 'function'
                    ? window.updateReferringDoctor(rowData.name, next)
                    : false;
                if (ok) { if (typeof onDone === 'function') onDone(); }
                else abort();
            });
            input?.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter')  saveBtn.click();
                if (evt.key === 'Escape') abort();
            });
        }

        function renderDoctors(filter) {
            const tbody = getTbody();
            if (!tbody) return;
            const rows = getDoctorRows(filter);
            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay médicos solicitantes registrados.</td></tr>';
                return;
            }
            tbody.innerHTML = rows.map((d, idx) => `
                <tr>
                    <td style="padding:.45rem .5rem;">${esc(d.name)}</td>
                    <td style="padding:.45rem .5rem;">${fmtDate(d.lastUsed)}</td>
                    <td style="padding:.45rem .5rem;">${Number(d.usageCount || 0)}</td>
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
                    startDoctorInlineEdit(tr, rowData, () => renderDoctors(getSearch()?.value || ''));
                });

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.textContent = '🗑';
                delBtn.style.cssText = 'padding:.25rem .5rem;font-size:.75rem;background:#ef4444;color:#fff;border:none;border-radius:5px;cursor:pointer;';
                delBtn.addEventListener('click', async () => {
                    const ok = typeof window.showCustomConfirm === 'function'
                        ? await window.showCustomConfirm('Eliminar médico solicitante', `¿Eliminar "${rowData.name}" del historial?`)
                        : window.confirm(`¿Eliminar "${rowData.name}" del historial?`);
                    if (!ok) return;
                    if (typeof window.deleteReferringDoctor === 'function') window.deleteReferringDoctor(rowData.name);
                    renderDoctors(getSearch()?.value || '');
                });

                actionsTd.appendChild(editBtn);
                actionsTd.appendChild(delBtn);
            });
        }

        closeBtn?.addEventListener('click', () => overlay.classList.remove('active'));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });

        const searchEl = getSearch();
        if (searchEl && !searchEl._drListener) {
            searchEl._drListener = true;
            searchEl.addEventListener('input', (e) => renderDoctors(e.target.value));
        }

        window._refreshDoctorRegistryPanel = () => renderDoctors(getSearch()?.value || '');
        renderDoctors(getSearch()?.value || '');
    };
})();
