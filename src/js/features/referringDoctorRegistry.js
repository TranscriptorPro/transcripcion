// ============ REGISTRO DE MÉDICOS SOLICITANTES ============
// Almacena médicos solicitantes en localStorage/appDB.
// Cada entrada: { name, lastUsed, usageCount }
// Se va completando automáticamente a medida que el médico realiza estudios.

const _DR_REG_KEY = 'referring_doctor_registry';
const _DR_REG_MAX = 200;

let _drRegCache = null;
if (typeof appDB !== 'undefined') {
    appDB.get(_DR_REG_KEY).then(function(v) { _drRegCache = v || []; }).catch(function() {});
}

function _getDrRegistry() {
    if (_drRegCache !== null) return _drRegCache;
    try { return JSON.parse(localStorage.getItem(_DR_REG_KEY) || '[]'); }
    catch (_) { return []; }
}

function _setDrRegistry(arr) {
    _drRegCache = arr;
    if (typeof appDB !== 'undefined') {
        appDB.set(_DR_REG_KEY, arr);
    } else {
        try { localStorage.setItem(_DR_REG_KEY, JSON.stringify(arr)); } catch(_) {}
    }
}

function _drNorm(s) {
    return typeof _normStr === 'function' ? _normStr(s || '') : String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _cleanDoctorName(name) {
    return String(name || '').replace(/^\s*(?:dr\.?|dra\.?)\s+/i, '').trim();
}

// ---- Guardar / actualizar médico solicitante ----
window.saveReferringDoctor = function(name) {
    const n = _cleanDoctorName(name);
    if (!n) return;
    const reg = _getDrRegistry();
    const normN = _drNorm(n);
    let idx = reg.findIndex(d => _drNorm(d.name || '') === normN);
    if (idx >= 0) {
        reg[idx].usageCount = (reg[idx].usageCount || 0) + 1;
        reg[idx].lastUsed = new Date().toISOString();
    } else {
        reg.unshift({ name: n, usageCount: 1, lastUsed: new Date().toISOString() });
        if (reg.length > _DR_REG_MAX) reg.pop();
    }
    // Ordenar por frecuencia descendente
    reg.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    _setDrRegistry(reg);
};

// ---- Buscar médicos (nombre o apellido, 3+ letras) ----
window.searchReferringDoctors = function(query) {
    if (!query || query.length < 3) return [];
    const normQ = _drNorm(query);
    return _getDrRegistry()
        .filter(d => d.name && _drNorm(d.name).includes(normQ))
        .slice(0, 10);
};

window.getAllReferringDoctors = function() {
    return _getDrRegistry();
};

window.deleteReferringDoctor = function(name) {
    // Buscar por nombre exacto primero, luego por nombre sin prefijo Dr./Dra.
    const rawNorm   = _drNorm(name);
    const cleanNorm = _drNorm(_cleanDoctorName(name));
    _setDrRegistry(_getDrRegistry().filter(d => {
        const dn = _drNorm(d.name || '');
        return dn !== rawNorm && dn !== cleanNorm;
    }));
};

window.updateReferringDoctor = function(oldName, newName) {
    const next = _cleanDoctorName(newName);
    if (!oldName || !next) return false;
    const reg = _getDrRegistry();
    // Buscar por nombre exacto (con prefijo) y también por nombre limpio
    const rawNorm   = _drNorm(oldName);
    const cleanNorm = _drNorm(_cleanDoctorName(oldName));
    const oldIdx = reg.findIndex(d => {
        const dn = _drNorm(d.name || '');
        return dn === rawNorm || dn === cleanNorm;
    });
    if (oldIdx < 0) return false;

    const dupIdx = reg.findIndex((d, i) => i !== oldIdx && _drNorm(d.name || '') === _drNorm(next));
    if (dupIdx >= 0) {
        reg[dupIdx].usageCount = (reg[dupIdx].usageCount || 0) + (reg[oldIdx].usageCount || 0);
        reg[dupIdx].lastUsed = reg[oldIdx].lastUsed || reg[dupIdx].lastUsed;
        reg.splice(oldIdx, 1);
    } else {
        reg[oldIdx].name = next;
    }

    reg.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    _setDrRegistry(reg);
    return true;
};

// ---- Inicializar autocomplete en el campo reqReferringDoctor ----
window.initReferringDoctorSearch = function() {
    const input = document.getElementById('reqReferringDoctor');
    if (!input) return;

    // Guard: no re-inicializar si ya está vinculado
    if (input._doctorSearchBound) return;
    input._doctorSearchBound = true;

    // Dropdown reutilizable
    let dropdown = document.getElementById('referringDoctorDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'referringDoctorDropdown';
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

    function hideDropdown() { dropdown.style.display = 'none'; selectedIdx = -1; }

    let lastResults = [];
    let selectedIdx = -1;

    function setActive(idx) {
        const items = dropdown.querySelectorAll('[data-idx]');
        items.forEach((el, i) => {
            if (i === idx) {
                el.style.background = 'color-mix(in srgb, var(--primary) 12%, transparent)';
                el.style.color = 'var(--primary)';
                el.style.fontWeight = '600';
                el.scrollIntoView({ block: 'nearest' });
            } else {
                el.style.background = '';
                el.style.color = '';
                el.style.fontWeight = '';
            }
        });
        selectedIdx = idx;
    }

    function selectDoctor(d) {
        _justSelected = true;
        clearTimeout(debounce);
        input.value = d.name;
        hideDropdown();
    }

    function showResults(results) {
        lastResults = results;
        selectedIdx = -1;
        if (!results.length) { hideDropdown(); return; }
        const esc = typeof escapeHtml === 'function' ? escapeHtml
            : (s => (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
        dropdown.innerHTML = results.map((d, i) =>
            `<div data-idx="${i}" style="padding:0.5rem 0.85rem;cursor:pointer;font-size:0.82rem;border-bottom:1px solid var(--border);">${esc(d.name)}</div>`
        ).join('');
        dropdown.style.display = 'block';

        dropdown.querySelectorAll('[data-idx]').forEach(el => {
            const i = parseInt(el.dataset.idx);
            el.addEventListener('mouseenter', () => setActive(i));
            el.addEventListener('mouseleave', () => { el.style.background = ''; el.style.color = ''; el.style.fontWeight = ''; selectedIdx = -1; });
            el.addEventListener('mousedown', (e) => { e.preventDefault(); selectDoctor(results[i]); });
        });
    }

    let debounce;
    let _justSelected = false;
    input.addEventListener('input', () => {
        clearTimeout(debounce);
        if (_justSelected) { _justSelected = false; return; }
        const query = input.value.trim();
        if (query.length < 3) { hideDropdown(); return; }
        debounce = setTimeout(() => showResults(window.searchReferringDoctors(query) || []), 120);
    });

    // Navegación por teclado
    input.addEventListener('keydown', (e) => {
        if (dropdown.style.display === 'none') return;
        const items = dropdown.querySelectorAll('[data-idx]');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(selectedIdx < items.length - 1 ? selectedIdx + 1 : 0);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(selectedIdx > 0 ? selectedIdx - 1 : items.length - 1);
        } else if (e.key === 'Enter' && selectedIdx >= 0) {
            e.preventDefault();
            selectDoctor(lastResults[selectedIdx]);
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    });

    input.addEventListener('blur', () => { setTimeout(hideDropdown, 200); });
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) hideDropdown();
    });
};
