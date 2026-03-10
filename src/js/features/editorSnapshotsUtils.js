// ============ ETAPA 8: VERSIONADO / SNAPSHOTS DEL EDITOR ============
// Guarda snapshots nombrados en localStorage (persistentes entre recargas).
// Momentos: transcripcion cruda, estructurado, edicion manual (cada 5 min).
// Navegacion: boton en toolbar o desde Settings > Herramientas.

(function _initEditorSnapshots() {
    const _SNAP_KEY = 'editor_snapshots';
    const _MAX_SNAPS = 30;
    const _AUTO_INTERVAL = 5 * 60 * 1000; // 5 min
    let _autoTimer = null;
    let _lastAutoHash = '';
    let _snapsCache = null;
    if (typeof appDB !== 'undefined') {
        appDB.get(_SNAP_KEY).then(function(v) { _snapsCache = v || []; }).catch(function() {});
    }

    function _getSnaps() {
        if (_snapsCache !== null) return _snapsCache;
        try { return JSON.parse(localStorage.getItem(_SNAP_KEY)) || []; } catch(_) { return []; }
    }
    function _saveSnaps(arr) {
        _snapsCache = arr;
        if (typeof appDB !== 'undefined') appDB.set(_SNAP_KEY, arr);
        else { try { localStorage.setItem(_SNAP_KEY, JSON.stringify(arr)); } catch(_) {} }
    }

    /**
     * Guardar snapshot del editor.
     * @param {string} label - nombre descriptivo (ej: "Transcripcion cruda", "Estructurado")
     * @param {string} [source] - quien lo genero: 'auto'|'transcription'|'structuring'|'manual'
     */
    window.saveEditorSnapshot = function(label, source = 'auto') {
        const ed = document.getElementById('editor');
        if (!ed || !ed.innerHTML.trim()) return;

        const html = ed.innerHTML;
        // Evitar snapshot identico al ultimo
        const hash = html.length + '_' + html.slice(0, 100);
        const snaps = _getSnaps();
        if (snaps.length > 0 && snaps[snaps.length - 1]._hash === hash) return;

        snaps.push({
            label: label || 'Snapshot',
            source: source,
            ts: new Date().toISOString(),
            html: html,
            wordCount: (ed.innerText || '').split(/\s+/).filter(Boolean).length,
            _hash: hash
        });

        // Limitar cantidad
        while (snaps.length > _MAX_SNAPS) snaps.shift();
        _saveSnaps(snaps);
    };

    /** Obtener lista de snapshots (sin HTML para performance) */
    window.getEditorSnapshots = function() {
        return _getSnaps().map((s, i) => ({
            index: i,
            label: s.label,
            source: s.source,
            ts: s.ts,
            wordCount: s.wordCount
        }));
    };

    /** Restaurar un snapshot por indice */
    window.restoreEditorSnapshot = function(index) {
        const snaps = _getSnaps();
        const snap = snaps[index];
        if (!snap) return false;
        const ed = document.getElementById('editor');
        if (!ed) return false;

        // Guardar estado actual antes de restaurar
        saveEditorSnapshot('Antes de restaurar v' + (index + 1), 'manual');

        ed.innerHTML = snap.html;
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof window.updateWordCount === 'function') window.updateWordCount();

        // Establecer estado correcto segun el contenido restaurado
        if (typeof updateButtonsVisibility === 'function') {
            const state = typeof detectEditorState === 'function' ? detectEditorState(snap.html) : 'TRANSCRIBED';
            updateButtonsVisibility(state);
        }

        if (typeof showToast === 'function') {
            const date = new Date(snap.ts);
            const timeStr = date.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
            showToast(`📋 Restaurado: "${snap.label}" (${timeStr})`, 'success');
        }
        return true;
    };

    /** Borrar todos los snapshots */
    window.clearEditorSnapshots = function() {
        _snapsCache = [];
        if (typeof appDB !== 'undefined') appDB.remove(_SNAP_KEY);
        else localStorage.removeItem(_SNAP_KEY);
    };

    /** Mostrar panel de versiones (modal simple) */
    window.showSnapshotPanel = function() {
        const snaps = _getSnaps();
        if (snaps.length === 0) {
            if (typeof showToast === 'function') showToast('📋 No hay versiones guardadas aun', 'info');
            return;
        }

        // Crear modal on-the-fly
        let overlay = document.getElementById('snapshotPanelOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'snapshotPanelOverlay';
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal" style="max-width:520px;">
                    <div class="modal-header">
                        <h2>📋 Historial de versiones</h2>
                        <button class="modal-close" id="closeSnapshotPanel">&times;</button>
                    </div>
                    <div class="modal-body" id="snapshotPanelBody" style="max-height:400px;overflow-y:auto;"></div>
                    <div class="modal-footer" style="justify-content:space-between;">
                        <button class="btn btn-outline" id="btnClearSnapshots" style="font-size:0.8rem;color:var(--danger,#ef4444);border-color:var(--danger,#ef4444);">🗑️ Borrar todo</button>
                        <button class="btn btn-outline" id="btnCloseSnapPanel">Cerrar</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
            document.getElementById('closeSnapshotPanel').addEventListener('click', () => overlay.classList.remove('active'));
            document.getElementById('btnCloseSnapPanel').addEventListener('click', () => overlay.classList.remove('active'));
            document.getElementById('btnClearSnapshots').addEventListener('click', async () => {
                const ok = typeof window.showCustomConfirm === 'function'
                    ? await window.showCustomConfirm('🗑️ Borrar historial', '¿Eliminar todas las versiones guardadas?')
                    : false;
                if (ok) {
                    clearEditorSnapshots();
                    overlay.classList.remove('active');
                    if (typeof showToast === 'function') showToast('🗑️ Historial de versiones borrado', 'info');
                }
            });
        }

        // Renderizar lista
        const body = document.getElementById('snapshotPanelBody');
        const sourceIcons = { transcription: '🎙️', structuring: '🤖', manual: '✏️', auto: '⏱️' };
        body.innerHTML = snaps.map((s, i) => {
            const date = new Date(s.ts);
            const timeStr = date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const icon = sourceIcons[s.source] || '📄';
            return `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.65rem 0.5rem;border-bottom:1px solid var(--border);cursor:pointer;" class="snapshot-row" data-idx="${i}">
                <span style="font-size:1.2rem;">${icon}</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.88rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.label}</div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">${timeStr} · ${s.wordCount || '?'} palabras</div>
                </div>
                <button class="btn btn-outline btn-sm" style="font-size:0.75rem;flex-shrink:0;" data-restore="${i}">Restaurar</button>
            </div>`;
        }).reverse().join('');

        // Delegacion de clicks
        body.onclick = (e) => {
            const btn = e.target.closest('[data-restore]');
            if (btn) {
                const idx = parseInt(btn.dataset.restore);
                restoreEditorSnapshot(idx);
                overlay.classList.remove('active');
            }
        };

        overlay.classList.add('active');
    };

    // Auto-snapshot cada 5 min si el editor cambio
    function _autoSnapshot() {
        const ed = document.getElementById('editor');
        if (!ed || !ed.innerHTML.trim()) return;
        const hash = ed.innerHTML.length + '_' + ed.innerHTML.slice(0, 100);
        if (hash === _lastAutoHash) return;
        _lastAutoHash = hash;
        saveEditorSnapshot('Auto-guardado', 'auto');
    }

    _autoTimer = setInterval(_autoSnapshot, _AUTO_INTERVAL);

    // Boton toolbar
    const btnSnap = document.getElementById('btnEditorSnapshots');
    if (btnSnap) btnSnap.addEventListener('click', () => showSnapshotPanel());

    // Exponer para que structurer y transcriptor guarden snapshots
    window._editorSnapshotsReady = true;
})();
