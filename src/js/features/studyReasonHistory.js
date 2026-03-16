// ============ HISTORIAL DE MOTIVOS / INDICACIONES CLÍNICAS ============
// Almacena motivos de consulta / indicaciones en localStorage/appDB.
// Cada entrada: { reason, lastUsed, usageCount }
// Se va completando automáticamente a medida que el médico realiza estudios.

const _SR_HIST_KEY = 'study_reason_history';
const _SR_HIST_MAX = 200;

let _srHistCache = null;
if (typeof appDB !== 'undefined') {
    appDB.get(_SR_HIST_KEY).then(function(v) { _srHistCache = v || []; }).catch(function() {});
}

function _getSrHistory() {
    if (_srHistCache !== null) return _srHistCache;
    try { return JSON.parse(localStorage.getItem(_SR_HIST_KEY) || '[]'); }
    catch (_) { return []; }
}

function _setSrHistory(arr) {
    _srHistCache = arr;
    if (typeof appDB !== 'undefined') {
        appDB.set(_SR_HIST_KEY, arr);
    } else {
        try { localStorage.setItem(_SR_HIST_KEY, JSON.stringify(arr)); } catch(_) {}
    }
}

function _srNorm(s) {
    return typeof _normStr === 'function' ? _normStr(s || '') : String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ---- Guardar / actualizar motivo ----
window.saveStudyReason = function(reason) {
    const r = String(reason || '').trim();
    if (!r) return;
    const hist = _getSrHistory();
    const normR = _srNorm(r);
    let idx = hist.findIndex(h => _srNorm(h.reason || '') === normR);
    if (idx >= 0) {
        hist[idx].usageCount = (hist[idx].usageCount || 0) + 1;
        hist[idx].lastUsed = new Date().toISOString();
    } else {
        hist.unshift({ reason: r, usageCount: 1, lastUsed: new Date().toISOString() });
        if (hist.length > _SR_HIST_MAX) hist.pop();
    }
    hist.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    _setSrHistory(hist);
};

// ---- Buscar motivos (3+ letras, coincidencia parcial) ----
window.searchStudyReasons = function(query) {
    if (!query || query.length < 3) return [];
    const normQ = _srNorm(query);
    return _getSrHistory()
        .filter(h => h.reason && _srNorm(h.reason).includes(normQ))
        .slice(0, 10);
};

window.getAllStudyReasons = function() {
    return _getSrHistory();
};

window.deleteStudyReason = function(reason) {
    const target = String(reason || '').trim();
    if (!target) return;
    _setSrHistory(_getSrHistory().filter(h => _srNorm(h.reason || '') !== _srNorm(target)));
};

window.updateStudyReason = function(oldReason, newReason) {
    const prev = String(oldReason || '').trim();
    const next = String(newReason || '').trim();
    if (!prev || !next) return false;
    const hist = _getSrHistory();
    const oldIdx = hist.findIndex(h => _srNorm(h.reason || '') === _srNorm(prev));
    if (oldIdx < 0) return false;

    const dupIdx = hist.findIndex((h, i) => i !== oldIdx && _srNorm(h.reason || '') === _srNorm(next));
    if (dupIdx >= 0) {
        hist[dupIdx].usageCount = (hist[dupIdx].usageCount || 0) + (hist[oldIdx].usageCount || 0);
        hist[dupIdx].lastUsed = hist[oldIdx].lastUsed || hist[dupIdx].lastUsed;
        hist.splice(oldIdx, 1);
    } else {
        hist[oldIdx].reason = next;
    }

    hist.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    _setSrHistory(hist);
    return true;
};

// ---- Inicializar autocomplete en reqStudyReason ----
window.initStudyReasonSearch = function() {
    const input = document.getElementById('reqStudyReason');
    if (!input) return;

    let dropdown = document.getElementById('studyReasonDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'studyReasonDropdown';
        Object.assign(dropdown.style, {
            position: 'absolute', zIndex: '9999',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            maxHeight: '220px', overflowY: 'auto',
            width: '100%', display: 'none', marginTop: '2px'
        });
        const wrap = input.parentElement;
        if (wrap) { wrap.style.position = 'relative'; wrap.appendChild(dropdown); }
    }

    function hideDropdown() { dropdown.style.display = 'none'; }

    function showResults(results) {
        if (!results.length) { hideDropdown(); return; }
        const esc = typeof escapeHtml === 'function' ? escapeHtml
            : (s => (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
        dropdown.innerHTML = results.map((h, i) =>
            `<div data-idx="${i}" style="padding:0.5rem 0.85rem;cursor:pointer;font-size:0.82rem;border-bottom:1px solid var(--border);"
                onmouseenter="this.style.background='var(--bg-hover,#2a2a2a)'"
                onmouseleave="this.style.background=''">${esc(h.reason)}</div>`
        ).join('');
        dropdown.style.display = 'block';

        dropdown.querySelectorAll('[data-idx]').forEach(el => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                input.value = results[parseInt(el.dataset.idx)].reason;
                hideDropdown();
            });
        });
    }

    let debounce;
    input.addEventListener('input', () => {
        clearTimeout(debounce);
        const query = input.value.trim();
        if (query.length < 3) { hideDropdown(); return; }
        debounce = setTimeout(() => showResults(window.searchStudyReasons(query) || []), 120);
    });

    input.addEventListener('blur', () => { setTimeout(hideDropdown, 200); });
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) hideDropdown();
    });
};
