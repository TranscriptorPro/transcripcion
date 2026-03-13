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
                    <td style="padding:.45rem .5rem;text-align:center;">
                        <div class="registry-row-actions">
                            <button class="registry-mini-btn" type="button" data-edit-idx="${idx}">Editar</button>
                            <button class="registry-mini-btn registry-mini-btn-danger" type="button" data-del-idx="${idx}">Borrar</button>
                        </div>
                    </td>
                </tr>`).join('');
        }

        if (!tbody._delegated) {
            tbody._delegated = true;
            tbody.addEventListener('click', async (e) => {
                const editBtn = e.target.closest('[data-edit-idx]');
                const btn = e.target.closest('[data-del-idx]');
                const rows = getRows(search?.value || '');
                if (editBtn) {
                    const row = rows[parseInt(editBtn.dataset.editIdx, 10)];
                    if (!row) return;
                    const next = window.prompt('Editar médico solicitante', row.name);
                    if (next == null) return;
                    const okEdit = typeof window.updateReferringDoctor === 'function'
                        ? window.updateReferringDoctor(row.name, next)
                        : false;
                    if (okEdit) render(search?.value || '');
                    return;
                }
                if (!btn) return;
                const row = rows[parseInt(btn.dataset.delIdx, 10)];
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
