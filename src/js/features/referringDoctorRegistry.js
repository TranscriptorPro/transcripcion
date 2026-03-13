// ============ REGISTRO DE MÉDICOS SOLICITANTES ============
// Almacena médicos solicitantes en localStorage/appDB.
// Cada entrada: { name, sex, lastUsed, usageCount }
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

// ---- Guardar / actualizar médico solicitante ----
window.saveReferringDoctor = function(name, sex) {
    const n = String(name || '').trim();
    if (!n) return;
    const reg = _getDrRegistry();
    const normN = _drNorm(n);
    let idx = reg.findIndex(d => _drNorm(d.name || '') === normN);
    if (idx >= 0) {
        reg[idx].usageCount = (reg[idx].usageCount || 0) + 1;
        reg[idx].lastUsed = new Date().toISOString();
        if (sex) reg[idx].sex = sex;
    } else {
        reg.unshift({ name: n, sex: sex || '', usageCount: 1, lastUsed: new Date().toISOString() });
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

// ---- Inicializar autocomplete en el campo reqReferringDoctor ----
window.initReferringDoctorSearch = function() {
    const input = document.getElementById('reqReferringDoctor');
    if (!input) return;

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

    function hideDropdown() { dropdown.style.display = 'none'; }

    function showResults(results) {
        if (!results.length) { hideDropdown(); return; }
        const esc = typeof escapeHtml === 'function' ? escapeHtml
            : (s => (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
        dropdown.innerHTML = results.map((d, i) => {
            const prefix = d.sex === 'F' ? 'Dra.' : d.sex === 'M' ? 'Dr.' : 'Dr./a';
            return `<div data-idx="${i}" style="padding:0.5rem 0.85rem;cursor:pointer;font-size:0.82rem;border-bottom:1px solid var(--border);"
                onmouseenter="this.style.background='var(--bg-hover,#2a2a2a)'"
                onmouseleave="this.style.background=''"><span style="opacity:0.6;font-size:0.75rem;margin-right:6px;">${esc(prefix)}</span>${esc(d.name)}</div>`;
        }).join('');
        dropdown.style.display = 'block';

        dropdown.querySelectorAll('[data-idx]').forEach(el => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const d = results[parseInt(el.dataset.idx)];
                input.value = d.name;
                const sexEl = document.getElementById('reqReferringDoctorSex');
                if (sexEl && d.sex) sexEl.value = d.sex;
                hideDropdown();
            });
        });
    }

    let debounce;
    input.addEventListener('input', () => {
        clearTimeout(debounce);
        const query = input.value.trim();
        if (query.length < 3) { hideDropdown(); return; }
        debounce = setTimeout(() => showResults(window.searchReferringDoctors(query) || []), 120);
    });

    input.addEventListener('blur', () => { setTimeout(hideDropdown, 200); });
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) hideDropdown();
    });
};
