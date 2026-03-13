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

    window.initStudyReasonHistoryPanel = function () {
        const overlay = document.getElementById('studyReasonOverlay');
        const closeBtn = document.getElementById('btnCloseStudyReasonPanel');
        const tbody = document.getElementById('studyReasonTbody');
        const search = document.getElementById('studyReasonSearchPanel');
        if (!overlay || !tbody) return;

        function getRows(filter) {
            const all = typeof window.getAllStudyReasons === 'function' ? window.getAllStudyReasons() : [];
            if (!filter) return all;
            const q = typeof window._normStr === 'function' ? window._normStr(filter) : String(filter || '').toLowerCase();
            return all.filter(r => (typeof window._normStr === 'function' ? window._normStr(r.reason || '') : String(r.reason || '').toLowerCase()).includes(q));
        }

        function render(filter) {
            const rows = getRows(filter);
            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay motivos registrados.</td></tr>';
                return;
            }
            tbody.innerHTML = rows.map((r, idx) => `
                <tr>
                    <td style="padding:.45rem .5rem;">${esc(r.reason)}</td>
                    <td style="padding:.45rem .5rem;">${fmtDate(r.lastUsed)}</td>
                    <td style="padding:.45rem .5rem;">${Number(r.usageCount || 0)}</td>
                    <td style="padding:.45rem .5rem;text-align:center;">
                        <button class="btn" data-edit-idx="${idx}" style="padding:.25rem .55rem;font-size:.75rem;">✏️</button>
                        <button class="btn" data-del-idx="${idx}" style="padding:.25rem .55rem;font-size:.75rem;background:var(--error);color:white;">🗑</button>
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
                    const next = window.prompt('Editar motivo / indicación clínica', row.reason);
                    if (next == null) return;
                    const okEdit = typeof window.updateStudyReason === 'function'
                        ? window.updateStudyReason(row.reason, next)
                        : false;
                    if (okEdit) render(search?.value || '');
                    return;
                }
                if (!btn) return;
                const row = rows[parseInt(btn.dataset.delIdx, 10)];
                if (!row) return;
                const ok = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('Eliminar motivo clínico', `¿Eliminar "${row.reason}" del historial?`)
                    : window.confirm(`¿Eliminar "${row.reason}" del historial?`);
                if (!ok) return;
                if (typeof window.deleteStudyReason === 'function') window.deleteStudyReason(row.reason);
                render(search?.value || '');
            });
        }

        closeBtn?.addEventListener('click', () => overlay.classList.remove('active'));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
        search?.addEventListener('input', (e) => render(e.target.value));

        overlay.addEventListener('transitionstart', () => render(search?.value || ''));
        window._refreshStudyReasonPanel = () => render(search?.value || '');
    };
})();
