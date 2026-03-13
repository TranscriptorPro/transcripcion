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

    window.initReferringDoctorRegistryPanel = function () {
        const overlay = document.getElementById('doctorRegistryOverlay');
        const closeBtn = document.getElementById('btnCloseDoctorRegistryPanel');
        const tbody = document.getElementById('doctorRegistryTbody');
        const search = document.getElementById('doctorRegistrySearch');
        if (!overlay || !tbody) return;

        function getRows(filter) {
            const all = typeof window.getAllReferringDoctors === 'function' ? window.getAllReferringDoctors() : [];
            if (!filter) return all;
            const q = typeof window._normStr === 'function' ? window._normStr(filter) : String(filter || '').toLowerCase();
            return all.filter(d => (typeof window._normStr === 'function' ? window._normStr(d.name || '') : String(d.name || '').toLowerCase()).includes(q));
        }

        function render(filter) {
            const rows = getRows(filter);
            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay médicos solicitantes registrados.</td></tr>';
                return;
            }
            tbody.innerHTML = rows.map((d, idx) => `
                <tr>
                    <td style="padding:.45rem .5rem;">${esc(d.name)}</td>
                    <td style="padding:.45rem .5rem;">${fmtDate(d.lastUsed)}</td>
                    <td style="padding:.45rem .5rem;">${Number(d.usageCount || 0)}</td>
                    <td style="padding:.45rem .5rem;text-align:center;white-space:nowrap;">
                        <button class="btn btn-secondary registry-edit-btn" style="padding:.25rem .5rem;font-size:.75rem;"
                            data-idx="${idx}">&#9998;</button>
                        <button class="btn registry-delete-btn" style="padding:.25rem .5rem;font-size:.75rem;background:var(--error);"
                            data-idx="${idx}">&#x1F5D1;</button>
                    </td>
                </tr>`).join('');
        }

        function startInlineEdit(tr, rowData) {
            const nameTd = tr.cells[0];
            const actionsTd = tr.cells[3];
            const prevName   = nameTd.innerHTML;
            const prevActions = actionsTd.innerHTML;
            nameTd.innerHTML = `<input type="text" value="${esc(rowData.name)}" style="width:100%;padding:.2rem .4rem;border:1px solid #ccc;border-radius:4px;font-size:.875rem;">`;
            actionsTd.innerHTML =
                `<button class="btn" style="padding:.2rem .5rem;font-size:.72rem;background:var(--primary,#1a56a0);color:#fff;margin-right:4px;">Guardar</button>` +
                `<button class="btn btn-secondary" style="padding:.2rem .5rem;font-size:.72rem;">Cancelar</button>`;
            const input = nameTd.querySelector('input');
            input?.focus();
            input?.select();
            const [saveBtn, cancelBtn] = actionsTd.querySelectorAll('button');
            const abort = () => { nameTd.innerHTML = prevName; actionsTd.innerHTML = prevActions; };
            cancelBtn.addEventListener('click', abort);
            saveBtn.addEventListener('click', () => {
                const next = input.value.trim();
                if (!next) return;
                const ok = typeof window.updateReferringDoctor === 'function'
                    ? window.updateReferringDoctor(rowData.name, next)
                    : false;
                if (ok) render(search?.value || '');
                else abort();
            });
            input?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveBtn.click();
                if (e.key === 'Escape') abort();
            });
        }

        if (!tbody._delegated) {
            tbody._delegated = true;
            tbody.addEventListener('click', async (e) => {
                const editBtn = e.target.closest('.registry-edit-btn');
                const btn = e.target.closest('.registry-delete-btn');
                const rows = getRows(search?.value || '');
                if (editBtn) {
                    const idx = parseInt(editBtn.dataset.idx, 10);
                    const row = rows[idx];
                    if (!row) return;
                    const tr = editBtn.closest('tr');
                    if (tr) startInlineEdit(tr, row);
                    return;
                }
                if (!btn) return;
                const row = rows[parseInt(btn.dataset.idx, 10)];
                if (!row) return;
                const ok = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('Eliminar médico solicitante', `¿Eliminar "${row.name}" del historial?`)
                    : window.confirm(`¿Eliminar "${row.name}" del historial?`);
                if (!ok) return;
                if (typeof window.deleteReferringDoctor === 'function') window.deleteReferringDoctor(row.name);
                render(search?.value || '');
            });
        }

        closeBtn?.addEventListener('click', () => overlay.classList.remove('active'));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
        search?.addEventListener('input', (e) => render(e.target.value));

        overlay.addEventListener('transitionstart', () => render(search?.value || ''));
        window._refreshDoctorRegistryPanel = () => render(search?.value || '');
    };
})();
